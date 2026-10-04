// Puutarhan tyyppi: kysytään vyöhykkeen jälkeen, ja sillä piilotetaan
// kasvit, jotka eivät mahdu tai sovi käyttäjän puutarhaan.

import { el } from './card.js';

const $ = (sel) => document.querySelector(sel);

// size: mitä isompi, sitä useampi kasvi sopii
export const GARDENS = {
  parveke: { label: 'Parveke tai terassi', hint: 'Kasvit ruukuissa ja laatikoissa. Ruukussa talvehtiminen on arempaa, joten näytämme vyöhykettä kestävämmät kasvit.', icon: '🪴', size: 0 },
  pieni: { label: 'Pieni piha', hint: 'Rivitalon piha tai pieni kaupunkitontti', icon: '🏡', size: 1 },
  iso: { label: 'Iso piha', hint: 'Omakotitalon tai maaseudun piha', icon: '🌳', size: 2 },
  mokki: { label: 'Mökki', hint: 'Kesämökin tai vapaa-ajan asunnon piha', icon: '🛖', size: 2 },
};

const PLANT_SIZE = { parveke: 0, pieni: 1, iso: 2 };

/** Pienin puutarha, johon kasvi sopii. Kentän puuttuessa päätellään tyypistä ja korkeudesta. */
export function minGarden(plant) {
  if (plant.minGarden) return plant.minGarden;
  const isTree = plant.type === 'lehtipuu' || plant.type === 'havupuu';
  if (isTree) return plant.height[0] >= 1000 ? 'iso' : 'pieni';
  return 'pieni';
}

/** Ruukussa kasvi talvehtii arammin, joten parvekkeella vaaditaan yhtä vyöhykettä kestävämpi kasvi. */
export function effectiveZone(zone, garden) {
  if (!zone) return zone;
  return garden === 'parveke' ? Math.min(zone + 1, 8) : zone;
}

export function fitsGarden(plant, garden) {
  if (!garden) return true;
  return PLANT_SIZE[minGarden(plant)] <= GARDENS[garden].size;
}

export function initGardenView(onDone) {
  $('#garden-pick').replaceChildren(...Object.entries(GARDENS).map(([id, g]) =>
    el('button', { type: 'button', class: 'garden-option', 'data-garden': id, 'aria-pressed': 'false' },
      el('span', { class: 'garden-icon', 'aria-hidden': 'true' }, g.icon),
      el('span', {}, el('strong', {}, g.label), el('br'), el('span', { class: 'muted small' }, g.hint)))));

  $('#garden-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-garden]');
    if (b) onDone(b.dataset.garden);
  });
  $('#garden-skip').addEventListener('click', () => onDone(null));
}

export function resetGardenView(garden) {
  for (const b of document.querySelectorAll('[data-garden]')) {
    b.setAttribute('aria-pressed', String(b.dataset.garden === garden));
  }
}

export function gardenLabel(garden) {
  return garden ? GARDENS[garden].label : null;
}
