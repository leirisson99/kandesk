import { describe, expect, it } from 'vitest';
import { automationInputSchema } from './automation';

const valid = {
  name: 'Pausa de almoço',
  taskId: 'KB-1042',
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1, 2, 3],
  timezone: 'America/Sao_Paulo',
  enabled: true,
};

describe('automationInputSchema', () => {
  it('aceita dados válidos', () => {
    expect(automationInputSchema.safeParse(valid).success).toBe(true);
  });

  it('exige ao menos um dia e rejeita dias inválidos ou duplicados', () => {
    expect(automationInputSchema.safeParse({ ...valid, weekdays: [] }).success).toBe(false);
    expect(automationInputSchema.safeParse({ ...valid, weekdays: [7] }).success).toBe(false);
    expect(automationInputSchema.safeParse({ ...valid, weekdays: [1, 1] }).success).toBe(false);
  });

  it('rejeita horário inválido e horários iguais', () => {
    expect(automationInputSchema.safeParse({ ...valid, pauseAt: '25:00' }).success).toBe(false);
    expect(automationInputSchema.safeParse({ ...valid, resumeAt: '12:00' }).success).toBe(false);
  });
});
