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
  const safeJitter = reducedMotion ? 0 : (rng() - 0.5) * cardWidth * 0.38;
  return -(cardLeft + cardWidth / 2 - viewportWidth / 2 + safeJitter);
}

/** A single C1-continuous curve whose velocity only decreases. */
export function smoothDeceleration(progress) {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - t, 4);
}

export function getSpinDuration(viewportWidth, reducedMotion = false) {
  if (reducedMotion) return 520;
  return viewportWidth < 600 ? 5100 : 5400;
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

      const duration = getSpinDuration(viewport.clientWidth, reducedMotion);
      let previousCard = null;
      const startedAt = performance.now();
      const cards = [...track.children];
      const marker = viewport.querySelector('.marker');

      function tick(now) {
        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        const currentX = target * smoothDeceleration(progress);
        track.style.transform = `translate3d(${currentX}px, 0, 0)`;
        const markerPosition = viewportCenter - currentX;
        const currentCard = nearestCard(cards, markerPosition);

        if (currentCard !== previousCard) {
          if (previousCard) {
            previousCard.classList.remove('is-near-marker');
          }
          currentCard.classList.add('is-near-marker');
          if (marker) {
            marker.classList.remove('is-ticking');
            void marker.offsetWidth;
            marker.classList.add('is-ticking');
          }
          previousCard = currentCard;
          onTick?.(progress);
        }

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          if (previousCard) {
            previousCard.classList.remove('is-near-marker');
          }
          winnerCard.classList.add('is-winner');
          resolve(winnerCard);
        }
      }

      requestAnimationFrame(tick);
    }));
  });
}
