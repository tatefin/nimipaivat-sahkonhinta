# Nimipäivä- ja Pörssisähkö-botti

Tämä Discord-botti ilmoittaa päivän nimipäivät, liputuspäivät sekä näyttää pörssisähkön päivän hinnat. Viestit lähetetään embedien muodossa ja botilla on myös slash-komennot manuaalista käyttöä varten. Luo botti alkuun Discord develoepr portalissa https://discord.com/developers/home
Projektissa ei ole nimipäiviä listattuna, mutta tilalla on esimerkkitiedosto)


## Toiminta

- Aamuisin klo 06:00 kanavalle:
  - Lähetetään nimipäiväembed (persoonallinen tervehdys)
  - Liputuspäivä, jos kyseessä on sellainen päivä
  - Pörssisähkön päivän hinnat (halvin, keskihinta, kallein)
- Slash-komennot:
  - `/nimipäivät` – näyttää päivän nimipäivät ja liputuspäivän
  - `/nimipäivähaku <nimi>` – etsii nimipäivän yhdelle nimelle
  - `/sahko [tunti]` – näyttää pörssisähkön hinnat, halutessa tunnin tarkkuudella

## Vaatimukset

- Node.js 20+
- npm-paketit:
- nimipaivat.json johon lisätään nimipäivät
- .env tiedosto johon laitetaan bot token, client_id ja channel_id

## Paketit
```bash
npm install discord.js @discordjs/rest @discordjs/builders dotenv node-cron axios cheerio
```

## .env tiedosto
TOKEN=discord-bottisi-token
CLIENT_ID=bottisi-client-id
CHANNEL_ID=kanavan-id-johon-viestit-lähetetään


## Muistutus tekijänoikeuksista!
Helsingin yliopistolla on tekijänoikeus laatimiinsa nimipäiväluetteloihin, joita ovat suomalainen ja suomenruotsalainen nimipäivälista sekä kissojen, koirien ja hevosten nimipäivälistat. Oikeus perustuu tekijänoikeuslain ns. luettelopykälään. Nimipäivien luettelosuoja vahvistettiin korkeimmassa oikeudessa vuonna 2000.
https://almanakka.helsinki.fi/fi/nimipaivat/nimipaivien-tekijanoikeus/
