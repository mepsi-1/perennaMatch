// Tilastojen tallennus. Ainoa moduuli, joka koskee localStorageen –
// etäkeruu (esim. Supabase) lisätään myöhemmin recordVote()-funktioon.

const KEY = 'perenna.v1';

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function empty() {
  return {
    userId: uuid(),
    firstSeen: new Date().toISOString(),
    sessions: 0,
    profile: null,  // { zone: 1–8 | null, municipality, method: 'gps'|'kunta'|'valinta'|'ohitus' }
    votes: {},   // viimeisin ääni per kasvi
    seen: [],    // tällä kierroksella nähdyt kasvit
    totals: { likes: 0, dislikes: 0, reasons: {} },  // kumulatiiviset, eivät nollaudu uudella kierroksella
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch { /* yksityinen ikkuna tai estetty tallennus */ }
  return empty();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ei tallennusta */ }
}

export function startSession() {
  state.sessions += 1;
  save();
}

export function recordVote(plantId, vote, reasons = []) {
  state.votes[plantId] = { vote, reasons, ts: new Date().toISOString() };
  if (!state.seen.includes(plantId)) state.seen.push(plantId);
  if (vote === 'like') state.totals.likes += 1;
  else state.totals.dislikes += 1;
  for (const r of reasons) state.totals.reasons[r] = (state.totals.reasons[r] || 0) + 1;
  save();
}

export function getProfile() {
  return state.profile;
}

/** Tallentaa vain vyöhykkeen ja kunnan nimen – ei koordinaatteja. */
export function setProfile(profile) {
  state.profile = { ...profile, ts: new Date().toISOString() };
  save();
}

export function getStats() {
  return structuredClone(state);
}

export function newRound() {
  state.seen = [];
  save();
}

export function reset() {
  state = empty();
  state.sessions = 1;
  save();
}

export function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `perennatilastot-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
