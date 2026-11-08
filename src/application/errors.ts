/** Erros de domínio/aplicação, separados de falhas de infraestrutura. */
export class AppError extends Error {
  constructor(
    readonly code: 'VALIDATION' | 'NOT_FOUND' | 'DOMAIN',
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
