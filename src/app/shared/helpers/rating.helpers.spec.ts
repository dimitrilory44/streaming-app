import { describe, expect, it } from 'vitest';

import { weightedRating } from './rating.helpers';

describe('weightedRating', () => {
  const MEAN = 6.5;
  const MIN_VOTES = 300;

  it('un titre sans vote obtient exactement la moyenne générale', () => {
    expect(weightedRating(9, 0, MIN_VOTES, MEAN)).toBe(MEAN);
  });

  it('un nombre de votes absent est traité comme zéro vote', () => {
    expect(weightedRating(9, undefined, MIN_VOTES, MEAN)).toBe(MEAN);
  });

  it('avec très peu de votes, la note est presque ramenée à la moyenne', () => {
    const score = weightedRating(10, 3, MIN_VOTES, MEAN);

    expect(score).toBeGreaterThan(MEAN);
    expect(score).toBeLessThan(6.6);
  });

  it('avec énormément de votes, la note du titre l\'emporte', () => {
    const score = weightedRating(8, 1_000_000, MIN_VOTES, MEAN);

    expect(score).toBeCloseTo(8, 2);
  });

  it('un 8 sur 5 000 votes passe devant un 9,5 sur 3 votes', () => {
    expect(weightedRating(8, 5000, MIN_VOTES, MEAN)).toBeGreaterThan(weightedRating(9.5, 3, MIN_VOTES, MEAN));
  });

  it('à note égale, plus de votes donne un meilleur score pour une bonne note', () => {
    expect(weightedRating(8, 2000, MIN_VOTES, MEAN)).toBeGreaterThan(weightedRating(8, 200, MIN_VOTES, MEAN));
  });

  it('à note égale, plus de votes donne un moins bon score pour une mauvaise note', () => {
    expect(weightedRating(4, 2000, MIN_VOTES, MEAN)).toBeLessThan(weightedRating(4, 200, MIN_VOTES, MEAN));
  });

  it('un seuil plus bas fait peser davantage les votes (séries)', () => {
    expect(weightedRating(8, 100, 100, MEAN)).toBeGreaterThan(weightedRating(8, 100, 300, MEAN));
  });

  it('renvoie la moyenne quand le seuil et le nombre de votes valent zéro (pas de division par zéro)', () => {
    expect(weightedRating(8, 0, 0, MEAN)).toBe(MEAN);
  });
});