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
    'PhimSetHD', 'XPhim69', 'JAVHD1', 'PhimSexSuong3X', 'SexDam',
    'SexTop1', 'SexVietSubs', 'Nguon3X', 'ClipSexViet', 'XNhau',
    'SexViet247', 'HeoVL', 'SexVietDam', 'Viet69', 'JAVSub'
  ],
  uncommon: [
    'VLXX', 'VNSexTop1', 'Dit69', 'Phe69', 'xHamsterLive', 'ThePornDude',
    'LiveJasmin', 'Cam4', 'BongaCams', 'Fansly', 'Reality Kings'
  ],
  rare: [
    'BoyfriendTV', 'JAVHD', 'HugeSex', 'JAVHDPorn', 'TubePornstars',
    'Eporner', 'RedTube', 'YouPorn', 'Bang Bros'
  ],
  epic: [
    'XHSpot', 'Xasiat', 'HentaiRead', 'Chaturbate',
    'Stripchat', 'OnlyFans', 'Brazzers'
  ],
  legendary: ['HentaiEra', 'JAVTiful', 'XNXX', 'SpankBang', 'Playboy'],
  mythic: ['Pornhub', 'XVideos', 'xHamster']
});

export const VIETNAM_RELEVANT_NAMES = Object.freeze([
  'PhimSetHD', 'XPhim69', 'JAVHD1', 'PhimSexSuong3X', 'SexDam',
  'SexTop1', 'SexVietSubs', 'Nguon3X', 'ClipSexViet', 'XNhau',
  'SexViet247', 'HeoVL', 'SexVietDam', 'Viet69', 'JAVSub',
  'VLXX', 'VNSexTop1', 'Dit69', 'Phe69', 'xHamsterLive', 'ThePornDude',
  'BoyfriendTV', 'JAVHD', 'HugeSex', 'JAVHDPorn', 'TubePornstars',
  'XHSpot', 'Xasiat', 'HentaiRead', 'HentaiEra', 'JAVTiful', 'XNXX',
  'Pornhub', 'XVideos', 'xHamster'
]);

export function getInitials(name) {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s-]+/);
  const mark = words.length > 1 ? words.map((word) => word[0]).join('') : name.slice(0, 2);
  return mark.slice(0, 3).toUpperCase();
}

function slugify(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

const logoOverrides = Object.freeze({
  XPhim69: './assets/logos/xphim69.ico'
});

let itemNumber = 0;
export const sites = Object.freeze(
  Object.entries(catalog).flatMap(([rarity, names]) => names.map((name) => {
    itemNumber += 1;
    return Object.freeze({
      id: `site-${String(itemNumber).padStart(3, '0')}`,
      name,
      logo: logoOverrides[name] || `./assets/logos/${slugify(name)}.png`,
      rarity
    });
  }))
);

export const rarityOrder = Object.freeze(Object.keys(RARITY_CONFIG));
