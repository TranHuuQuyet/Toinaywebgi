import test from 'node:test';
import assert from 'node:assert/strict';
import { access, stat } from 'node:fs/promises';
import { sites, RARITY_CONFIG } from '../js/data.js';
import { getAvailableRarities, pickWinner, selectWeightedRarity } from '../js/random.js';

test('dataset contains exactly 50 unique items in the required rarity distribution', () => {
  assert.equal(sites.length, 50);
  assert.equal(new Set(sites.map(({ id }) => id)).size, 50);
  const counts = Object.fromEntries(Object.keys(RARITY_CONFIG).map((rarity) => [
    rarity,
    sites.filter((site) => site.rarity === rarity).length
  ]));
  assert.deepEqual(counts, {
    common: 15,
    uncommon: 11,
    rare: 9,
    epic: 7,
    legendary: 5,
    mythic: 3
  });
});

test('dataset only stores safe collection metadata', () => {
  const allowed = ['id', 'logo', 'name', 'rarity'];
  for (const site of sites) {
    assert.deepEqual(Object.keys(site).sort(), allowed);
    assert.match(site.logo, /^\.\/assets\/logos\//);
  }
});

test('Vietnam-focused priority brands are represented in the dataset', () => {
  const names = new Set(sites.map(({ name }) => name));
  for (const brand of [
    'Pornhub', 'XVideos', 'xHamster', 'HentaiEra', 'HentaiRead',
    'JAVTiful', 'XHSpot', 'TubePornstars', 'JAVHDPorn', 'XNXX',
    'HugeSex', 'Xasiat', 'JAVHD', 'BoyfriendTV'
  ]) assert.equal(names.has(brand), true, `${brand} is missing`);
});

test('every brand has a unique local logo asset and no generic placeholder', async () => {
  assert.equal(new Set(sites.map(({ logo }) => logo)).size, 50);
  for (const site of sites) {
    assert.doesNotMatch(site.logo, /placeholder/i);
    const file = site.logo.replace(/^\.\//, '');
    await access(file);
    assert.ok((await stat(file)).size < 100 * 1024, `${file} exceeds 100 KB`);
  }
});

test('weighted selection excludes rarities whose items are exhausted', () => {
  const unlocked = sites.filter(({ rarity }) => rarity === 'mythic').map(({ id }) => id);
  const available = getAvailableRarities(sites, unlocked);
  assert.equal(available.some(({ rarity }) => rarity === 'mythic'), false);
  assert.notEqual(selectWeightedRarity(sites, unlocked, () => 0.999), 'mythic');
});

test('winner selection cannot return a duplicate', () => {
  const unlocked = sites.slice(0, 49).map(({ id }) => id);
  const winner = pickWinner(sites, unlocked, () => 0.5);
  assert.equal(winner.id, sites[49].id);
});

test('winner selection returns null after collection completion', () => {
  assert.equal(pickWinner(sites, sites.map(({ id }) => id), () => 0), null);
});

test('fifty sequential openings complete the collection without a duplicate', () => {
  const unlocked = [];
  while (unlocked.length < sites.length) {
    const winner = pickWinner(sites, unlocked, () => 0.42);
    assert.ok(winner);
    assert.equal(unlocked.includes(winner.id), false);
    unlocked.push(winner.id);
  }
  assert.equal(new Set(unlocked).size, 50);
});
