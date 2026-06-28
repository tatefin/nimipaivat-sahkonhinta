# Discord-botti

Suomalainen Discord-botti joka tarjoaa nimipäivät, pörssisähkön hinnat, säätiedot ja liikenteen häiriöt slash-komennoilla. Lähettää myös automaattisen aamutervehdyksen joka päivä kello 6.

---

## Komennot

| Komento | Kuvaus | Näkyy vain sinulle |
|---|---|---|
| `/nimipäivät` | Näyttää tämän päivän nimipäivät | ✅ |
| `/nimihaku [nimi]` | Hakee milloin nimen nimipäivä on ja koska se on seuraavan kerran | ✅ |
| `/sahko` | Pörssisähkön yhteenveto + graafi (halvin, keskihinta, kallein) | ✅ |
| `/sahko matalin` | 5 halvinta tuntia päivässä | ✅ |
| `/sahko kallein` | 5 kalleinta tuntia päivässä | ✅ |
| `/sahko kaikki` | Koko päivän tuntilista + graafi | ✅ |
| `/saa [kaupunki]` | Säätila: lämpötila, tuuli, kosteus, pilvisyys, näkyvyys | ✅ |
| `/liikenne` | Tieliikenteen häiriötiedotteet + myöhässä olevat kaukojunat | ✅ |

### ⏰ Automaattinen aamuviesti (klo 6:00)

Botti lähettää joka aamu määritettyyn kanavaan viestin joka sisältää:
- Päivän nimipäivät
- Mahdollinen liputuspäivä 🇫🇮
- Syntymäpäivät (jos `syntymapaivat.json` on määritetty)
- Pörssisähkön hinnat loppupäivälle

---

## Vaatimukset

- [Node.js](https://nodejs.org/) v18 tai uudempi
- Discord-botti ja sen token ([Discord Developer Portal](https://discord.com/developers/applications))
- [WeatherAPI](https://www.weatherapi.com/) -avain (ilmainen tili riittää)

---

## Asennus

### 1. Kloonaa repositorio

```bash
git clone https://github.com/oma-kayttaja/botti.git
cd botti
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
| `axios` | HTTP-pyynnöt (sää, liikenne, sähkö) |
| `cheerio` | HTML-parsinta (pörssisähkön scraping) |
| `node-cron` | Ajastettu aamuviesti |
| `canvas` | Sähköhintojen palkkigraafi |

### 3. Luo `.env`-tiedosto

```env
TOKEN=discord_botin_token_tähän
CLIENT_ID=discord_sovelluksen_client_id_tähän
CHANNEL_ID=kanavan_id_tähän_aamurviestiä_varten
WEATHER_API_KEY=weatherapi_avain_tähän
```

**Mistä arvot löytää:**
- `TOKEN` ja `CLIENT_ID` — [Discord Developer Portal](https://discord.com/developers/applications) → oma sovellus → Bot / General Information
- `CHANNEL_ID` — Discordissa: oikealla hiirellä kanavan nimeä → Kopioi kanavan tunnus (kehittäjätila pitää olla päällä asetuksista)
- `WEATHER_API_KEY` — [weatherapi.com](https://www.weatherapi.com/) → rekisteröidy → API key

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
Kirjautunut: botti#1234
```

---

## 🔧 Valinnainen: automaattinen käynnistys (Linux/pm2)

```bash
npm install -g pm2
pm2 start bot_botti.js --name botti
pm2 save
pm2 startup
```

---

## 📡 Käytetyt ulkoiset lähteet

| Lähde | Mitä varten |
|---|---|
| [porssisahkoa.fi](https://www.porssisahkoa.fi/) | Pörssisähkön tuntihinnat |
| [WeatherAPI](https://www.weatherapi.com/) | Säätiedot |
| [Digitraffic / tie](https://www.digitraffic.fi/) | Tieliikenteen häiriötiedotteet |
| [Digitraffic / rata](https://www.digitraffic.fi/) | Junien myöhästymiset |

---

## Tiedostorakenne

```
botti/
├── bot_botti.js        # Pääohjelma
├── nimipaivat.json      # Nimipäiväkalenteri
├── syntymapaivat.json   # Syntymäpäivät (valinnainen)
├── .env                 # API-avaimet (ei Githubiin!)
└── README.md
```

> Muista lisätä `.env` tiedostoon `.gitignore` ettei API-avaimia päädy julkisesti nettiin.
