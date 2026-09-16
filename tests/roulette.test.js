import test from 'node:test';
import assert from 'node:assert/strict';
import { sites } from '../js/data.js';
import {
  buildRouletteItems,
  calculateLandingTarget,
  stagedSpinEase,
  WINNER_INDEX
} from '../js/roulette.js';

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

test('landing target keeps the marker safely inside the winning card', () => {
  const geometry = { cardLeft: 7000, cardWidth: 172, viewportWidth: 1060 };
  for (const rng of [() => 0, () => 0.5, () => 0.999]) {
    const target = calculateLandingTarget(geometry, rng);
    const markerOnTrack = geometry.viewportWidth / 2 - target;
    assert.ok(markerOnTrack > geometry.cardLeft + geometry.cardWidth * 0.25);
    assert.ok(markerOnTrack < geometry.cardLeft + geometry.cardWidth * 0.75);
  }
});

test('staged spin easing is monotonic and settles more slowly near the target', () => {
  const samples = Array.from({ length: 101 }, (_, index) => stagedSpinEase(index / 100));
  assert.equal(samples[0], 0);
  assert.equal(samples.at(-1), 1);
  samples.slice(1).forEach((value, index) => assert.ok(value >= samples[index]));
  assert.ok(samples[50] - samples[40] > samples[100] - samples[90]);
});
