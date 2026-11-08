import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('remove o prefixo do IPC e o nome do erro', () => {
    const e = new Error(
      "Error invoking remote method 'automations:create': DomainError: A tarefa X não existe.",
    );
    expect(errorMessage(e)).toBe('A tarefa X não existe.');
  });
  it('mantém mensagens comuns e valores não-Error', () => {
    expect(errorMessage(new Error('falhou'))).toBe('falhou');
    expect(errorMessage('texto')).toBe('texto');
  });
});
