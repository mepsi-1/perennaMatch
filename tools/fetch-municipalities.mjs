// Hakee Suomen kuntien nimet ja keskipisteiden koordinaatit Wikidatasta, yhdistää
// niihin vyöhykkeet tiedostosta data/municipality-zones.json ja kirjoittaa
// tuloksen data/municipalities.json -tiedostoon.
//
// Käyttö: node tools/fetch-municipalities.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZONES = join(ROOT, 'data', 'municipality-zones.json');
const OUTPUT = join(ROOT, 'data', 'municipalities.json');

const USER_AGENT = 'PerennaMatch/0.1 (municipality fetcher)';

// Q856076 = Suomen kunta; lakkautetuilla kunnilla on P576 (lakkautuspäivä)
const QUERY = `
SELECT ?m ?fi ?sv ?coord WHERE {
  ?m wdt:P31 wd:Q856076; wdt:P625 ?coord.
  FILTER NOT EXISTS { ?m wdt:P576 ?end }
  ?m rdfs:label ?fi FILTER(LANG(?fi) = "fi")
  OPTIONAL { ?m rdfs:label ?sv FILTER(LANG(?sv) = "sv") }
}`;

async function main() {
  const zones = JSON.parse(await readFile(ZONES, 'utf8'));

  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ query: QUERY }),
  });
  if (!res.ok) throw new Error(`Wikidata: HTTP ${res.status}`);
  const rows = (await res.json()).results.bindings;

  const byName = new Map();
  for (const r of rows) {
    const fi = r.fi.value;
    if (byName.has(fi)) continue;  // sama kunta voi tulla useana rivinä
    const [lon, lat] = r.coord.value.match(/-?\d+(\.\d+)?/g).map(Number);
    const zone = zones[fi];
    byName.set(fi, {
      fi,
      ...(r.sv && r.sv.value !== fi ? { sv: r.sv.value } : {}),
      lat: Math.round(lat * 1000) / 1000,
      lon: Math.round(lon * 1000) / 1000,
      zone: Number.isInteger(zone) && zone >= 1 && zone <= 8 ? zone : null,
    });
  }

  const list = [...byName.values()].sort((a, b) => a.fi.localeCompare(b.fi, 'fi'));
  // Yksi kunta per rivi: tiivis mutta diffattava
  await writeFile(OUTPUT, '[\n' + list.map((m) => JSON.stringify(m)).join(',\n') + '\n]\n', 'utf8');

  const unknown = Object.keys(zones).filter((k) => !k.startsWith('_') && !byName.has(k));
  const invalid = Object.entries(zones).filter(([k, z]) => !k.startsWith('_') && byName.has(k) && byName.get(k).zone === null);
  const missing = list.filter((m) => m.zone === null).length;

  for (const k of unknown) console.log(`✗  vyöhyketiedostossa tuntematon kunta: ${k}`);
  for (const [k, z] of invalid) console.log(`✗  virheellinen vyöhyke ${JSON.stringify(z)}: ${k} (sallitut 1–8)`);
  console.log(`${list.length} kuntaa, ${list.length - missing} vyöhykkeellä, ${missing} ilman vyöhykettä → ${OUTPUT}`);
  if (unknown.length || invalid.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
