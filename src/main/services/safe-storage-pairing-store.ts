import { randomBytes } from 'node:crypto';
import { chmod, readFile, rename, writeFile } from 'node:fs/promises';
import { safeStorage } from 'electron';
import type { PairingCodeStore } from '@application/ports';

/**
 * Código de pareamento entre o app e a extensão, cifrado com `safeStorage` em arquivo próprio.
 * Fica em memória depois da primeira leitura (o servidor o confere a cada requisição).
 */
export class SafeStoragePairingCodeStore implements PairingCodeStore {
  private cached: string | null = null;

  constructor(private readonly filePath: string) {}

  async getOrCreate(): Promise<string> {
    if (this.cached) return this.cached;
    const stored = await this.read();
    this.cached = stored ?? (await this.write(generateCode()));
    return this.cached;
  }

  async regenerate(): Promise<string> {
    this.cached = await this.write(generateCode());
    return this.cached;
  }

  private async available(): Promise<boolean> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
    return process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text';
  }

  private async read(): Promise<string | null> {
    let encrypted: Buffer;
    try {
      encrypted = await readFile(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    try {
      const { result } = await safeStorage.decryptStringAsync(encrypted);
      return result.length >= 16 ? result : null;
    } catch {
      // Cofre trocado ou arquivo corrompido: gera um código novo (a extensão precisará ser pareada).
      console.error('Código de pareamento ilegível; será gerado um novo.');
      return null;
    }
  }

  private async write(code: string): Promise<string> {
    if (!(await this.available())) {
      throw new Error('Armazenamento seguro indisponível; a ponte com a extensão fica desativada.');
    }
    const encrypted = await safeStorage.encryptStringAsync(code);
    const temporary = `${this.filePath}.tmp`;
    await writeFile(temporary, encrypted, { mode: 0o600 });
    await chmod(temporary, 0o600);
    await rename(temporary, this.filePath);
    return code;
  }
}

function generateCode(): string {
  return randomBytes(24).toString('base64url');
}
