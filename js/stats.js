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
    profile: null,  // { zone: 1–8 | null, municipality, method: 'gps'|'kunta'|'valinta'|'oletus'|'ohitus' }
    votes: {},   // viimeisin ääni per kasvi
    seen: [],    // tällä kierroksella nähdyt kasvit
    totals: { likes: 0, dislikes: 0, reasons: {} },  // kumulatiiviset etäkeruuta varten, eivät nollaudu uudella kierroksella
  };
}

let state = load();
const undoStack = [];  // tämän käynnin äänet kumoamista varten, ei tallenneta

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
  undoStack.push({ plantId, prev: state.votes[plantId], wasSeen: state.seen.includes(plantId) });
  state.votes[plantId] = { vote, reasons, ts: new Date().toISOString() };
  if (!state.seen.includes(plantId)) state.seen.push(plantId);
  if (vote === 'like') state.totals.likes += 1;
  else state.totals.dislikes += 1;
  for (const r of reasons) state.totals.reasons[r] = (state.totals.reasons[r] || 0) + 1;
  save();
}

/** Kumoaa viimeisimmän äänen ja palauttaa kasvin id:n, tai null jos kumottavaa ei ole. */
export function undoLast() {
  const last = undoStack.pop();
  if (!last) return null;
  const { plantId, prev, wasSeen } = last;
  const { vote, reasons } = state.votes[plantId];
  if (vote === 'like') state.totals.likes -= 1;
  else state.totals.dislikes -= 1;
  for (const r of reasons) {
    state.totals.reasons[r] -= 1;
    if (!state.totals.reasons[r]) delete state.totals.reasons[r];
  }
  if (prev) state.votes[plantId] = prev;
  else delete state.votes[plantId];
  if (!wasSeen) state.seen = state.seen.filter((id) => id !== plantId);
  save();
  return plantId;
}

export function canUndo() {
  return undoStack.length > 0;
}

/** Kasvijoukko vaihtuu (uusi kierros, vyöhyke), joten vanhoja ääniä ei enää kumota. */
export function clearUndo() {
  undoStack.length = 0;
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
  clearUndo();
  state.seen = [];
  save();
}

