import { RARITY_CONFIG, rarityOrder } from './data.js';
import { activateLogoFallbacks, brandMarkMarkup } from './logo.js';

function markMarkup(site, locked) {
  if (locked) return '<span class="unknown-mark" aria-hidden="true">?</span>';
  return brandMarkMarkup(site, { lazy: true });
}

export function renderCollection(container, items, unlockedIds, newId = null) {
  const unlocked = new Set(unlockedIds);
  container.innerHTML = rarityOrder.map((rarity) => {
    const group = items.filter((item) => item.rarity === rarity);
    const count = group.filter((item) => unlocked.has(item.id)).length;
    const cards = group.map((site) => {
      const locked = !unlocked.has(site.id);
      const tag = locked ? 'div' : 'a';
      const attrs = locked
        ? 'aria-label="Locked collection slot"'
        : `href="./404.html" aria-label="View ${site.name}"`;
      return `<${tag} ${attrs} class="collection-card rarity-${rarity} ${locked ? 'is-locked' : 'is-unlocked'} ${site.id === newId ? 'is-new' : ''}">
        ${markMarkup(site, locked)}
        <strong>${locked ? 'UNKNOWN' : site.name}</strong>
        <small>${RARITY_CONFIG[rarity].label}</small>
      </${tag}>`;
    }).join('');
    return `<section class="rarity-group" aria-labelledby="heading-${rarity}">
      <div class="group-heading"><h3 id="heading-${rarity}">${RARITY_CONFIG[rarity].label}</h3><span>${count} / ${group.length}</span></div>
      <div class="collection-grid">${cards}</div>
    </section>`;
  }).join('');
  activateLogoFallbacks(container);
}

export function getRarityCounts(items, unlockedIds) {
  const unlocked = new Set(unlockedIds);
  return Object.fromEntries(rarityOrder.map((rarity) => [rarity, {
    unlocked: items.filter((item) => item.rarity === rarity && unlocked.has(item.id)).length,
    total: items.filter((item) => item.rarity === rarity).length
  }]));
}
