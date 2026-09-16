export const RARITY_CONFIG = Object.freeze({
  common: { label: 'COMMON', weight: 45 },
  uncommon: { label: 'UNCOMMON', weight: 25 },
  rare: { label: 'RARE', weight: 15 },
  epic: { label: 'EPIC', weight: 9 },
  legendary: { label: 'LEGENDARY', weight: 5 },
  mythic: { label: 'MYTHIC', weight: 1 }
});

const catalog = Object.freeze({
  common: [
    'PornOne', 'Beeg', 'Thumbzilla', 'Mofos', 'Vixen',
    'Blacked', 'Tushy', 'Playboy', 'Naughty America', 'Kink',
    'HClips', 'TNAFlix', 'Dit69', 'Phe69', 'VNSexTop1'
  ],
  uncommon: [
    'LiveJasmin', 'Cam4', 'CamSoda', 'MyFreeCams', 'ManyVids',
    'Motherless', 'Tube8', 'Reality Kings', 'Bang Bros', 'xHamsterLive', 'JAVHDZ'
  ],
  rare: [
    'RedTube', 'YouPorn', 'Eporner', 'BongaCams', 'Stripchat',
    'Chaturbate', 'OnlyFans', 'Brazzers', 'Fansly'
  ],
  epic: [
    'XHSpot', 'TubePornstars', 'JAVHDPorn', 'HugeSex',
    'JAVHD', 'BoyfriendTV', 'SpankBang'
  ],
  legendary: ['HentaiEra', 'HentaiRead', 'JAVTiful', 'XNXX', 'Xasiat'],
  mythic: ['Pornhub', 'XVideos', 'xHamster']
});

export function getInitials(name) {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s-]+/);
  const mark = words.length > 1 ? words.map((word) => word[0]).join('') : name.slice(0, 2);
  return mark.slice(0, 3).toUpperCase();
}

function slugify(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

let itemNumber = 0;
export const sites = Object.freeze(
  Object.entries(catalog).flatMap(([rarity, names]) => names.map((name) => {
    itemNumber += 1;
    return Object.freeze({
      id: `site-${String(itemNumber).padStart(3, '0')}`,
      name,
      logo: `./assets/logos/${slugify(name)}.svg`,
      rarity
    });
  }))
);

export const rarityOrder = Object.freeze(Object.keys(RARITY_CONFIG));
