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
      <div class="brand-mark" aria-hidden="true">
        <img src="${item.logo}" alt="" draggable="false">
        <span>${item.initials}</span>
      </div>
      <strong>${item.name}</strong>
      <small>${item.rarity.toUpperCase()}</small>
    </div>`;
}

export function renderRoulette(track, items) {
  track.innerHTML = items.map(cardMarkup).join('');
  track.style.transition = 'none';
  track.style.transform = 'translate3d(0, 0, 0)';
}

export function spinRoulette({ viewport, track, winner, items, reducedMotion, onTick }) {
  const strip = buildRouletteItems(items, winner);
  renderRoulette(track, strip);

  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const winnerCard = track.children[WINNER_INDEX];
      const viewportCenter = viewport.clientWidth / 2;
      const winnerCenter = winnerCard.offsetLeft + winnerCard.offsetWidth / 2;
      const jitter = reducedMotion ? 0 : (Math.random() - 0.5) * winnerCard.offsetWidth * 0.28;
      const target = -(winnerCenter - viewportCenter + jitter);
      const duration = reducedMotion ? 650 : 4700;
      let previousIndex = -1;
      let animationFrame;
      const startedAt = performance.now();

      function tick(now) {
        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        const currentX = target * (1 - Math.pow(1 - progress, 4));
        const markerPosition = viewportCenter - currentX;
        const currentIndex = Math.max(0, Math.min(strip.length - 1,
          Math.floor(markerPosition / winnerCard.offsetWidth)));
        if (currentIndex !== previousIndex) {
          previousIndex = currentIndex;
          onTick?.(progress);
        }
        if (progress < 1) animationFrame = requestAnimationFrame(tick);
      }

      track.style.transition = `transform ${duration}ms cubic-bezier(.08,.66,.1,1)`;
      track.style.transform = `translate3d(${target}px, 0, 0)`;
      animationFrame = requestAnimationFrame(tick);
      track.addEventListener('transitionend', () => {
        cancelAnimationFrame(animationFrame);
        winnerCard.classList.add('is-winner');
        resolve(winnerCard);
      }, { once: true });
    }));
  });
}
