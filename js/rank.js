// Pakan järjestys käyttäjän äänten perusteella. Mitään ei piiloteta:
// sopivimmat kasvit tulevat ensin, loput myöhemmin.

import { reasonsFor, GENERIC } from './reasons.js';

const SEASON = (m) => (m <= 5 ? 'kevät' : m === 6 ? 'alkukesä' : m === 7 ? 'keskikesä' : 'loppukesä');

// Kasvin ominaisuudet vertailtavina merkkijonoina
function features(p) {
  const [, max] = p.height;
  const f = [
    `tyyppi:${p.type ?? 'perenna'}`,
    `hoito:${p.care}`,
    `koko:${max <= 30 ? 'matala' : max <= 100 ? 'keski' : max <= 300 ? 'korkea' : 'iso'}`,
    ...p.light.map((v) => `valo:${v}`),
    ...p.moisture.map((v) => `maa:${v}`),
    ...(p.tags ?? []).map((t) => `tagi:${t}`),
  ];
  if (p.bloom) for (let m = p.bloom[0]; m <= p.bloom[1]; m++) f.push(`kukinta:${SEASON(m)}`);
  return [...new Set(f)];
}

/**
 * Pisteyttää kasvit ääniä vasten. `votes` on stats.js:n { id: { vote, reasons } }.
 * - Tykkäykset: osuus tykätyistä kasveista, joilla on sama ominaisuus,
 *   keskiarvona kasvin ominaisuuksista (0–1).
 * - Hylkäyssyyt: kuinka suuri osa hylkäyksistä tehtiin syillä, jotka pätevät
 *   myös tähän kasviin. Yleiset syyt (ulkonäkö, väri, kukinta-aika) pätevät
 *   kaikkiin, joten ne eivät vaikuta.
 */
export function scorer(votes, plantsById) {
  const liked = {};
  const rejected = {};
  let likes = 0;
  let dislikes = 0;
  for (const [id, { vote, reasons }] of Object.entries(votes)) {
    if (vote === 'like') {
      const p = plantsById.get(id);
      if (!p) continue;
      likes += 1;
      for (const f of features(p)) liked[f] = (liked[f] ?? 0) + 1;
    } else if (reasons.length) {
      dislikes += 1;
      for (const r of reasons) rejected[r] = (rejected[r] ?? 0) + 1;
    }
  }
  return (p) => {
    let like = 0;
    if (likes) {
      const f = features(p);
      like = f.reduce((s, x) => s + (liked[x] ?? 0), 0) / f.length / likes;
    }
    let nope = 0;
    if (dislikes) {
      for (const { id } of reasonsFor(p)) if (!GENERIC.includes(id)) nope += rejected[id] ?? 0;
      nope /= dislikes;
    }
    return like - nope;
  };
}

/**
 * Järjestää jonon parhaasta huonoimpaan. `jitter` on kasvikohtainen satunnaisluku
 * (0–1), joka pidetään samana jonon eliniän ajan, jotta lähes yhtä hyvät kasvit
 * sekoittuvat mutta järjestys ei hypi jokaisella äänellä.
 */
export function rankQueue(queue, votes, plantsById, jitter) {
  const score = scorer(votes, plantsById);
  const s = new Map(queue.map((p) => [p, score(p) + 0.1 * (jitter.get(p) ?? 0)]));
  queue.sort((a, b) => s.get(b) - s.get(a));
}
