// Puutarhan tyyppi: kysytään vyöhykkeen jälkeen monivalintana, ja sillä piilotetaan
// kasvit, jotka eivät sovi yhteenkään käyttäjän valitsemaan paikkaan.

import { el } from './card.js';

const $ = (sel) => document.querySelector(sel);

// size: mitä isompi, sitä useampi kasvi sopii
export const GARDENS = {
  parveke: { label: 'Parveke tai terassi', short: 'Parveke', hint: 'Kasvit ruukuissa ja laatikoissa. Ruukussa talvehtiminen on arempaa, joten näytämme vyöhykettä kestävämmät kasvit.', icon: '🪴', size: 0 },
  pieni: { label: 'Pieni piha', short: 'Pieni piha', hint: 'Rivitalon piha tai pieni kaupunkitontti', icon: '🏡', size: 1 },
  iso: { label: 'Iso piha', short: 'Iso piha', hint: 'Omakotitalon tai maaseudun piha', icon: '🌳', size: 2 },
  mokki: { label: 'Mökki', short: 'Mökki', hint: 'Kesämökin tai vapaa-ajan asunnon piha', icon: '🛖', size: 2 },
};

const PLANT_SIZE = { parveke: 0, pieni: 1, iso: 2 };

/** Pienin puutarha, johon kasvi sopii. Kentän puuttuessa päätellään tyypistä ja korkeudesta. */
export function minGarden(plant) {
  if (plant.minGarden) return plant.minGarden;
  const isTree = plant.type === 'lehtipuu' || plant.type === 'havupuu';
  if (isTree) return plant.height[0] >= 1000 ? 'iso' : 'pieni';
  // Suurpensaat (pähkinäpensas) ja voimakkaat köynnökset (humala, villiviini) vievät pienen pihan
  const isWoody = plant.type === 'pensas' || plant.type === 'koynnos';
  if (isWoody) return plant.height[1] > 500 ? 'iso' : 'pieni';
  return 'pieni';
}

/** Ruukussa kasvi talvehtii arammin, joten parvekkeella vaaditaan yhtä vyöhykettä kestävämpi kasvi. */
export function effectiveZone(zone, garden) {
  if (!zone) return zone;
  return garden === 'parveke' ? Math.min(zone + 1, 8) : zone;
}

export function fitsGarden(plant, garden) {
  return PLANT_SIZE[minGarden(plant)] <= GARDENS[garden].size;
}

/** Profiilin puutarhat taulukkona; vanhoissa profiileissa on yksittäinen `garden`. */
export function gardensOf(profile) {
  if (Array.isArray(profile?.gardens)) return profile.gardens;
  return profile?.garden ? [profile.garden] : [];
}

/** Onko käyttäjä jo vastannut puutarhakysymykseen (myös ohittaminen on vastaus). */
export function hasGardenAnswer(profile) {
  return !!profile && ('gardens' in profile || 'garden' in profile);
}

/** Näytetäänkö kasvi: sen pitää sopia vyöhykkeeseen ja johonkin valituista paikoista. */
export function fitsProfile(plant, zone, gardens) {
  if (!gardens.length) return !zone || plant.zoneMax >= zone;
  return gardens.some((g) => fitsGarden(plant, g) && (!zone || plant.zoneMax >= effectiveZone(zone, g)));
}

export function initGardenView(onDone) {
  $('#garden-pick').replaceChildren(...Object.entries(GARDENS).map(([id, g]) =>
    el('button', { type: 'button', class: 'garden-option', 'data-garden': id, 'aria-pressed': 'false' },
      el('span', { class: 'garden-icon', 'aria-hidden': 'true' }, g.icon),
      el('span', {}, el('strong', {}, g.label), el('br'), el('span', { class: 'muted small' }, g.hint)))));

  $('#garden-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-garden]');
    if (!b) return;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    $('#garden-ok').disabled = !selected().length;
  });
  $('#garden-ok').addEventListener('click', () => onDone(selected()));
  $('#garden-skip').addEventListener('click', () => onDone([]));
}

function selected() {
  return [...document.querySelectorAll('[data-garden][aria-pressed="true"]')].map((b) => b.dataset.garden);
}

export function resetGardenView(gardens) {
  for (const b of document.querySelectorAll('[data-garden]')) {
    b.setAttribute('aria-pressed', String(gardens.includes(b.dataset.garden)));
  }
  $('#garden-ok').disabled = !gardens.length;
}

export function gardenLabel(gardens) {
  return gardens.length ? gardens.map((g) => GARDENS[g].short).join(', ') : null;
}
