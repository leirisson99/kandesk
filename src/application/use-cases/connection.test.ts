import { describe, expect, it } from 'vitest';
import { AuthError, DomainError, ValidationError } from '../errors';
import type { CredentialStore, KanbanAuthClient, StoredConnection } from '../ports';
import { createConnectionUseCases } from './connection';

function setup({ available = true, rejectAuth = false } = {}) {
  let stored: StoredConnection | null = null;
  const credentials: CredentialStore = {
    isAvailable: async () => available,
    load: async () => stored,
    save: async (c) => {
      stored = c;
    },
    clear: async () => {
      stored = null;
    },
  };
  const kanbanAuth: KanbanAuthClient = {
    verify: async () => {
      if (rejectAuth) throw new AuthError('recusado');
      return { id: '1', username: 'maria', name: 'Maria' };
    },
  };
  return {
    useCases: createConnectionUseCases({ credentials, kanbanAuth }),
    get stored() {
      return stored;
    },
  };
}

describe('conexão com o Kanban', () => {
  it('começa sem configuração', async () => {
    const { useCases } = setup();
    expect(await useCases.getStatus()).toMatchObject({ configured: false, username: null });
  });

  it('valida, guarda e devolve o estado sem o token', async () => {
    const ctx = setup();
    const status = await ctx.useCases.connect({ username: ' maria ', token: ' abc ' });
    expect(status).toMatchObject({ configured: true, username: 'maria', displayName: 'Maria' });
    expect(JSON.stringify(status)).not.toContain('abc');
    expect(ctx.stored).toMatchObject({ username: 'maria', token: 'abc' });
  });

  it('não guarda credencial recusada pelo Kanban', async () => {
    const ctx = setup({ rejectAuth: true });
    await expect(ctx.useCases.connect({ username: 'maria', token: 'x' })).rejects.toBeInstanceOf(
      AuthError,
    );
    expect(ctx.stored).toBeNull();
  });

  it('recusa salvar sem armazenamento seguro', async () => {
    const ctx = setup({ available: false });
    await expect(ctx.useCases.connect({ username: 'maria', token: 'x' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(ctx.stored).toBeNull();
  });

  it('valida a entrada', async () => {
    const { useCases } = setup();
    await expect(useCases.connect({ username: '', token: '' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('testar sem conexão configurada falha de forma explícita', async () => {
    await expect(setup().useCases.test()).rejects.toBeInstanceOf(DomainError);
  });

  it('desconectar remove a credencial', async () => {
    const ctx = setup();
    await ctx.useCases.connect({ username: 'maria', token: 'abc' });
    expect(await ctx.useCases.disconnect()).toMatchObject({ configured: false });
    expect(ctx.stored).toBeNull();
  });
});
