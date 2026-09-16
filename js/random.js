import { RARITY_CONFIG } from './data.js';

export function getAvailableRarities(items, unlockedIds) {
  const unlocked = new Set(unlockedIds);
  return Object.entries(RARITY_CONFIG)
    .map(([rarity, config]) => ({
      rarity,
      weight: config.weight,
      items: items.filter((item) => item.rarity === rarity && !unlocked.has(item.id))
    }))
    .filter(({ items: availableItems }) => availableItems.length > 0);
}

export function selectWeightedRarity(items, unlockedIds, rng = Math.random) {
  const available = getAvailableRarities(items, unlockedIds);
  if (!available.length) return null;

  const totalWeight = available.reduce((sum, { weight }) => sum + weight, 0);
  let cursor = rng() * totalWeight;
  for (const { rarity, weight } of available) {
    cursor -= weight;
    if (cursor < 0) return rarity;
  }
  return available.at(-1).rarity;
}

export function pickWinner(items, unlockedIds, rng = Math.random) {
  const rarity = selectWeightedRarity(items, unlockedIds, rng);
  if (!rarity) return null;

  const unlocked = new Set(unlockedIds);
  const candidates = items.filter((item) => item.rarity === rarity && !unlocked.has(item.id));
  return candidates[Math.floor(rng() * candidates.length)];
}
