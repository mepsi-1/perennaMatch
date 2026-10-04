# Tiedonkeruuohje: pihakasvien lisääminen

Tämä ohje on tarkoitettu agentille (tai ihmiselle), joka laajentaa Perennavalitsimen kasvilistaa. Lue ohje kokonaan ennen kuin aloitat.

## Tehtävä lyhyesti

1. Lisää uudet kasvit tiedostoon `data/plants-source.json`. **Älä muokkaa `data/plants.json`ia käsin**, koska se generoidaan.
2. Aja `node tools/fetch-images.mjs` (Node 18+). Skripti hakee kuvat ja lisenssitiedot ja kirjoittaa `data/plants.json`in.
3. Käy läpi skriptin raportti, korjaa ongelmat (katso [Kuvat](#kuvat)) ja aja skripti uudelleen.
4. Käy läpi [tarkistuslista](#tarkistuslista) ennen kuin ilmoitat työn valmiiksi.

## Mitä kasveja lisätään

- Kaikkia Suomessa myytäviä ja menestyviä **monivuotisia pihakasveja**: perennoja, maanpeitekasveja, pensaita, puita, köynnöksiä, sipulikukkia, koristeheiniä ja saniaisia. Yksivuotisia ja huonekasveja ei lisätä.
- **Älä lisää haitallisia vieraslajeja** (esim. kurtturuusu, komealupiini, kanadanpiisku ja isotuomipihlaja). Tarkista lajin tilanne [vieraslajit.fi](https://vieraslajit.fi)-sivustolta.
- Teemoista (`tags`) kannattaa pitää huolta, että jokaiselle löytyy kattava valikoima kasveja eri tyypeistä.
- Käytä **lajia** (esim. *Paeonia lactiflora*). Lajiketta (esim. 'Sarah Bernhardt') ei käytetä, ellei lajia ole kaupassa käytännössä lainkaan saatavilla.
- Valitse monipuolisesti: kokoja, valo-olosuhteita, kukinta-aikoja ja hoidon vaativuuksia. Tämä on tärkeää, koska hylkäyssyyt johdetaan näistä tiedoista (katso [Hylkäyssyyt](#hylkäyssyyt)).
- Tarkista, ettei kasvi ole jo listalla, myöskään synonyymin nimellä.

## Kenttien skeema

| Kenttä | Tyyppi | Pakollinen | Ohje |
|---|---|---|---|
| `type` | merkkijono | – | Kasvutapa: `"perenna"` (oletus, kun kenttä puuttuu), `"pensas"`, `"lehtipuu"`, `"havupuu"`, `"koynnos"`, `"sipulikukka"`, `"koristeheina"` tai `"saniainen"`. Havupensaat, kuten kataja, ovat tyyppiä `"pensas"`. Tyyppi näkyy kortissa nimen yläpuolella. |
| `tags` | taulukko | – | Teemat: `"perhonen"` (perhos- ja pölyttäjäkasvi), `"kallio"` (kalliopiha ja kuiva paahde), `"syotava"` (syötävät marjat, hedelmät, lehdet tai versot) ja `"maanpeite"` (peittää maan tiiviisti). Maanpeitekasvi on tagi eikä tyyppi, koska maata voi peittää perenna, pensas tai köynnös. Merkitse vain teemat, joihin kasvi selvästi kuuluu. |
| `id` | merkkijono | ✓ | Tieteellinen nimi pienillä kirjaimilla, väliviivat välilyöntien paikalla: `campanula-persicifolia`. Ei saa muuttua myöhemmin, koska käyttäjien tilastot viittaavat siihen. |
| `fi` | merkkijono | ✓ | Vakiintunut suomenkielinen nimi isolla alkukirjaimella (esim. *Kurjenkello*). |
| `sci` | merkkijono | ✓ | Hyväksytty tieteellinen nimi ilman auktoria. Tarkista nimi [POWO:sta](https://powo.science.kew.org/) tai Wikidatasta. Kuvahaku käyttää tätä nimeä. |
| `height` | `[min, max]` | ✓ | Kukkivan kasvin korkeus senttimetreinä (kokonaislukuja), `min ≤ max`. Puille annetaan täysikasvuisen puun korkeus puutarhassa, myös senttimetreinä. Kortti näyttää korkeuden metreinä, kun `max ≥ 200`. |
| `bloom` | `[alku, loppu]` | ✓* | Kukinnan alku- ja loppukuukausi Etelä-Suomessa numeroina 1–12. Lehtikasveille annetaan silti kukinta-aika. *Kenttä jätetään pois, jos kasvi ei kuki (saniaiset) tai kukinta ei ole koristeellinen (esim. koivu, havupuut ja tyrni). Kortissa lukee silloin "Ei kukintaa" tai "Ei koristeellinen", eikä hylkäyssyy `bloom_time` näy. |
| `light` | taulukko | ✓ | Yksi tai useampi arvoista `"aurinko"`, `"puolivarjo"`, `"varjo"`. Merkitse vain olosuhteet, joissa kasvi menestyy **hyvin**, ei niitä, joissa se vain sinnittelee. |
| `moisture` | taulukko | ✓ | Yksi tai useampi arvoista `"kuiva"`, `"tuore"`, `"kostea"`. |
| `zoneMax` | kokonaisluku 1–8 | ✓ | Pohjoisin Suomen kasvuvyöhyke, jolla kasvi menestyy (I = 1 … VIII = 8). |
| `care` | merkkijono | ✓ | `"helppo"`, `"keskitaso"` tai `"vaativa"` (katso alla). |
| `spreads` | boolean | ✓ | `true`, jos kasvi leviää aggressiivisesti juurakoista tai kylväytymällä niin, että sitä joutuu rajoittamaan. |
| `minGarden` | merkkijono | – | Pienin puutarha, johon kasvi sopii: `"parveke"`, `"pieni"` tai `"iso"`. Katso [Puutarhan tyyppi](#puutarhan-tyyppi-mingarden). |
| `desc` | merkkijono | ✓ | 1–2 lausetta suomeksi, korkeintaan noin 200 merkkiä. Katso [Kuvaus](#kuvaus). |
| `reasons` | objekti | – | `{ "add": [...], "remove": [...] }`. Katso [Hylkäyssyyt](#hylkäyssyyt). |
| `imageOverride` | merkkijono | – | Wikimedia Commonsin tiedostonimi ilman `File:`-etuliitettä, jos automaattinen kuvavalinta on huono. |

### Hoidon vaativuus (`care`)

- **helppo**: menestyy tavallisessa puutarhamaassa ilman erityistoimia, talvehtii varmasti ja on pitkäikäinen.
- **keskitaso**: tarvitsee jotain erityistä, esimerkiksi tuennan, säännöllisen jakamisen, talvisuojan vyöhykkeensä pohjoisosassa tai tietyn maalajin.
- **vaativa**: arka talvelle tai märkyydelle, altis taudeille tai vaatii hyvin tarkat kasvuolot.

### Mallimerkintä

```json
{
  "id": "campanula-persicifolia",
  "fi": "Kurjenkello",
  "sci": "Campanula persicifolia",
  "height": [60, 90],
  "bloom": [6, 8],
  "light": ["aurinko", "puolivarjo"],
  "moisture": ["kuiva", "tuore"],
  "zoneMax": 6,
  "care": "helppo",
  "spreads": true,
  "desc": "Kestävä ja vaatimaton kotimainen kello, jonka siniset tai valkoiset kukat nuokkuvat hoikissa varsissa. Kylväytyy herkästi."
}
```

## Lähteet ja niiden käyttö

Hae jokaiselle kasville tiedot **vähintään kahdesta toisistaan riippumattomasta lähteestä**:

- **Suomalaiset lähteet ensisijaisesti** kasvuvyöhykkeille ja kukinta-ajoille, koska ulkomaiset lähteet eivät tunne Suomen vyöhykkeitä. Esimerkkejä: Puutarhaliiton ja Kotipuutarha-lehden kasvitiedot, kotimaisten taimitarhojen tuotekortit, Helsingin yliopiston kasvitieteellinen puutarha ja Luke (FinE-kasvit, jos kasvi kuuluu niihin).
- **Nimet:** POWO tai Wikidata tieteellisen nimen tarkistamiseen. Suomenkielisen nimen voi tarkistaa Lajitietokeskuksesta (laji.fi) tai Wikipediasta.
- **Ristiriitatilanteet:** valitse varovaisempi arvo, eli pienempi `zoneMax` ja vaativampi `care`. Korkeudelle käytä lähteiden yhteistä vaihteluväliä.
- Älä keksi arvoja. Jos tietoa ei löydy luotettavasti, jätä kasvi pois ja mainitse se raportissasi.

Pidä työn aikana muistiinpanoja käyttämistäsi lähteistä ja liitä ne lopulliseen raporttiisi (ei JSON-tiedostoon).

## Kuvaus

- Kirjoita kuvaus **omin sanoin**. Älä kopioi tai lähes kopioi lähteiden tekstiä, koska taimitarhojen ja lehtien tekstit ovat tekijänoikeuden suojaamia.
- Kerro kuvauksessa, mikä tekee kasvista tunnistettavan (kukka, lehdet tai olemus), ja yksi käytännön huomio (esim. "kylväytyy herkästi" tai "tarvitsee tuennan").
- Älä toista kuvauksessa tietoja, jotka näkyvät jo kortin tietopillereissä (korkeus, vyöhyke jne.).

## Hylkäyssyyt

Sovellus valitsee hylkäyssyyt automaattisesti `js/reasons.js`-tiedoston säännöillä:

| Ehto | Syy (id) |
|---|---|
| `height[1] >= 100` | `too_big` – Liian suuri |
| `height[1] <= 30` | `too_small` – Liian pieni |
| `light` ei sisällä aurinkoa | `needs_shade` |
| `light` sisältää vain auringon | `needs_sun` |
| `moisture` sisältää vain kostean | `needs_moist` |
| `moisture` sisältää vain kuivan | `needs_dry` |
| `zoneMax <= 3` | `not_hardy` |
| `care == "helppo"` | `too_easy` |
| `care == "vaativa"` | `too_hard` |
| `spreads == true` | `spreads` |
| aina | `looks`, `color`, `bloom_time` (`bloom_time` vain, jos `bloom` on annettu) |

Käytä `reasons`-kenttää vain, kun kasvilla on **tunnettu, yleinen syy jättää se ostamatta**, jota säännöt eivät kata:

- `"add": ["short_lived"]` lisää valmiin syyn `REASONS`-luettelosta.
- `"add": [{ "id": "slugs", "label": "Etanat syövät lehdet" }]` lisää kasvikohtaisen syyn. Käytä samaa `id`:tä samasta asiasta kaikilla kasveilla, jotta tilastot yhdistyvät (esimerkiksi `slugs`, `short_bloom`, `toxic`, `needs_support`, `fragrance`, `mildew`, `summer_dormant`). Puilla ja pensailla käytössä ovat `shades` (Varjostaa liikaa), `litter` (Roskaa paljon), `allergy` (Siitepöly allergisoi), `pests`, `slow`, `sticky`, `browsing`, `thorns` (Piikit), `needs_pollinator` (Tarvitsee pölyttäjäkaverin) ja `acid_soil` (Vaatii happaman maan).
- `"remove": ["too_easy"]` poistaa säännön tuottaman syyn, jos se olisi harhaanjohtava.

Tavoitteena on 5–7 syytä kasvia kohden. Lisää enintään kaksi kasvikohtaista syytä.

## Kuvat

Skripti `tools/fetch-images.mjs` hakee kuvaa seuraavassa järjestyksessä: `imageOverride` → Wikidatan P18-kuva → Commons-haku → iNaturalist. Se hyväksyy vain lisenssit **CC0, public domain, CC BY ja CC BY-SA**. Ei-kaupalliset (NC) ja muokkauskieltoiset (ND) lisenssit hylätään aina.

Skripti säilyttää jo haetut kuvat. Jos haluat hakea kaikki kuvat uudelleen, käytä valitsinta `--force`.

**Tarkista jokainen uusi kuva avaamalla raportissa näkyvä lähdelinkki.** Automaattinen valinta osuu usein väärin. Esimerkiksi Wikidatan kuva *Hosta sieboldianalle* oli tiedosto nimeltä "Hosta fortunei". Hyvä kuva täyttää seuraavat ehdot:

- Siinä on oikea laji (tiedoston nimi, kuvaus ja kategoria täsmäävät).
- Kasvi on **kukassa** tai, jos kyse on lehtikasvista, edustavimmillaan. Ei siemenkotia, versoja, herbaarionäytteitä eikä piirroksia.
- Kasvi näkyy selvästi koko kuvan alueella, ja kuva toimii pystysuuntaiseen korttiin rajattuna (object-fit: cover).
- Kuvassa ei ole vesileimoja, tekstiä eikä tunnistettavia ihmisiä.

Jos kuva ei kelpaa, etsi parempi Commonsin kategoriasta `Category:<tieteellinen nimi>` ja lisää sen tiedostonimi `imageOverride`-kenttään. Varmista, että lisenssi on sallittu. Skripti ilmoittaa, jos se ei ole.

## Puutarhan tyyppi (`minGarden`)

Sovellus kysyy käyttäjältä puutarhan tyypin (parveke tai terassi, pieni piha, iso piha tai mökki) ja **piilottaa kasvit**, jotka eivät sovi siihen. Mökki käsitellään samoin kuin iso piha. Parvekkeella käyttäjän vyöhykettä tiukennetaan yhdellä (enintään VIII:aan), koska ruukussa kasvi talvehtii huonommin. Esimerkiksi vyöhykkeellä III näytetään vain kasvit, joiden `zoneMax` on vähintään 4.

Jos kentän jättää pois, arvo päätellään seuraavasti:
- perenna → `"pieni"`, eli kasvi ei näy parvekkeen valinneelle
- puu, jonka `height[0] >= 1000` → `"iso"`
- muu puu → `"pieni"`

Merkitse kenttä vain, kun oletus on väärä:
- `"parveke"`: kasvi menestyy ruukussa tai laatikossa ja on siihen kokonsa puolesta järkevä. Ruukussa talvehtiminen on maata arempaa, joten älä merkitse kasvia, joka on vyöhykkeellään rajoilla.
- `"iso"`: perenna tai matala puu, joka leviää tai vie tilaa niin paljon, ettei se sovi pieneen pihaan (esim. vahvasti juurivesoja tekevät lajit).

## Kuntien kasvuvyöhykkeet

Tämä on erillinen tehtävä, jonka voi tehdä kasvien lisäämisestä riippumatta.

Sovellus kysyy alussa käyttäjän kasvuvyöhykkeen ja **piilottaa kasvit**, joiden `zoneMax` on pienempi kuin käyttäjän vyöhyke. Siksi kasvin `zoneMax` vaikuttaa suoraan siihen, mitä käyttäjä näkee. Vyöhykkeen voi selvittää kolmella tavalla: sijainnin perusteella valitaan lähin kunta, käyttäjä hakee kuntansa nimellä tai valitsee vyöhykkeen suoraan. Kunnan vyöhyke on vain ehdotus, jonka käyttäjä voi muuttaa.

**Tiedostot**
- `data/municipality-zones.json` on käsin ylläpidettävä taulukko, jossa avaimena on kunnan suomenkielinen nimi ja arvona vyöhyke numerona 1–8. Muokkaa vain tätä tiedostoa.
- `data/municipalities.json` on generoitu tiedosto (nimet, koordinaatit ja vyöhykkeet). Älä muokkaa sitä käsin.

**Työnkulku**
1. Katso kuntien nimet kirjoitusasuineen tiedostosta `data/municipalities.json` (kenttä `fi`).
2. Lisää tai korjaa vyöhykkeitä tiedostoon `data/municipality-zones.json`. Taulukossa on valmiina 15 esimerkkikuntaa, joiden arvot on tarkistettava samalla tavalla kuin uudet.
3. Aja `node tools/fetch-municipalities.mjs`. Skripti hakee kunnat Wikidatasta, ilmoittaa tuntemattomat kuntien nimet ja virheelliset arvot ja kertoo, monelta kunnalta vyöhyke vielä puuttuu.

**Arvon valinta**
- Merkitse vyöhyke, joka koskee kunnan **asuttua keskusta-aluetta**. Jos kunta ulottuu usealle vyöhykkeelle, valitse se vyöhyke, jolla suurin osa asukkaista asuu. Älä valitse kunnan pinta-alaltaan suurinta vyöhykettä.
- Ensisijainen lähde on Puutarhaliiton kasvuvyöhykekartta. Tarkista arvo toisesta lähteestä, esimerkiksi kunnan, alueen puutarhaseuran tai paikallisen taimitarhan ilmoittamasta vyöhykkeestä.
- Jos et löydä kunnalle luotettavaa tietoa, jätä se pois taulukosta. Sovellus pyytää silloin käyttäjää valitsemaan vyöhykkeen itse. Väärä arvo on pahempi kuin puuttuva.
- Kirjaa raporttiin kunnat, joiden vyöhyke oli epäselvä tai rajalla.

## Tarkistuslista

- [ ] `data/plants-source.json` on validia JSONia: `node -e "JSON.parse(require('fs').readFileSync('data/plants-source.json','utf8'))"`.
- [ ] Jokaisella kasvilla on kaikki pakolliset kentät, ja arvot ovat sallittujen arvojen joukossa.
- [ ] `id`:t ovat yksilöllisiä, eikä olemassa olevia `id`:itä ole muutettu.
- [ ] `node tools/fetch-images.mjs` päättyy riviin "… 0 ilman kuvaa".
- [ ] Jokainen uusi kuva on tarkistettu silmämääräisesti lähdelinkistä.
- [ ] Kuvaukset on kirjoitettu omin sanoin ja ovat alle noin 200 merkkiä.
- [ ] Sovellus toimii paikallisesti (`npx serve .` tai `python -m http.server`), ja uudet kortit näyttävät hyviltä.
- [ ] Raportissa on lueteltu lisätyt kasvit, käytetyt lähteet kasveittain, epävarmat arvot sekä pois jätetyt kasvit perusteluineen.
