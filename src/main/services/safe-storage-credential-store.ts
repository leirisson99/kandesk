import { chmod, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { safeStorage } from 'electron';
import { z } from 'zod';
import type { CredentialStore, StoredConnection } from '@application/ports';

const storedSchema = z.object({
  username: z.string().min(1),
  token: z.string().min(1),
  displayName: z.string(),
});

/**
 * Guarda a credencial cifrada com `safeStorage` (DPAPI no Windows, Keychain no macOS,
 * libsecret/kwallet no Linux), em arquivo próprio. Sem armazenamento seguro, recusa salvar:
 * não há fallback em texto puro.
 *
 * Usa a API assíncrona: no Linux a chave do cofre só fica pronta depois de inicializada, e a
 * versão síncrona (obsoleta) pode falhar ao ler logo na abertura do app.
 */
export class SafeStorageCredentialStore implements CredentialStore {
  constructor(private readonly filePath: string) {}

  async isAvailable(): Promise<boolean> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
    // No Linux sem keyring o Electron cai em 'basic_text' (chave fixa): isso não é seguro.
    return process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text';
  }

  async load(): Promise<StoredConnection | null> {
    let encrypted: Buffer;
    try {
      encrypted = await readFile(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    // Chaveiro bloqueado/trocado ou arquivo corrompido: o usuário precisa informar o token de novo.
    // Os logs trazem só o motivo da falha de decifragem e o tipo do erro, nunca o conteúdo
    // (mensagens de JSON.parse podem citar trechos do texto).
    let plain: string;
    try {
      const decrypted = await safeStorage.decryptStringAsync(encrypted);
      plain = decrypted.result;
    } catch (error) {
      console.error(
        'Credencial do Kanban ilegível (falha ao decifrar):',
        error instanceof Error ? error.message : 'erro desconhecido',
      );
      return null;
    }
    try {
      return storedSchema.parse(JSON.parse(plain));
    } catch (error) {
      console.error(
        'Credencial do Kanban ilegível (conteúdo inválido):',
        error instanceof Error ? error.name : 'erro desconhecido',
      );
      return null;
    }
  }

  async save(connection: StoredConnection): Promise<void> {
    if (!(await this.isAvailable())) {
      throw new Error('Armazenamento seguro indisponível.');
    }
    const encrypted = await safeStorage.encryptStringAsync(JSON.stringify(connection));
    const temporary = `${this.filePath}.tmp`;
    await writeFile(temporary, encrypted, { mode: 0o600 });
    await chmod(temporary, 0o600);
    await rename(temporary, this.filePath);
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true });
  }
}
