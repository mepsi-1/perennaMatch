// Kasvuvyöhykkeen selvitys: sijainti → lähin kunta, kunnan haku tai suora valinta.
// Sijaintia käytetään vain selaimessa lähimmän kunnan etsimiseen, eikä sitä tallenneta.

import { el } from './card.js';

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const $ = (sel) => document.querySelector(sel);

let municipalities = null;
let choice = null;   // { zone, municipality, method, suggestedZone }

async function loadMunicipalities() {
  if (!municipalities) {
    const res = await fetch('data/municipalities.json');
    municipalities = await res.json();
  }
  return municipalities;
}

// Lähin kunnan keskipiste; tasoprojektio riittää näillä etäisyyksillä
function nearest(lat, lon) {
  const k = Math.cos((lat * Math.PI) / 180);
  let best = null, bestD = Infinity;
  for (const m of municipalities) {
    const d = (m.lat - lat) ** 2 + ((m.lon - lon) * k) ** 2;
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

function findByName(name) {
  const n = name.trim().toLocaleLowerCase('fi');
  return municipalities.find((m) => m.fi.toLocaleLowerCase('fi') === n || m.sv?.toLocaleLowerCase('fi') === n);
}

function status(text) {
  $('#zone-status').textContent = text;
}

function selectZone(zone) {
  for (const b of document.querySelectorAll('.zone-pick button')) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.zone) === zone));
  }
  if (choice) choice.zone = zone;
  else choice = { zone, municipality: null, method: 'valinta' };
  $('#zone-ok').disabled = !zone;
}

function useMunicipality(m, method) {
  choice = { zone: m.zone, municipality: m.fi, method, suggestedZone: m.zone };
  $('#zone-town').value = m.fi;
  if (m.zone) {
    status(`${method === 'gps' ? 'Lähin kunta' : 'Kunta'}: ${m.fi} – arvioitu kasvuvyöhyke ${ROMAN[m.zone]}. Voit tarkentaa valintaa alla.`);
  } else {
    status(`${method === 'gps' ? 'Lähin kunta' : 'Kunta'}: ${m.fi}. Kunnan vyöhyketietoa ei vielä ole – valitse vyöhyke alta.`);
  }
  selectZone(m.zone);
}

function locate() {
  if (!navigator.geolocation) {
    status('Selaimesi ei tue sijaintia. Valitse kunta tai vyöhyke.');
    return;
  }
  status('Haetaan sijaintia…');
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      await loadMunicipalities();
      useMunicipality(nearest(coords.latitude, coords.longitude), 'gps');
    },
    () => status('Sijaintia ei saatu. Valitse kunta tai vyöhyke.'),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
  );
}

/** Kytkee näkymän tapahtumat. onDone(profile) kutsutaan, kun käyttäjä vahvistaa. */
export async function initZoneView(onDone) {
  $('#zone-pick').replaceChildren(...ROMAN.slice(1).map((r, i) =>
    el('button', { type: 'button', 'data-zone': String(i + 1), 'aria-pressed': 'false' }, r)));

  $('#zone-pick').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) selectZone(Number(b.dataset.zone));
  });
  $('#zone-locate').addEventListener('click', locate);
  $('#zone-town').addEventListener('input', (e) => {
    const m = municipalities && findByName(e.target.value);
    if (m) useMunicipality(m, 'kunta');
  });
  $('#zone-ok').addEventListener('click', () => onDone(choice));
  $('#zone-skip').addEventListener('click', () => onDone({ zone: null, municipality: null, method: 'ohitus' }));

  await loadMunicipalities();
  $('#towns').replaceChildren(...municipalities.flatMap((m) =>
    [el('option', { value: m.fi }), m.sv && el('option', { value: m.sv })].filter(Boolean)));
}

/** Valmistelee näkymän avattavaksi aiemman valinnan pohjalta. */
export function resetZoneView(profile) {
  choice = profile?.zone ? { ...profile } : null;
  $('#zone-town').value = profile?.municipality ?? '';
  status('');
  selectZone(profile?.zone ?? null);
}

export function zoneLabel(profile) {
  if (!profile?.zone) return 'Kaikki vyöhykkeet';
  return `Vyöhyke ${ROMAN[profile.zone]}${profile.municipality ? ` · ${profile.municipality}` : ''}`;
}
