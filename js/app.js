import { renderCard, attribution, el } from './card.js';
import { attachSwipe } from './swipe.js';
import { reasonsFor } from './reasons.js';
import * as stats from './stats.js';
import { initZoneView, resetZoneView, zoneLabel } from './zone.js';
import { initGardenView, resetGardenView, gardenLabel, gardensOf, hasGardenAnswer, fitsProfile } from './garden.js';

const $ = (sel) => document.querySelector(sel);

let plants = [];   // kaikki kasvit
let pool = [];     // käyttäjän vyöhykkeellä menestyvät
let queue = [];
let current = null;   // { plant, fling }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue() {
  const profile = stats.getProfile();
  pool = plants.filter((p) => fitsProfile(p, profile?.zone, gardensOf(profile)));
  const seen = new Set(stats.getStats().seen);
  queue = shuffle(pool.filter((p) => !seen.has(p.id)));
  stats.clearUndo();
  $('#zone-badge').textContent = [zoneLabel(profile), gardenLabel(gardensOf(profile))].filter(Boolean).join(' · ');
}

// ---------- Pyyhkäisynäkymä ----------

function showNext() {
  const deck = $('#deck');
  deck.replaceChildren();
  current = null;
  $('#btn-undo').hidden = !stats.canUndo();

  if (!queue.length) {
    $('#actions').hidden = true;
    const hidden = plants.length - pool.length;
    deck.append(el('div', { class: 'done' },
      el('h2', {}, pool.length ? 'Kaikki kasvit käyty läpi!' : 'Vyöhykkeellesi ei vielä ole kasveja'),
      el('p', {}, pool.length ? 'Tykkäämäsi kasvit näkyvät Suosikit-sivulla.' : 'Kasveja lisätään pian.'),
      hidden > 0 && el('p', { class: 'muted' }, `${hidden} kasvia on piilotettu, koska ne eivät sovi vyöhykkeellesi tai puutarhaasi.`),
      el('div', { class: 'done-actions' },
        stats.canUndo() && el('button', { type: 'button', class: 'btn', id: 'undo-last' }, '↶ Kumoa'),
        el('button', { type: 'button', class: 'btn primary', 'data-view': 'favs' }, 'Siirry suosikkeihin →'))));
    $('#undo-last')?.addEventListener('click', undo);
    return;
  }

  $('#actions').hidden = false;
  const plant = queue.shift();
  // Seuraava kortti pinon alle, jotta vaihto ei välähdä
  if (queue[0]) deck.append(Object.assign(renderCard(queue[0]), { className: 'card behind', ariaHidden: 'true' }));
  const card = renderCard(plant);
  deck.append(card);
  current = { plant, fling: attachSwipe(card, (dir) => onSwipe(plant, dir)) };
}

function onSwipe(plant, dir) {
  if (dir === 'like') {
    stats.recordVote(plant.id, 'like');
    showNext();
  } else {
    openReasons(plant);
  }
}

// Nostaa kasvin pinon päälle ja palauttaa nykyisen kortin sen alle
function putOnTop(plant) {
  queue = queue.filter((p) => p !== plant);
  if (current && current.plant !== plant) queue.unshift(current.plant);
  queue.unshift(plant);
  showNext();
}

function undo() {
  if (!$('#reasons').hidden) return;
  const id = stats.undoLast();
  const plant = plants.find((p) => p.id === id);
  if (plant) putOnTop(plant);
}

function restart() {
  if (!confirm('Aloitetaanko alusta? Kaikki tiedot poistetaan: suosikit, valinnat, kasvuvyöhyke ja puutarhatyypit. Tätä ei voi perua.')) return;
  stats.reset();
  showView('zone');
}

// ---------- Hylkäyssyyt ----------

function openReasons(plant) {
  const sheet = $('#reasons');
  const list = $('#reason-list');
  $('#reason-title').textContent = `Miksi ${plant.fi.toLowerCase()} ei sovi sinulle?`;
  list.replaceChildren(...reasonsFor(plant).map((r) =>
    el('button', { type: 'button', class: 'chip', 'data-id': r.id, 'aria-pressed': 'false' }, r.label)));
  sheet.dataset.plant = plant.id;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('open'));
  list.querySelector('button')?.focus();
}

function closeReasons(save) {
  const sheet = $('#reasons');
  if (sheet.hidden) return;
  const chosen = save
    ? [...sheet.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.dataset.id)
    : [];
  stats.recordVote(sheet.dataset.plant, 'dislike', chosen);
  sheet.classList.remove('open');
  sheet.hidden = true;
  showNext();
}

// ---------- Kasvilista ja suosikit ----------

// Rivin napautus vie kasvin korttiin. Tekijätiedot ovat rivin alla, koska
// pikkukuvatkin tarvitsevat ne.
function plantRow(plant, { vote, unfit } = {}) {
  return el('li', { class: unfit ? 'unfit' : '' },
    el('button', { type: 'button', class: 'plant-row', 'data-plant': plant.id },
      el('img', { src: plant.image.url, alt: '', loading: 'lazy' }),
      el('span', { class: 'plant-name' }, plant.fi, el('br'), el('i', {}, plant.sci),
        unfit && el('small', {}, 'Ei sovi vyöhykkeellesi tai puutarhaasi')),
      vote && el('span', { class: `plant-mark ${vote}`, title: vote === 'like' ? 'Tykkäsit' : 'Hylkäsit' }, vote === 'like' ? '✓' : '✕')),
    el('p', { class: 'plant-credit' }, attribution(plant.image)));
}

function renderList() {
  const votes = stats.getStats().votes;
  const inPool = new Set(pool);
  const q = $('#list-search').value.trim().toLowerCase();
  const shown = plants
    .filter((p) => !q || p.fi.toLowerCase().includes(q) || p.sci.toLowerCase().includes(q))
    .sort((a, b) => a.fi.localeCompare(b.fi, 'fi'));
  $('#list-body').replaceChildren(shown.length
    ? el('ul', { class: 'plants' }, shown.map((p) => plantRow(p, { vote: votes[p.id]?.vote, unfit: !inPool.has(p) })))
    : el('p', { class: 'muted' }, 'Ei osumia.'));
}

function renderFavs() {
  const byId = new Map(plants.map((p) => [p.id, p]));
  // Uusin tykkäys ensin
  const favs = Object.entries(stats.getStats().votes)
    .filter(([id, v]) => v.vote === 'like' && byId.has(id))
    .sort((a, b) => b[1].ts.localeCompare(a[1].ts))
    .map(([id]) => byId.get(id));

  $('#favs-body').replaceChildren(favs.length
    ? el('ul', { class: 'plants' }, favs.map((p) => plantRow(p)))
    : el('p', { class: 'muted' }, 'Ei vielä tykkäyksiä.'));
}

function showView(name) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `view-${name}`;
  for (const b of document.querySelectorAll('nav [data-view]')) b.setAttribute('aria-current', b.dataset.view === name ? 'page' : 'false');
  if (name === 'favs') renderFavs();
  if (name === 'list') renderList();
  if (name === 'zone') resetZoneView(stats.getProfile());
  if (name === 'garden') resetGardenView(gardensOf(stats.getProfile()));
}

function onZoneChosen(zoneChoice) {
  const prev = stats.getProfile();
  const { garden, gardens, ...zoneOnly } = zoneChoice;
  stats.setProfile({ ...zoneOnly, ...(hasGardenAnswer(prev) ? { gardens: gardensOf(prev) } : {}) });
  showView('garden');
}

function onGardenChosen(gardens) {
  const { garden, ...rest } = stats.getProfile();
  stats.setProfile({ ...rest, gardens });
  buildQueue();
  showNext();
  showView('swipe');
}

// ---------- Käynnistys ----------

async function init() {
  // Välimuisti: sovellus toimii ilman verkkoa ja kuvat ladataan vain kerran
  navigator.serviceWorker?.register('sw.js').catch(() => {});
  stats.startSession();
  try {
    const res = await fetch('data/plants.json', { cache: 'no-cache' });
    plants = (await res.json()).filter((p) => p.image);
  } catch {
    $('#deck').textContent = 'Kasvitietojen lataus epäonnistui.';
    return;
  }

  document.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) showView(viewBtn.dataset.view);
    const row = e.target.closest('.plant-row');
    if (row) {
      putOnTop(plants.find((p) => p.id === row.dataset.plant));
      showView('swipe');
    }
    const chip = e.target.closest('.chip');
    if (chip) chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });

  $('#btn-like').addEventListener('click', () => current?.fling('like'));
  $('#btn-nope').addEventListener('click', () => current?.fling('dislike'));
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-restart').addEventListener('click', restart);
  $('#list-search').addEventListener('input', renderList);
  $('#reason-done').addEventListener('click', () => closeReasons(true));
  $('#reason-skip').addEventListener('click', () => closeReasons(false));

  document.addEventListener('keydown', (e) => {
    if ($('#view-swipe').hidden) return;
    if (!$('#reasons').hidden) {
      if (e.key === 'Escape') closeReasons(false);
      return;
    }
    if (e.key === 'ArrowRight') current?.fling('like');
    if (e.key === 'ArrowLeft') current?.fling('dislike');
    if (e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) undo();
  });

  initGardenView(onGardenChosen);
  await initZoneView(onZoneChosen);
  buildQueue();
  showNext();
  const profile = stats.getProfile();
  if (!profile) showView('zone');
  else if (!hasGardenAnswer(profile)) showView('garden');
}

init();
