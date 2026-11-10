import { describe, expect, it } from 'vitest';
import { chooseOption, parseConfirmForm } from './logic.js';

const modal = (body) =>
  `<div class="modal"><form method="post" action="/pausa?id=7&amp;x=1">${body}</form></div>`;
const TARGET = { id: '397128', title: 'R06 - Inserir Docs da Reforma' };

describe('parseConfirmForm', () => {
  it('formulário simples: hidden + observação (comportamento anterior)', () => {
    const form = parseConfirmForm(
      modal(
        `<input type="hidden" name="csrf_token" value="abc"><input type="text" name="comentario" value=""><input type="submit" value="Ok">`,
      ),
      'pausa',
      TARGET,
    );
    expect(form.action).toBe('/pausa?id=7&x=1');
    expect(Object.fromEntries(form.params)).toEqual({ csrf_token: 'abc', comentario: 'pausa' });
    expect(form.unfilled).toEqual([]);
  });

  it('textarea de observação', () => {
    const form = parseConfirmForm(
      modal(`<input type="hidden" name="t" value="1"><textarea name="observacao"></textarea>`),
      'pausa',
      TARGET,
    );
    expect(form.params.get('observacao')).toBe('pausa');
    expect(form.fields).toContain('observacao(textarea)');
  });

  it('select: escolhe o requisito pelo id', () => {
    const form = parseConfirmForm(
      modal(
        `<select name="subtask_id"><option value="">Selecione</option><option value="397127">R05 - Manuais</option><option value="397128">R06 - Inserir Docs da Reforma</option></select><textarea name="c"></textarea>`,
      ),
      'pausa',
      TARGET,
    );
    expect(form.params.get('subtask_id')).toBe('397128');
    expect(form.unfilled).toEqual([]);
  });

  it('select: sem id coincidente, escolhe pelo título (ignorando acento e caixa)', () => {
    const form = parseConfirmForm(
      modal(
        `<select name="req"><option value="a">R05 - Manuais</option><option value="b">r06 - inserir docs da reforma</option></select>`,
      ),
      'pausa',
      TARGET,
    );
    expect(form.params.get('req')).toBe('b');
  });

  it('select: respeita a opção já marcada', () => {
    const form = parseConfirmForm(
      modal(
        `<select name="tipo"><option value="1">A</option><option value="2" selected>B</option></select>`,
      ),
      'pausa',
      TARGET,
    );
    expect(form.params.get('tipo')).toBe('2');
  });

  it('select com uma única opção real usa essa opção', () => {
    const form = parseConfirmForm(
      modal(
        `<select name="motivo"><option value="">--</option><option value="9">Almoço</option></select>`,
      ),
      'pausa',
      TARGET,
    );
    expect(form.params.get('motivo')).toBe('9');
  });

  it('select ambíguo NÃO é adivinhado: vai para unfilled com as opções', () => {
    const form = parseConfirmForm(
      modal(
        `<select name="motivo"><option value="">--</option><option value="1">Almoço</option><option value="2">Reunião</option></select>`,
      ),
      'pausa',
      TARGET,
    );
    expect(form.params.has('motivo')).toBe(false);
    expect(form.unfilled).toEqual([{ name: 'motivo', options: ['--', 'Almoço', 'Reunião'] }]);
  });

  it('grupo de rádio sem seleção: usa o valor igual ao id do requisito; marcado é respeitado', () => {
    const byId = parseConfirmForm(
      modal(
        `<input type="radio" name="sub" value="397127"><input type="radio" name="sub" value="397128">`,
      ),
      'pausa',
      TARGET,
    );
    expect(byId.params.get('sub')).toBe('397128');

    const marked = parseConfirmForm(
      modal(
        `<input type="radio" name="x" value="a"><input type="radio" name="x" value="b" checked>`,
      ),
      'pausa',
      TARGET,
    );
    expect(marked.params.get('x')).toBe('b');
  });

  it('checkbox não marcado fica de fora; sem formulário devolve null', () => {
    const form = parseConfirmForm(
      modal(`<input type="checkbox" name="avisar" value="1">`),
      'pausa',
      TARGET,
    );
    expect(form.params.has('avisar')).toBe(false);
    expect(parseConfirmForm('<p>sem form</p>', 'pausa', TARGET)).toBeNull();
  });
});

describe('chooseOption', () => {
  it('rótulo curto não casa por acaso com o título', () => {
    const options = [
      { value: '1', label: 'A', selected: false },
      { value: '2', label: 'Docs', selected: false },
    ];
    expect(chooseOption(options, TARGET)).toBeNull();
  });

  it('lista vazia ou sem decisão devolve null', () => {
    expect(chooseOption([], TARGET)).toBeNull();
    expect(
      chooseOption(
        [
          { value: '1', label: 'A', selected: false },
          { value: '2', label: 'B', selected: false },
        ],
        TARGET,
      ),
    ).toBeNull();
  });
});
