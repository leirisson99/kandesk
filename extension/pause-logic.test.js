import { describe, expect, it } from 'vitest';
import {
  describeAttempt,
  parseCommand,
  parseRef,
  responseSnippet,
  summarizePause,
  validPort,
} from './pause-logic.js';

describe('parseRef', () => {
  it('aceita sprint/card numéricos', () => {
    expect(parseRef('10526/254251')).toEqual({ projectId: '10526', taskId: '254251' });
  });
  it.each(['', '10526', 'a/b', '1/2/3', '../1/2', '1/2 ', null, undefined, 5])(
    'recusa %j',
    (ref) => {
      expect(parseRef(ref)).toBeNull();
    },
  );
});

describe('parseCommand', () => {
  const ok = { id: 'abc', action: 'PAUSE', ref: '10/20' };
  it('aceita um comando de pausa válido', () => {
    expect(parseCommand(ok)).toEqual(ok);
  });
  it('ignora campos extras', () => {
    expect(parseCommand({ ...ok, extra: 'x' })).toEqual(ok);
  });
  it.each([
    null,
    'texto',
    { ...ok, action: 'RESUME' },
    { ...ok, action: 'DELETE' },
    { ...ok, id: '' },
    { ...ok, id: 'x'.repeat(65) },
    { ...ok, ref: 'https://evil.test' },
    { ...ok, ref: '10/20/30' },
    { action: 'PAUSE', ref: '10/20' },
  ])('recusa %j', (value) => {
    expect(parseCommand(value)).toBeNull();
  });
});

describe('validPort', () => {
  it('aceita só portas de 1024 a 65535', () => {
    expect(validPort('47615')).toBe(47615);
    expect(validPort(1024)).toBe(1024);
    for (const bad of [80, 1023, 65536, 'abc', '', 1.5, null]) expect(validPort(bad)).toBeNull();
  });
});

describe('summarizePause', () => {
  it('nada rodando -> ALREADY_IN_STATE', () => {
    const r = summarizePause({ running: 0, pausedTitles: [], failures: [], stillRunning: 0 });
    expect(r.outcome).toBe('ALREADY_IN_STATE');
  });
  it('pausou e confirmou -> APPLIED com os títulos', () => {
    const r = summarizePause({
      running: 1,
      pausedTitles: ['R06 - Docs'],
      failures: [],
      stillRunning: 0,
    });
    expect(r).toEqual({ outcome: 'APPLIED', message: 'Pausado: R06 - Docs' });
  });
  it('falha parcial -> FAILED, dizendo o que foi pausado e o que falhou', () => {
    const r = summarizePause({
      running: 2,
      pausedTitles: ['A'],
      failures: ['B: sem link'],
      stillRunning: 0,
    });
    expect(r.outcome).toBe('FAILED');
    expect(r.message).toContain('Pausado: A');
    expect(r.message).toContain('Falhou: B: sem link');
  });
  it('aceitou mas o cronômetro segue rodando -> FAILED', () => {
    const r = summarizePause({ running: 1, pausedTitles: ['A'], failures: [], stillRunning: 1 });
    expect(r.outcome).toBe('FAILED');
    expect(r.message).toMatch(/seguem rodando/);
  });
  it('limita a mensagem a 500 caracteres', () => {
    const r = summarizePause({
      running: 1,
      pausedTitles: ['x'.repeat(900)],
      failures: [],
      stillRunning: 0,
    });
    expect(r.message.length).toBeLessThanOrEqual(500);
  });
});

describe('diagnóstico da tentativa de pausa', () => {
  it('summarizePause inclui o resumo do envio quando o cronômetro segue rodando', () => {
    const r = summarizePause({
      running: 1,
      pausedTitles: ['A'],
      failures: [],
      stillRunning: 1,
      hint: 'POST /pausa HTTP 200; campos: csrf(hidden)',
    });
    expect(r.outcome).toBe('FAILED');
    expect(r.message).toContain('seguem rodando');
    expect(r.message).toContain('Detalhes: POST /pausa HTTP 200');
  });

  it('describeAttempt mostra caminho sem query, status, campos e resposta, sem valores', () => {
    const text = describeAttempt({
      action: '/pausa?token=SEGREDO&id=1',
      httpStatus: 200,
      fields: ['csrf_token(hidden)', 'subtask(select)'],
      body: '<div class="alert alert-error">Selecione o requisito.</div>',
    });
    expect(text).toBe(
      'POST /pausa HTTP 200; campos: csrf_token(hidden), subtask(select); resposta: Selecione o requisito.',
    );
    expect(text).not.toContain('SEGREDO');
  });

  it('responseSnippet: JSON curto vai inteiro; HTML sem alerta vira vazio', () => {
    expect(responseSnippet('{"ok":false,"error":"x"}')).toBe('{"ok":false,"error":"x"}');
    expect(responseSnippet('<html><body><p>nada</p></body></html>')).toBe('');
    expect(responseSnippet('')).toBe('');
  });
});
