export const RARITY_CONFIG = Object.freeze({
  common: { label: 'COMMON', weight: 45 },
  uncommon: { label: 'UNCOMMON', weight: 25 },
  rare: { label: 'RARE', weight: 15 },
  epic: { label: 'EPIC', weight: 9 },
  legendary: { label: 'LEGENDARY', weight: 5 },
  mythic: { label: 'MYTHIC', weight: 1 }
});

const placeholder = './assets/logos/brand-placeholder.svg';

const catalog = {
  common: [
    'HClips', 'TNAFlix', 'DrTuber', 'Beeg', 'Thumbzilla',
    'KeezMovies', 'SunPorno', 'Nuvid', 'PornOne', 'PornMD',
    '4Tube', 'Jerkmate', 'Flirt4Free', 'Evil Angel', 'Dorcel'
  ],
  uncommon: [
    'Mofos', 'Twistys', 'Adult Time', 'Vixen', 'Blacked',
    'Tushy', 'Playboy', 'Penthouse', 'Motherless', 'Kink', 'Jules Jordan'
  ],
  rare: [
    'Cam4', 'CamSoda', 'MyFreeCams', 'ManyVids', 'Eporner',
    'SpankBang', 'Tube8', 'Digital Playground', 'Naughty America'
  ],
  epic: [
    'RedTube', 'YouPorn', 'LiveJasmin', 'BongaCams',
    'Reality Kings', 'Bang Bros', 'Fansly'
  ],
  legendary: ['XNXX', 'OnlyFans', 'Chaturbate', 'Stripchat', 'Brazzers'],
  mythic: ['Pornhub', 'XVideos', 'xHamster']
};

function initials(name) {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s-]+/);
  const mark = words.length > 1 ? words.map((word) => word[0]).join('') : name.slice(0, 2);
  return mark.slice(0, 3).toUpperCase();
}

export const sites = Object.freeze(
  Object.entries(catalog).flatMap(([rarity, names]) =>
    names.map((name, index) => ({
      id: `site-${String(
        Object.entries(catalog)
          .slice(0, Object.keys(catalog).indexOf(rarity))
          .reduce((sum, [, previous]) => sum + previous.length, 0) + index + 1
      ).padStart(3, '0')}`,
      name,
      initials: initials(name),
      logo: placeholder,
      rarity
    }))
  )
);

export const rarityOrder = Object.freeze(Object.keys(RARITY_CONFIG));
