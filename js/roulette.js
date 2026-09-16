import { activateLogoFallbacks, brandMarkMarkup } from './logo.js';

export const WINNER_INDEX = 38;
const STRIP_LENGTH = 44;

export function buildRouletteItems(items, winner, rng = Math.random) {
  const strip = Array.from({ length: STRIP_LENGTH }, () => items[Math.floor(rng() * items.length)]);
  strip[WINNER_INDEX] = winner;
  return strip;
}

function cardMarkup(item) {
  return `
    <div class="roulette-card rarity-${item.rarity}" data-site-id="${item.id}">
      ${brandMarkMarkup(item)}
      <strong>${item.name}</strong>
      <small>${item.rarity.toUpperCase()}</small>
    </div>`;
}

export function renderRoulette(track, items) {
  track.innerHTML = items.map(cardMarkup).join('');
  track.style.transition = 'none';
  track.style.transform = 'translate3d(0, 0, 0)';
  activateLogoFallbacks(track);
}

export function calculateLandingTarget({ cardLeft, cardWidth, viewportWidth }, rng = Math.random, reducedMotion = false) {
  const safeJitter = reducedMotion ? 0 : (rng() - 0.5) * cardWidth * 0.42;
  return -(cardLeft + cardWidth / 2 - viewportWidth / 2 + safeJitter);
}

export function stagedSpinEase(progress) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  if (progress < 0.58) {
    const local = progress / 0.58;
    return 0.8 * (1 - Math.pow(1 - local, 3));
  }
  const local = (progress - 0.58) / 0.42;
  return 0.8 + 0.2 * (1 - Math.pow(1 - local, 4));
}

function nearestCard(cards, markerPosition) {
  return cards.reduce((nearest, card) => {
    const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - markerPosition);
    return distance < nearest.distance ? { card, distance } : nearest;
  }, { card: cards[0], distance: Infinity }).card;
}

export function spinRoulette({ viewport, track, winner, items, reducedMotion, onTick }) {
  const strip = buildRouletteItems(items, winner);
  renderRoulette(track, strip);

  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const winnerCard = track.children[WINNER_INDEX];
      const viewportCenter = viewport.clientWidth / 2;
      const target = calculateLandingTarget({
        cardLeft: winnerCard.offsetLeft,
        cardWidth: winnerCard.offsetWidth,
        viewportWidth: viewport.clientWidth
      }, Math.random, reducedMotion);
      const duration = reducedMotion ? 420 : 5200;
      let previousCard = null;
      const startedAt = performance.now();
      const cards = [...track.children];
      const marker = viewport.querySelector('.marker');

      function tick(now) {
        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        const currentX = target * stagedSpinEase(progress);
        track.style.transform = `translate3d(${currentX}px, 0, 0)`;
        const markerPosition = viewportCenter - currentX;
        const currentCard = nearestCard(cards, markerPosition);
        if (currentCard !== previousCard) {
          previousCard?.classList.remove('is-near-marker');
          currentCard.classList.add('is-near-marker');
          marker?.classList.remove('is-ticking');
          void marker?.offsetWidth;
          marker?.classList.add('is-ticking');
          previousCard = currentCard;
          onTick?.(progress);
        }
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          previousCard?.classList.remove('is-near-marker');
          winnerCard.classList.add('is-winner');
          resolve(winnerCard);
        }
      }

      requestAnimationFrame(tick);
    }));
  });
}
