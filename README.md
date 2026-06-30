# 🤖 Savu — Discord-botti

Suomalainen Discord-botti nimipäiville, pörssisähkölle, säätiedoille, liikenteelle, osakekursseille ja Trackmania-klubitilastoille. Lähettää automaattisen aamutervehdyksen joka päivä kello 6, graafilla varustettuna.

---

## ✨ Komennot

### 📅 Nimipäivät
| Komento | Kuvaus |
|---|---|
| `/nimipäivät` | Tämän päivän nimipäivät |
| `/nimihaku [nimi]` | Milloin nimen nimipäivä on ja koska se tulee seuraavan kerran |

### ⚡ Sähkö
| Komento | Kuvaus |
|---|---|
| `/sahko` | Yhteenveto + graafi (halvin, keskihinta, kallein) |
| `/sahko matalin` | 5 halvinta tuntia |
| `/sahko kallein` | 5 kalleinta tuntia |
| `/sahko kaikki` | Koko päivän tuntilista + graafi |

### 🌤️ Sää
| Komento | Kuvaus |
|---|---|
| `/saa [kaupunki]` | Lämpötila, tuntuu kuin, tuuli, kosteus, pilvisyys, näkyvyys |

### 🚦 Liikenne
| Komento | Kuvaus |
|---|---|
| `/liikenne` | Tieliikenteen häiriötiedotteet + myöhässä olevat kaukojunat |

### 📈 Osakkeet
| Komento | Kuvaus |
|---|---|
| `/osake [haku]` | Kurssi + graafi. Hae nimellä tai tickerillä (esim. `Nokia`, `AAPL`, `NOKIA.HE`) |
| `/osake [haku] [aikaväli]` | Aikavälit: `1 viikko` · `1 kuukausi` · `3 kuukautta` · `1 vuosi` · `5 vuotta` |

### 🎮 Trackmania
| Komento | Kuvaus |
|---|---|
| `/tm ranking [klubi]` | Top-15 trophy-ranking klubin sisällä |
| `/tm info [klubi]` | Klubin perustiedot: ID, tag, jäsenmäärä, suosiotaso |
| `/tm kampanjat [klubi]` | Kampanjat karttalukuineen ja julkaisupäivineen |
| `/tm huoneet [klubi]` | Serverit, pelaajamäärät ja region |
| `/tm aktiviteetit [klubi]` | Kaikki aktiiviset aktiviteetit tyypeittäin |
| `/tm shorts [klubi]` | Tämän viikon Weekly Shorts -tulokset klubin sisällä, kartoittain |

### 📖 Muut
| Komento | Kuvaus |
|---|---|
| `/help` | Näyttää kaikki komennot |

> Kaikki komennot näkyvät vain komennon lähettäjälle (ephemeral-vastaus). Ainoa julkinen viesti kanavalla on päivittäinen aamutervehdys kello 6.

---

## ⏰ Automaattinen aamuviesti (klo 6:00)

Botti lähettää joka aamu määritettyyn kanavaan viestin joka sisältää:
- Päivän nimipäivät
- Mahdollinen liputuspäivä 🇫🇮
- Syntymäpäivät (jos `syntymapaivat.json` on määritetty)
- Pörssisähkön hinnat loppupäivälle
- 📊 **Graafi koko päivän sähkönhinnoista** (palkkikuvaaja: vihreä = halvin tunti, punainen = kallein, keltainen viiva = nykyinen tunti)

---

## 📋 Vaatimukset

- [Node.js](https://nodejs.org/) v18 tai uudempi
- Discord-botti ja sen token ([Discord Developer Portal](https://discord.com/developers/applications))
- [WeatherAPI](https://www.weatherapi.com/) -avain (ilmainen tili riittää)
- Trackmania service account ([trackmania.com/player/service-account](https://www.trackmania.com/player/service-account))
- Trackmania OAuth-sovellus ([api.trackmania.com](https://api.trackmania.com))

---

## 📦 Asennus

### 1. Kloonaa repositorio

```bash
git clone https://github.com/oma-kayttaja/savu.git
cd savu
```

### 2. Asenna riippuvuudet

```bash
npm install discord.js dotenv axios cheerio node-cron canvas
```

Kaikki paketit eriteltynä:

| Paketti | Käyttötarkoitus |
|---|---|
| `discord.js` | Discord API -kirjasto |
| `dotenv` | Ympäristömuuttujat `.env`-tiedostosta |
| `axios` | HTTP-pyynnöt (sää, liikenne, sähkö, Trackmania) |
| `cheerio` | HTML-parsinta (pörssisähkön scraping) |
| `node-cron` | Ajastettu aamuviesti |
| `canvas` | Sähkö- ja osakegraafit |

> `canvas` vaatii käyttöjärjestelmäriippuvaisia kääntötyökaluja. Jos asennus epäonnistuu Linuxilla, asenna ensin: `sudo apt install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

### 3. Luo `.env`-tiedosto

```env
# Discord
TOKEN=discord_botin_token_tähän
CLIENT_ID=discord_sovelluksen_client_id_tähän
CHANNEL_ID=kanavan_id_tähän_aamuviestiä_varten

# Sää
WEATHER_API_KEY=weatherapi_avain_tähän

# Trackmania — Nadeo service account
TM_LOGIN=service_account_login_tähän
TM_PASSWORD=service_account_password_tähän

# Trackmania — OAuth (pelaajien näyttönimiä varten)
TM_OAUTH_ID=oauth_sovelluksen_identifier_tähän
TM_OAUTH_SECRET=oauth_sovelluksen_secret_tähän
```

**Mistä arvot löytää:**

| Muuttuja | Mistä |
|---|---|
| `TOKEN`, `CLIENT_ID` | [Discord Developer Portal](https://discord.com/developers/applications) → oma sovellus → *Bot* / *General Information* |
| `CHANNEL_ID` | Discordissa: oikealla hiirellä kanavan nimeä → *Kopioi kanavan tunnus* (kehittäjätila päälle asetuksista: *Asetukset → Lisäasetukset → Kehittäjätila*) |
| `WEATHER_API_KEY` | [weatherapi.com](https://www.weatherapi.com/) → rekisteröidy → *API key* |
| `TM_LOGIN`, `TM_PASSWORD` | [trackmania.com/player/service-account](https://www.trackmania.com/player/service-account) → luo service account. **Tallenna salasana heti** — sitä ei voi hakea uudelleen jälkikäteen |
| `TM_OAUTH_ID`, `TM_OAUTH_SECRET` | [api.trackmania.com](https://api.trackmania.com) → kirjaudu Ubisoft-tilillä → luo uusi sovellus (`Confidential = kyllä`, redirect URI esim. `http://localhost`) |

### 4. Lisää JSON-tiedostot

Botti tarvitsee kaksi JSON-tiedostoa samaan kansioon kuin `bot_botti.js`:

**`nimipaivat.json`** — avain on `"KK-PP"`, arvo lista nimistä:
```json
{
  "01-01": ["Uudenvuodenpäivä"],
  "01-02": ["Aaro", "Arnold"],
  "12-24": ["Aatami", "Eeva"]
}
```

**`syntymapaivat.json`** — sama rakenne, arvo lista henkilöiden nimistä:
```json
{
  "03-15": ["Matti"],
  "07-22": ["Liisa", "Pekka"]
}
```

Jos syntymäpäiviä ei halua käyttää, luo tyhjä tiedosto: `{}`

### 5. Käynnistä botti

```bash
node bot_botti.js
```

Konsoliin pitäisi ilmestyä:
```
Slash-komennot rekisteröity.
Kirjautunut: Savu#1234
```

---

## 🔧 Valinnainen: automaattinen käynnistys (pm2)

Pitää botin pystyssä myös palvelimen uudelleenkäynnistyksen jälkeen.

```bash
npm install -g pm2
pm2 start bot_botti.js --name savu
pm2 save
pm2 startup
```

Hyödyllisiä pm2-komentoja:
```bash
pm2 logs savu       # näytä lokit
pm2 restart savu    # käynnistä uudelleen
pm2 stop savu        # pysäytä
```

---

## 📡 Käytetyt ulkoiset lähteet

| Lähde | Mitä varten |
|---|---|
| [porssisahkoa.fi](https://www.porssisahkoa.fi/) | Pörssisähkön tuntihinnat |
| [WeatherAPI](https://www.weatherapi.com/) | Säätiedot |
| [Digitraffic / tie](https://www.digitraffic.fi/) | Tieliikenteen häiriötiedotteet |
| [Digitraffic / rata](https://www.digitraffic.fi/) | Junien myöhästymiset |
| [Yahoo Finance](https://finance.yahoo.com/) | Osakekurssit (huom: hinnat voivat olla viiveellä) |
| [Trackmania Nadeo API](https://webservices.openplanet.dev/) | Klubitiedot, rankings, Weekly Shorts |

---

## 📁 Tiedostorakenne

```
savu/
├── bot_botti.js        # Pääohjelma
├── nimipaivat.json      # Nimipäiväkalenteri
├── syntymapaivat.json   # Syntymäpäivät (valinnainen)
├── .env                 # API-avaimet (EI Githubiin!)
├── .gitignore
└── README.md
```

**`.gitignore`** — sisällöksi vähintään:
```
.env
node_modules/
```

> ⚠️ Älä koskaan lisää `.env`-tiedostoa Githubiin — se sisältää kaikki API-avaimesi ja Trackmania-tunnukset. Jos vahingossa committaat sen, vaihda välittömästi kaikki avaimet/salasanat.

---

## 🐛 Vianetsintä

| Ongelma | Syy / ratkaisu |
|---|---|
| `/sahko` ei vastaa, botti kaatuu | porssisahkoa.fi on muuttanut taulukkonsa rakennetta — tarkista scraper-logiikka |
| `/tm` palauttaa pelkkiä ID:itä nimien sijaan | `TM_OAUTH_ID`/`TM_OAUTH_SECRET` puuttuu tai on väärin |
| `/tm` sanoo "ei jäseniä" | Tarkista konsolista `haeKlubiJasenet`-loki — Nadeo-rajapinnan kentän nimi on saattanut muuttua |
| `400 Bad Request` Digitraffic-kutsuissa | Tarkista että URL-rakenne vastaa nykyistä Digitraffic-dokumentaatiota (rajapinnat päivittyvät ajoittain) |
| Botti ei rekisteröi komentoja | Tarkista että `CLIENT_ID` ja `TOKEN` vastaavat samaa Discord-sovellusta |
