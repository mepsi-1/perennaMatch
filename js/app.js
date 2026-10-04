import { renderCard, attribution, el } from './card.js';
import { attachSwipe } from './swipe.js';
import { reasonsFor, reasonLabel } from './reasons.js';
import * as stats from './stats.js';
import { initZoneView, resetZoneView, zoneLabel } from './zone.js';

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
  const zone = stats.getProfile()?.zone;
  pool = zone ? plants.filter((p) => p.zoneMax >= zone) : plants;
  const seen = new Set(stats.getStats().seen);
  queue = shuffle(pool.filter((p) => !seen.has(p.id)));
  $('#zone-badge').textContent = zoneLabel(stats.getProfile());
}

// ---------- Pyyhkäisynäkymä ----------

function updateProgress() {
  const done = pool.length - queue.length - (current ? 1 : 0);
  $('#progress').textContent = `${Math.min(done + 1, pool.length)} / ${pool.length}`;
}

function showNext() {
  const deck = $('#deck');
  deck.replaceChildren();
  current = null;

  if (!queue.length) {
    $('#actions').hidden = true;
    $('#progress').textContent = '';
    const hidden = plants.length - pool.length;
    deck.append(el('div', { class: 'done' },
      el('h2', {}, pool.length ? 'Kaikki kasvit käyty läpi!' : 'Vyöhykkeellesi ei vielä ole kasveja'),
      el('p', {}, pool.length ? 'Katso tilastoista, mistä pidit – tai aloita uusi kierros.' : 'Kasveja lisätään pian.'),
      hidden > 0 && el('p', { class: 'muted' }, `${hidden} kasvia on piilotettu, koska ne eivät menesty vyöhykkeelläsi.`),
      el('div', { class: 'done-actions' },
        el('button', { type: 'button', class: 'btn', 'data-view': 'stats' }, 'Tilastot'),
        el('button', { type: 'button', class: 'btn primary', id: 'restart' }, 'Uusi kierros'))));
    $('#restart').addEventListener('click', () => { stats.newRound(); buildQueue(); showNext(); });
    return;
  }

  $('#actions').hidden = false;
  const plant = queue.shift();
  // Seuraava kortti pinon alle, jotta vaihto ei välähdä
  if (queue[0]) deck.append(Object.assign(renderCard(queue[0]), { className: 'card behind', ariaHidden: 'true' }));
  const card = renderCard(plant);
  deck.append(card);
  current = { plant, fling: attachSwipe(card, (dir) => onSwipe(plant, dir)) };
  updateProgress();
}

function onSwipe(plant, dir) {
  if (dir === 'like') {
    stats.recordVote(plant.id, 'like');
    showNext();
  } else {
    openReasons(plant);
  }
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

// ---------- Tilastot ja tekijät ----------

function renderStats() {
  const s = stats.getStats();
  const { likes, dislikes } = s.totals;
  const total = likes + dislikes;
  const byId = new Map(plants.map((p) => [p.id, p]));

  const favs = Object.entries(s.votes)
    .filter(([id, v]) => v.vote === 'like' && byId.has(id))
    .map(([id]) => byId.get(id));

  const reasons = Object.entries(s.totals.reasons).sort((a, b) => b[1] - a[1]);
  const max = reasons[0]?.[1] || 1;

  $('#stats-body').replaceChildren(
    el('div', { class: 'tiles' },
      el('div', { class: 'tile' }, el('strong', {}, String(total)), el('span', {}, 'arviota')),
      el('div', { class: 'tile' }, el('strong', {}, total ? `${Math.round((likes / total) * 100)} %` : '–'), el('span', {}, 'tykkäyksiä')),
      el('div', { class: 'tile' }, el('strong', {}, String(s.sessions)), el('span', {}, 'käyntikertaa'))),
    el('h3', {}, 'Suosikkisi'),
    favs.length
      ? el('ul', { class: 'favs' }, favs.map((p) => el('li', {},
          p.image && el('img', { src: p.image.url, alt: '' }),
          el('span', {}, p.fi, el('br'), el('i', {}, p.sci)))))
      : el('p', { class: 'muted' }, 'Ei vielä tykkäyksiä.'),
    el('h3', {}, 'Yleisimmät hylkäyssyyt'),
    reasons.length
      ? el('ul', { class: 'bars' }, reasons.map(([id, n]) => el('li', {},
          el('span', { class: 'bar-label' }, reasonLabel(id, plants)),
          el('span', { class: 'bar', style: `--w:${(n / max) * 100}%` }),
          el('span', { class: 'bar-value' }, String(n)))))
      : el('p', { class: 'muted' }, 'Ei vielä hylkäyksiä.'),
  );
}

function renderCredits() {
  $('#credits-body').replaceChildren(el('ul', { class: 'credits' },
    plants.filter((p) => p.image).map((p) => el('li', {},
      el('strong', {}, p.fi), ' ', el('i', {}, p.sci), el('br'),
      attribution(p.image, { long: true })))));
}

function showView(name) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `view-${name}`;
  for (const b of document.querySelectorAll('nav [data-view]')) b.setAttribute('aria-current', b.dataset.view === name ? 'page' : 'false');
  if (name === 'stats') renderStats();
  if (name === 'credits') renderCredits();
  if (name === 'zone') resetZoneView(stats.getProfile());
}

function onZoneChosen(profile) {
  stats.setProfile(profile);
  buildQueue();
  showNext();
  showView('swipe');
}

// ---------- Käynnistys ----------

async function init() {
  stats.startSession();
  try {
    const res = await fetch('data/plants.json');
    plants = (await res.json()).filter((p) => p.image);
  } catch {
    $('#deck').textContent = 'Kasvitietojen lataus epäonnistui.';
    return;
  }

  document.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) showView(viewBtn.dataset.view);
    const chip = e.target.closest('.chip');
    if (chip) chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });

  $('#btn-like').addEventListener('click', () => current?.fling('like'));
  $('#btn-nope').addEventListener('click', () => current?.fling('dislike'));
  $('#reason-done').addEventListener('click', () => closeReasons(true));
  $('#reason-skip').addEventListener('click', () => closeReasons(false));
  $('#export').addEventListener('click', stats.exportJson);
  $('#reset').addEventListener('click', () => {
    if (!confirm('Poistetaanko kaikki tallennetut valinnat?')) return;
    stats.reset();
    showView('zone');
  });

  document.addEventListener('keydown', (e) => {
    if ($('#view-swipe').hidden) return;
    if (!$('#reasons').hidden) {
      if (e.key === 'Escape') closeReasons(false);
      return;
    }
    if (e.key === 'ArrowRight') current?.fling('like');
    if (e.key === 'ArrowLeft') current?.fling('dislike');
  });

  await initZoneView(onZoneChosen);
  buildQueue();
  showNext();
  if (!stats.getProfile()) showView('zone');
}

init();
