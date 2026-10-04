# PerennaMatch

Staattinen HTML5-sovellus, jossa perennoja ja puita pyyhkäistään Tinder-tyyliin. Kun käyttäjä hylkää kasvin, hän voi valita syyn (esim. "liian suuri" tai "vaatii varjoa"). Valinnat kertyvät tilastoiksi selaimen localStorageen.

## Käynnistys paikallisesti

ES-moduulit vaativat HTTP-palvelimen, eli sivua ei voi avata suoraan `file://`-osoitteesta:

```sh
npx serve .
# tai
python -m http.server 8000
```

Pyyhkäisyn lisäksi voit käyttää ✕- ja ♥-nappeja tai nuolinäppäimiä ← ja →.

## Rakenne

| Polku | Sisältö |
|---|---|
| `index.html`, `css/styles.css` | Sivu ja tyylit (vaalea ja tumma teema) |
| `js/app.js` | Näkymät, korttijono ja hylkäyspaneeli |
| `js/card.js` | Kortin ja kuvan tekijätietojen renderöinti |
| `js/swipe.js` | Raahaus ja kortin lennätys |
| `js/reasons.js` | Hylkäyssyyt ja niiden valintasäännöt |
| `js/stats.js` | Tilastot (localStorage-avain `perenna.v1`) |
| `data/plants-source.json` | Käsin ylläpidetty kasvilista |
| `data/plants.json` | Generoitu: kasvilista sekä kuvat ja lisenssitiedot |
| `tools/fetch-images.mjs` | Kuvien haku Wikimedia Commonsista ja iNaturalistista |
| `js/zone.js` | Kasvuvyöhykkeen valinta sijainnin, kunnan tai suoran valinnan perusteella |
| `data/municipality-zones.json` | Käsin ylläpidettävä taulukko kuntien vyöhykkeistä |
| `data/municipalities.json` | Generoitu: kunnat, koordinaatit ja vyöhykkeet |
| `tools/fetch-municipalities.mjs` | Kuntien haku Wikidatasta ja vyöhykkeiden yhdistäminen niihin |
| `docs/TIEDONKERUU.md` | Ohje kasvien ja puiden lisäämiseen |

## Kasvien lisääminen

Katso [docs/TIEDONKERUU.md](docs/TIEDONKERUU.md). Lyhyesti: muokkaa `data/plants-source.json`ia ja aja sitten

```sh
node tools/fetch-images.mjs
```

## Tilastot

Tällä hetkellä kaikki tallennetaan vain käyttäjän omaan selaimeen. Tilastot-näkymästä ne voi viedä JSON-tiedostona. Keskitetty keruu (esim. Supabase) lisätään `js/stats.js`:n `recordVote()`-funktioon, eikä muuta koodia tarvitse muuttaa.

## Julkaisu GitHub Pagesiin

1. Vie repositorio GitHubiin.
2. Valitse *Settings → Pages → Deploy from a branch*, sitten `main` ja `/ (root)`.

## Kuvat

Kuvat ovat Wikimedia Commonsista ja iNaturalistista, ja ne on julkaistu lisensseillä CC0, PD, CC BY tai CC BY-SA. Tekijä ja lisenssi näkyvät jokaisessa kortissa sekä sovelluksen Kuvat-näkymässä.
