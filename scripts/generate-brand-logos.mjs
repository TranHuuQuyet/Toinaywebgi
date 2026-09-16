import { mkdir, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { getInitials, sites } from '../js/data.js';

const rarityHue = {
  common: 190,
  uncommon: 142,
  rare: 208,
  epic: 274,
  legendary: 38,
  mythic: 346
};

function hashName(name) {
  return [...name].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
}

function escapeXml(value) {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  })[character]);
}

function createLogo(site) {
  const hash = hashName(site.name);
  const base = (rarityHue[site.rarity] + hash % 36 - 18 + 360) % 360;
  const accent = (base + 28 + hash % 48) % 360;
  const angle = hash % 360;
  const initials = escapeXml(getInitials(site.name));
  const name = escapeXml(site.name.toUpperCase());
  const shape = hash % 3;
  const symbol = shape === 0
    ? '<path d="M32 78 80 20l48 58-48 22z" fill="none" stroke="url(#accent)" stroke-width="3" opacity=".35"/>'
    : shape === 1
      ? `<circle cx="80" cy="54" r="37" fill="none" stroke="url(#accent)" stroke-width="3" stroke-dasharray="${8 + hash % 10} 7" opacity=".38"/>`
      : '<path d="M26 27h108L109 91H17z" fill="none" stroke="url(#accent)" stroke-width="3" opacity=".36"/>';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 112" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(site.name)} brand mark</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)">
      <stop stop-color="hsl(${base} 54% 16%)"/>
      <stop offset="1" stop-color="#090d10"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="hsl(${base} 88% 62%)"/>
      <stop offset="1" stop-color="hsl(${accent} 92% 57%)"/>
    </linearGradient>
    <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse">
      <path d="M12 0H0v12" fill="none" stroke="#fff" stroke-opacity=".035"/>
    </pattern>
  </defs>
  <rect width="160" height="112" rx="8" fill="url(#bg)"/>
  <rect width="160" height="112" rx="8" fill="url(#grid)"/>
  ${symbol}
  <path d="M18 17h22M120 17h22M18 95h22M120 95h22" stroke="url(#accent)" stroke-width="2" opacity=".72"/>
  <text x="80" y="65" fill="#f7faf5" text-anchor="middle" font-family="Arial Narrow,Arial,sans-serif" font-size="38" font-weight="800" letter-spacing="-1">${initials}</text>
  <text x="80" y="89" fill="hsl(${base} 88% 70%)" text-anchor="middle" font-family="Consolas,monospace" font-size="7" font-weight="700" letter-spacing="1.2">${name}</text>
</svg>
`;
}

await mkdir('assets/logos', { recursive: true });
for (const site of sites) {
  await writeFile(`assets/logos/${basename(site.logo)}`, createLogo(site), 'utf8');
}

console.log(`Generated ${sites.length} individual SVG brand marks.`);
