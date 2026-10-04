// Kasvikortin ja kuvan tekijätietojen renderöinti.

const MONTHS = ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const CARE = { helppo: 'Helppo', keskitaso: 'Kohtalainen', vaativa: 'Vaativa' };
export const TYPE = {
  perenna: 'Perenna', pensas: 'Pensas', lehtipuu: 'Lehtipuu', havupuu: 'Havupuu',
  koynnos: 'Köynnös', sipulikukka: 'Sipulikukka', koristeheina: 'Koristeheinä', saniainen: 'Saniainen',
};
export const TAGS = { perhonen: 'Perhoskasvi', kallio: 'Kalliopiha', syotava: 'Syötävä', maanpeite: 'Maanpeite' };

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

function months([from, to]) {
  return from === to ? `${MONTHS[from - 1]}kuu` : `${MONTHS[from - 1]}–${MONTHS[to - 1]}kuu`;
}

// Puiden korkeus metreinä, perennojen senttimetreinä
function height([min, max]) {
  if (max < 200) return `${min}–${max} cm`;
  const m = (cm) => String(cm / 100).replace('.', ',');
  return `${m(min)}–${m(max)} m`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function attribution(image, { long = false } = {}) {
  const license = image.licenseUrl
    ? el('a', { href: image.licenseUrl, target: '_blank', rel: 'noopener' }, image.license)
    : image.license;
  const source = el('a', { href: image.source, target: '_blank', rel: 'noopener' },
    long ? image.sourceName : image.artist);
  return long
    ? el('span', {}, `${image.artist} · `, license, ' · ', source)
    : el('span', {}, 'Kuva: ', source, ' · ', license);
}

export function renderCard(plant) {
  const facts = [
    ['Korkeus', height(plant.height)],
    ['Kukinta', plant.bloom ? months(plant.bloom) : plant.type === 'saniainen' ? 'Ei kukintaa' : 'Ei koristeellinen'],
    ['Valo', capitalize(plant.light.join(', '))],
    ['Maa', capitalize(plant.moisture.join(', '))],
    ['Vyöhykkeet', `I–${ROMAN[plant.zoneMax]}`],
    ['Hoito', CARE[plant.care]],
  ];

  const img = plant.image
    ? el('img', { src: plant.image.url, alt: `${plant.fi} (${plant.sci})`, draggable: 'false' })
    : el('div', { class: 'no-image' }, 'Ei kuvaa');

  // Herbaarioarkki: teipattu kuva ja kirjoituskoneella täytetty keruulappu
  return el('article', { class: 'card', 'aria-label': plant.fi },
    el('div', { class: 'mount' }, img),
    plant.image && el('p', { class: 'credit' }, attribution(plant.image)),
    el('div', { class: 'label' },
      el('p', { class: 'label-head' },
        el('span', {}, 'Herb. PerennaMatch'),
        el('span', {}, [TYPE[plant.type ?? 'perenna'], ...(plant.tags ?? []).map((t) => TAGS[t])].join(' · '))),
      el('h2', { class: 'taxon' }, el('i', {}, plant.sci), el('span', { class: 'vern' }, plant.fi)),
      el('dl', { class: 'facts' },
        facts.map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v)))),
      el('p', { class: 'desc' }, plant.desc),
    ),
    el('span', { class: 'stamp like' }, 'Tykkään'),
    el('span', { class: 'stamp nope' }, 'Ei kiitos'),
  );
}
