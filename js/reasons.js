// Hylkäyssyiden luettelo ja säännöt, joilla kasville valitaan relevantit syyt.

export const REASONS = {
  too_big: 'Liian suuri',
  too_small: 'Liian pieni',
  needs_shade: 'Hankala kasvupaikka: vaatii varjoa',
  needs_sun: 'Hankala kasvupaikka: vaatii aurinkoa',
  needs_moist: 'Hankala kasvupaikka: vaatii kosteaa maata',
  needs_dry: 'Hankala kasvupaikka: vaatii kuivaa maata',
  not_hardy: 'Ei menesty ilmastossani',
  too_easy: 'Liian tavallinen tai helppo',
  too_hard: 'Liian haastava hoitaa',
  spreads: 'Leviää liikaa',
  short_lived: 'Lyhytikäinen',
  looks: 'En pidä ulkonäöstä',
  color: 'Väri ei miellytä',
  bloom_time: 'Kukinta-aika ei sovi',
};

const GENERIC = ['looks', 'color', 'bloom_time'];

function ruleReasons(p) {
  const ids = [];
  if (p.height[1] >= 100) ids.push('too_big');
  if (p.height[1] <= 30) ids.push('too_small');
  if (!p.light.includes('aurinko')) ids.push('needs_shade');
  if (!p.light.includes('varjo') && !p.light.includes('puolivarjo')) ids.push('needs_sun');
  if (!p.moisture.includes('tuore') && p.moisture.includes('kostea')) ids.push('needs_moist');
  if (!p.moisture.includes('tuore') && p.moisture.includes('kuiva')) ids.push('needs_dry');
  if (p.zoneMax <= 3) ids.push('not_hardy');
  if (p.care === 'helppo') ids.push('too_easy');
  if (p.care === 'vaativa') ids.push('too_hard');
  if (p.spreads) ids.push('spreads');
  return ids;
}

/** Palauttaa kasville näytettävät syyt muodossa [{ id, label }]. */
export function reasonsFor(plant) {
  const extra = plant.reasons?.add ?? [];
  const removed = new Set(plant.reasons?.remove ?? []);
  const list = [...ruleReasons(plant), ...extra, ...GENERIC]
    .filter((r) => r !== 'bloom_time' || plant.bloom)
    .map((r) => (typeof r === 'string' ? { id: r, label: REASONS[r] } : r))
    .filter((r) => r.label && !removed.has(r.id));
  const seen = new Set();
  return list.filter((r) => !seen.has(r.id) && seen.add(r.id));
}

/**
 * Kuinka monta kertaa käyttäjä on hylännyt kasveja syillä, jotka pätevät myös
 * tähän kasviin. Yleiset syyt (ulkonäkö, väri, kukinta-aika) pätevät kaikkiin,
 * joten ne eivät kerro mitään eivätkä vaikuta.
 */
export function penalty(plant, counts) {
  let sum = 0;
  for (const { id } of reasonsFor(plant)) if (!GENERIC.includes(id)) sum += counts[id] ?? 0;
  return sum;
}

/** Syy-id:n näyttöteksti tilastoissa, myös kasvikohtaisille syille. */
export function reasonLabel(id, plants) {
  if (REASONS[id]) return REASONS[id];
  for (const p of plants) {
    const r = p.reasons?.add?.find((a) => typeof a === 'object' && a.id === id);
    if (r) return r.label;
  }
  return id;
}
