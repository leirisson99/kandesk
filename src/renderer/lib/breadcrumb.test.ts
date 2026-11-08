import { describe, expect, it } from 'vitest';
import { pageLabel } from './breadcrumb';

const routes = [
  { path: '/', label: 'Painel' },
  { path: '/automations', label: 'Automações' },
];

describe('pageLabel', () => {
  it('resolve pelo caminho', () => {
    expect(pageLabel('/', routes)).toBe('Painel');
    expect(pageLabel('/automations', routes)).toBe('Automações');
  });
  it('rota desconhecida vira vazio', () => expect(pageLabel('/x', routes)).toBe(''));
});
