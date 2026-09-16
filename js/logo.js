import { getInitials } from './data.js';

export function brandMarkMarkup(site, { lazy = false, className = '' } = {}) {
  const loading = lazy ? ' loading="lazy"' : '';
  return `<span class="brand-mark ${className}" aria-hidden="true">
    <img src="${site.logo}" alt="" draggable="false"${loading}>
    <span class="brand-fallback">${getInitials(site.name)}</span>
  </span>`;
}

export function activateLogoFallbacks(root) {
  root.querySelectorAll('.brand-mark').forEach((mark) => {
    const image = mark.querySelector('img');
    if (!image) return;
    const showLogo = () => mark.classList.remove('is-fallback');
    const showFallback = () => mark.classList.add('is-fallback');
    image.addEventListener('load', showLogo, { once: true });
    image.addEventListener('error', showFallback, { once: true });
    if (image.complete) (image.naturalWidth ? showLogo : showFallback)();
  });
}

export function setBrandMark(mark, site) {
  const image = mark.querySelector('img');
  const fallback = mark.querySelector('.brand-fallback');
  mark.classList.remove('is-fallback');
  fallback.textContent = getInitials(site.name);
  image.alt = `${site.name} brand mark`;
  image.src = site.logo;
  activateLogoFallbacks(mark.parentElement);
}

let preloadPromise;
export function preloadLogos(items) {
  preloadPromise ||= Promise.all(items.map((site) => new Promise((resolve) => {
    const image = new Image();
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
    image.src = site.logo;
  })));
  return preloadPromise;
}
