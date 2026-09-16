import test from 'node:test';
import assert from 'node:assert/strict';
import { sites } from '../js/data.js';
import { buildRouletteItems, WINNER_INDEX } from '../js/roulette.js';

test('roulette strip always places the predetermined winner at its landing slot', () => {
  const winner = sites[24];
  const strip = buildRouletteItems(sites, winner, () => 0.25);
  assert.equal(strip.length, 44);
  assert.equal(strip[WINNER_INDEX].id, winner.id);
});

test('roulette filler cannot change the predetermined outcome', () => {
  const winner = sites[49];
  for (const rng of [() => 0, () => 0.5, () => 0.999]) {
    assert.equal(buildRouletteItems(sites, winner, rng)[WINNER_INDEX].id, winner.id);
  }
});
