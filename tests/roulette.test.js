import test from 'node:test';
import assert from 'node:assert/strict';
import { sites } from '../js/data.js';
import {
  buildRouletteItems,
  calculateLandingTarget,
  getSpinDuration,
  smoothDeceleration,
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

test('spin easing is one continuous monotonic deceleration curve', () => {
  const samples = Array.from({ length: 1001 }, (_, index) => smoothDeceleration(index / 1000));
  assert.equal(samples[0], 0);
  assert.equal(samples.at(-1), 1);
  samples.slice(1).forEach((value, index) => assert.ok(value >= samples[index]));

  const velocities = samples.slice(1).map((value, index) => value - samples[index]);
  velocities.slice(1).forEach((velocity, index) => {
    assert.ok(velocity <= velocities[index] + 1e-12, `velocity increased at sample ${index + 1}`);
  });
  assert.ok(velocities[0] > velocities.at(-1) * 1000);
});

test('spin duration stays in target range and reduced motion is substantially shorter', () => {
  assert.equal(getSpinDuration(1440), 5400);
  assert.equal(getSpinDuration(390), 5100);
  assert.equal(getSpinDuration(1440, true), 520);
  assert.ok(getSpinDuration(1440, true) < getSpinDuration(1440) / 5);
});

test('roulette strip keeps random neighbours around the predetermined winner', () => {
  const winner = sites.find(({ rarity }) => rarity === 'mythic');
  let sample = 0;
  const strip = buildRouletteItems(sites, winner, () => ((sample++ * 17) % sites.length) / sites.length);
  assert.equal(strip[WINNER_INDEX].id, winner.id);
  assert.notEqual(strip[WINNER_INDEX - 1].rarity, winner.rarity);
  assert.notEqual(strip[WINNER_INDEX + 1].rarity, winner.rarity);
});
