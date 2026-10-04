// Hakee jokaiselle data/plants-source.json -kasville kuvan ja lisenssitiedot
// ja kirjoittaa tuloksen data/plants.json -tiedostoon.
//
// Järjestys: imageOverride (Commons) → Wikidata P18 → Commons-haku → iNaturalist.
// Vain lisenssit, joihin riittää tekijä- ja lisenssitiedon näyttäminen, hyväksytään.
//
// Käyttö: node tools/fetch-images.mjs [--force]
//   --force  hae kaikki kuvat uudelleen (oletuksena jo haetut säilytetään)

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'data', 'plants-source.json');
const OUTPUT = join(ROOT, 'data', 'plants.json');
const FORCE = process.argv.includes('--force');

const USER_AGENT = 'Perennasovellus/0.1 (https://github.com/; image attribution fetcher)';
const THUMB_WIDTH = 800;
const DELAY_MS = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, attempt = 1) {
  await sleep(DELAY_MS);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * attempt;
    await sleep(wait);
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sallitut: CC0, public domain, CC BY, CC BY-SA. Ei NC eikä ND.
function isAllowedLicense(code = '') {
  const c = code.toLowerCase().replace(/\s+/g, '-');
  if (/(^|-)nc($|-)/.test(c) || /(^|-)nd($|-)/.test(c)) return false;
  return c === 'cc0' || c.startsWith('cc0') || c.startsWith('pd') || c.includes('public-domain')
    || c.startsWith('cc-by-sa') || c.startsWith('cc-by');
}

// ---------- Wikimedia Commons ----------

async function commonsImageInfo(fileTitle) {
  const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`;
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', titles: title,
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: String(THUMB_WIDTH),
  });
  const data = await getJson(url);
  const page = data.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info) return { error: `tiedostoa ei löydy: ${title}` };
  const meta = info.extmetadata || {};
  const licenseCode = meta.License?.value || meta.LicenseShortName?.value || '';
  if (!isAllowedLicense(licenseCode)) return { error: `lisenssi ei kelpaa (${licenseCode || 'tuntematon'}): ${title}` };
  const artist = stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value);
  if (!artist) return { error: `tekijätieto puuttuu: ${title}` };
  return {
    image: {
      url: info.thumburl || info.url,
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
      artist,
      license: meta.LicenseShortName?.value || licenseCode,
      licenseUrl: meta.LicenseUrl?.value || '',
      source: info.descriptionurl,
      sourceName: 'Wikimedia Commons',
      file: page.title,
    },
  };
}

async function wikidataImage(sci) {
  const query = `SELECT ?image WHERE { ?item wdt:P225 "${sci.replace(/"/g, '')}"; wdt:P18 ?image } LIMIT 1`;
  const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({ query, format: 'json' });
  const data = await getJson(url);
  const value = data.results?.bindings?.[0]?.image?.value;
  if (!value) return null;
  return decodeURIComponent(value.split('/Special:FilePath/')[1]).replace(/_/g, ' ');
}

async function commonsSearch(sci) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', list: 'search',
    srsearch: `${sci} filetype:bitmap`, srnamespace: '6', srlimit: '10',
  });
  const data = await getJson(url);
  return (data.query?.search || []).map((r) => r.title).filter((t) => /\.(jpe?g|png|webp)$/i.test(t));
}

// ---------- iNaturalist ----------

const INAT_LICENSES = {
  'cc0': ['CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  'cc-by': ['CC BY', 'https://creativecommons.org/licenses/by/4.0/'],
  'cc-by-sa': ['CC BY-SA', 'https://creativecommons.org/licenses/by-sa/4.0/'],
};

async function inaturalistImage(sci) {
  const search = await getJson('https://api.inaturalist.org/v1/taxa?' + new URLSearchParams({ q: sci, per_page: '5' }));
  const taxon = (search.results || []).find((t) => t.name?.toLowerCase() === sci.toLowerCase());
  if (!taxon) return { error: `iNaturalist: taksonia ei löydy: ${sci}` };
  const full = await getJson(`https://api.inaturalist.org/v1/taxa/${taxon.id}`);
  const photos = (full.results?.[0]?.taxon_photos || []).map((tp) => tp.photo);
  const photo = photos.find((p) => INAT_LICENSES[p.license_code]);
  if (!photo) return { error: `iNaturalist: ei sallitulla lisenssillä olevaa kuvaa: ${sci}` };
  const [license, licenseUrl] = INAT_LICENSES[photo.license_code];
  return {
    image: {
      url: photo.medium_url || photo.url.replace('square', 'medium'),
      width: photo.original_dimensions?.width,
      height: photo.original_dimensions?.height,
      artist: photo.attribution.replace(/^\(c\)\s*/i, '').replace(/,.*$/, '').trim(),
      license,
      licenseUrl,
      source: `https://www.inaturalist.org/photos/${photo.id}`,
      sourceName: 'iNaturalist',
    },
  };
}

// ---------- Pääohjelma ----------

async function findImage(plant) {
  const problems = [];

  if (plant.imageOverride) {
    const r = await commonsImageInfo(plant.imageOverride);
    if (r.image) return { image: r.image, via: 'imageOverride' };
    problems.push(r.error);
  }

  try {
    const file = await wikidataImage(plant.sci);
    if (file) {
      const r = await commonsImageInfo(file);
      if (r.image) return { image: r.image, via: 'Wikidata P18' };
      problems.push(r.error);
    } else problems.push('Wikidata: ei P18-kuvaa');
  } catch (e) { problems.push(`Wikidata: ${e.message}`); }

  try {
    for (const title of await commonsSearch(plant.sci)) {
      const r = await commonsImageInfo(title);
      if (r.image) return { image: r.image, via: 'Commons-haku', problems };
      problems.push(r.error);
    }
  } catch (e) { problems.push(`Commons-haku: ${e.message}`); }

  try {
    const r = await inaturalistImage(plant.sci);
    if (r.image) return { image: r.image, via: 'iNaturalist', problems };
    problems.push(r.error);
  } catch (e) { problems.push(`iNaturalist: ${e.message}`); }

  return { image: null, problems };
}

async function main() {
  const source = JSON.parse(await readFile(SOURCE, 'utf8'));
  let previous = [];
  try { previous = JSON.parse(await readFile(OUTPUT, 'utf8')); } catch { /* ensimmäinen ajo */ }
  const prevById = new Map(previous.map((p) => [p.id, p]));

  const ids = new Set();
  const out = [];
  const report = [];

  for (const plant of source) {
    if (ids.has(plant.id)) throw new Error(`Toistuva id: ${plant.id}`);
    ids.add(plant.id);

    const prev = prevById.get(plant.id);
    const reusable = !FORCE && prev?.image && prev.sci === plant.sci
      && (prev.imageOverride || null) === (plant.imageOverride || null);
    if (reusable) {
      out.push({ ...plant, image: prev.image });
      report.push(`=  ${plant.id}: säilytetty (${prev.image.sourceName})`);
      continue;
    }

    const { image, via, problems = [] } = await findImage(plant);
    out.push({ ...plant, image });
    if (image) {
      report.push(`✓  ${plant.id}: ${via} – ${image.artist} · ${image.license}\n     ${image.source}`);
    } else {
      report.push(`✗  ${plant.id}: KUVAA EI LÖYTYNYT`);
    }
    for (const p of problems) report.push(`     · ${p}`);
  }

  await writeFile(OUTPUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(report.join('\n'));
  const missing = out.filter((p) => !p.image).length;
  console.log(`\n${out.length} kasvia, ${out.length - missing} kuvalla, ${missing} ilman kuvaa → ${OUTPUT}`);
  if (missing) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
