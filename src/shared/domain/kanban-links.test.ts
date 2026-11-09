import { describe, expect, it } from 'vitest';
import { cardUrl } from './kanban-links';

describe('cardUrl', () => {
  it('monta o endereço do card no Kanboard', () => {
    expect(cardUrl('10526/254132')).toBe(
      'https://kanboard.sci.com.br/sprint/10526/solicitacao/254132',
    );
  });

  it.each(['', '10526', 'a/b', '1/2/3', '1/2?x=1', 'https://evil.test/1/2', '../1/2', '1/2 '])(
    'recusa %j',
    (ref) => {
      expect(cardUrl(ref)).toBeNull();
    },
  );
});
