/** Erros de domínio/aplicação, separados de falhas de infraestrutura. */
export class AppError extends Error {
  constructor(
    readonly code: 'VALIDATION' | 'NOT_FOUND' | 'DOMAIN' | 'AUTH' | 'COMMUNICATION',
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION', message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} não encontrada(o): ${id}`);
  }
}

export class DomainError extends AppError {
  constructor(message: string) {
    super('DOMAIN', message);
  }
}

/** O Kanban recusou a credencial (token inválido, expirado ou sem permissão). */
export class AuthError extends AppError {
  constructor(message: string) {
    super('AUTH', message);
  }
}

/** Falha de rede, tempo esgotado ou resposta inesperada do Kanban. */
export class CommunicationError extends AppError {
  constructor(message: string) {
    super('COMMUNICATION', message);
  }
}
