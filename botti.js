require("dotenv").config();

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const axios = require("axios");
const cheerio = require("cheerio");

const { TOKEN, CLIENT_ID, CHANNEL_ID, WEATHER_API_KEY } = process.env;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DT_HEADERS = { "Digitraffic-User": "discord-bot/tunkki" };

/* --- APU --- */

const tanyKey = () => {
  const d = new Date();
  return `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const lueJSON = (tiedosto) => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, tiedosto))); }
  catch { return {}; }
};

const muotoilePaivaEro = d => d === 0 ? "tänään!" : d === 1 ? "huomenna" : `${d} päivän päästä`;

const muotoileNimet = nimet =>
  !nimet.length ? "Tänään ei ole nimipäiviä. 😊"
  : nimet.length === 1 ? `🎉 Onnea **${nimet[0]}**!`
  : `🎊 Nimipäivät: **${nimet.join(", ")}**`;

const muotoileSynttarit = nimet =>
  nimet.length ? `🎂 Tänään synttärit: ${nimet.join(", ")}!` : null;

const haeNimipaivat = () => lueJSON("nimipaivat.json")[tanyKey()] || [];
const haeSynttarit  = () => lueJSON("syntymapaivat.json")[tanyKey()] || [];

/* --- LIPUTUSPÄIVÄT --- */

function getEaster(year) {
  const f = Math.floor, a = year%19, b = f(year/100), c = year%100,
    d = f(b/4), e = b%4, g = f((8*b+13)/25),
    h = (19*a+b-d-g+15)%30, j = f(c/4), k = c%4,
    m = f((a+11*h)/319), r = (2*e+2*j-k-h+m+32)%7,
    n = f((h-m+r+90)/25), p = (h-m+r+n+19)%32;
  return new Date(year, n-1, p);
}

const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate()+days); return d; };

const getNthWeekday = (year, month, weekday, nth) => {
  const first = new Date(year, month, 1);
  return new Date(year, month, 1 + (7+weekday-first.getDay())%7 + (nth-1)*7);
};

const findSaturday = (year, month, from, to) => {
  for (let d = from; d <= to; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() === 6) return date;
  }
};

function haeLiputuspaiva() {
  const d = new Date(), year = d.getFullYear();
  const isSame = dt => dt && dt.getDate()===d.getDate() && dt.getMonth()===d.getMonth();

  const fixed = {
    "01-06":"Loppiainen","02-05":"Runebergin päivä","02-28":"Kalevalan päivä",
    "03-19":"Minna Canthin päivä","04-09":"Agricolan päivä","04-27":"Veteraanipäivä",
    "05-01":"Vappu","05-09":"Eurooppa-päivä","05-12":"Snellmanin päivä",
    "06-04":"Puolustusvoimat","07-06":"Eino Leinon päivä","10-10":"Aleksis Kiven päivä",
    "10-24":"YK-päivä","11-06":"Ruotsalaisuuden päivä","11-20":"Lapsen oikeudet",
    "12-06":"Itsenäisyyspäivä","12-08":"Sibeliuksen päivä"
  };

  const easter = getEaster(year);
  const liikkuvat = [
    [addDays(easter,-2),"Pitkäperjantai"], [easter,"Pääsiäispäivä"],
    [addDays(easter,39),"Helatorstai"],    [addDays(easter,49),"Helluntai"],
    [getNthWeekday(year,4,0,2),"Äitienpäivä"],
    [getNthWeekday(year,10,0,2),"Isänpäivä"],
    [findSaturday(year,5,20,26),"Juhannuspäivä"],
    [findSaturday(year,9,31,37),"Pyhäinpäivä"],
  ];

  return liikkuvat.find(([dt])=>isSame(dt))?.[1] || fixed[tanyKey()] || null;
}

/* --- SÄHKÖ --- */

function parsePrice(text) {
  return parseFloat(text.replace(",",".").replace(/[^\d.\-−]/g,"").replace("−","-"));
}

async function haePorssisahkoData(onlyFuture = false) {
  try {
    const $ = cheerio.load((await axios.get("https://www.porssisahkoa.fi/")).data);
    const prices = [];
    $("table tbody tr").each((_, el) => {
      const [time, val] = $(el).find("td").map((_,td)=>$(td).text().trim()).get();
      const price = parsePrice(val);
      if (!isNaN(price)) prices.push({ time, price });
    });
    if (!prices.length) return null;
    const filtered = onlyFuture
      ? prices.filter(p => parseInt(p.time) >= new Date().getHours())
      : prices;
    if (!filtered.length) return null;
    const sorted = [...filtered].sort((a,b)=>a.price-b.price);
    return {
      halvin: sorted[0],
      kallein: sorted.at(-1),
      keski: (filtered.reduce((a,b)=>a+b.price,0)/filtered.length).toFixed(2)
    };
  } catch { return null; }
}

/* --- LIIKENNE --- */

async function haeTiehairot() {
  try {
    const { data } = await axios.get(
      "https://tie.digitraffic.fi/api/traffic-message/v1/messages?inactiveHours=0&includeAreaGeometry=false&situationType=TRAFFIC_ANNOUNCEMENT",
      { headers: DT_HEADERS }
    );
    return (data.features || []).slice(0,5).map(f => {
      const ann = f.properties.announcements?.[0];
      return {
        otsikko: ann?.title?.replace(/\.$/,"") || "Häiriö",
        sijainti: ann?.location?.description || "",
        alkoi: ann?.timeAndDuration?.startTime
          ? new Date(ann.timeAndDuration.startTime).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})
          : null
      };
    });
  } catch (err) {
    console.error("haeTiehairot virhe:", err.response?.status, err.message);
    return null;
  }
}

async function haeJunahahairot() {
  try {
    const vastaukset = await Promise.all(
      ["HKI","TPE","TKU","OUL","JY"].map(asema =>
        axios.get(
          `https://rata.digitraffic.fi/api/v1/live-trains/station/${asema}?arrived_trains=0&arriving_trains=10&departed_trains=0&departing_trains=10&include_nonstopping=false&train_categories=Long-distance`,
          { headers: DT_HEADERS }
        ).then(r=>r.data).catch(()=>[])
      )
    );
    const junat = Object.values(
      vastaukset.flat().reduce((acc,t) => { acc[t.trainNumber]=t; return acc; }, {})
    );
    return junat
      .filter(t => t.timeTableRows?.some(r => r.differenceInMinutes > 5))
      .map(t => {
        const worst = t.timeTableRows
          .filter(r => r.differenceInMinutes > 0)
          .sort((a,b) => b.differenceInMinutes-a.differenceInMinutes)[0];
        return { juna:`${t.trainType}${t.trainNumber}`, myohassa:worst?.differenceInMinutes||0, asema:worst?.stationShortCode||"" };
      })
      .sort((a,b) => b.myohassa-a.myohassa)
      .slice(0,5);
  } catch (err) {
    console.error("haeJunahahairot virhe:", err.response?.status, err.message);
    return null;
  }
}

/* --- SÄÄ --- */

async function haeSaa(kaupunki) {
  try {
    const { data } = await axios.get(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(kaupunki+", Finland")}&lang=fi`
    );
    return data;
  } catch { return null; }
}

/* --- KOMENNOT --- */

const commands = [
  new SlashCommandBuilder().setName("nimipäivät").setDescription("Näyttää nimipäivät"),
  new SlashCommandBuilder().setName("nimihaku").setDescription("Hae nimipäivä")
    .addStringOption(o => o.setName("nimi").setDescription("Nimi").setRequired(true)),
  new SlashCommandBuilder().setName("sahko").setDescription("Näyttää sähkön hinnan"),
  new SlashCommandBuilder().setName("saa").setDescription("Näyttää säätilan")
    .addStringOption(o => o.setName("kaupunki").setDescription("Kaupunki").setRequired(true)),
  new SlashCommandBuilder().setName("liikenne").setDescription("Näyttää tie- ja junaliikenteen häiriöt"),
].map(c=>c.toJSON());

(async () => {
  try {
    await new REST({ version:"10" }).setToken(TOKEN).put(Routes.applicationCommands(CLIENT_ID), { body:commands });
    console.log("Slash-komennot rekisteröity.");
  } catch (err) { console.error(err); }
})();

/* --- INTERAKTIOT --- */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;

  if (cmd === "nimipäivät") {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle("📅 Nimipäivät").setDescription(muotoileNimet(haeNimipaivat()))]
    });
  }

  if (cmd === "nimihaku") {
    const nimi = interaction.options.getString("nimi").toLowerCase();
    const data = lueJSON("nimipaivat.json");
    const loydot = Object.entries(data)
      .filter(([,nimet]) => nimet.map(n=>n.toLowerCase()).includes(nimi))
      .map(([pvm]) => pvm);

    if (!loydot.length) return interaction.reply(`Nimelle **${nimi}** ei löytynyt nimipäivää.`);

    const kuukaudet = ["tammikuuta","helmikuuta","maaliskuuta","huhtikuuta","toukokuuta","kesäkuuta",
      "heinäkuuta","elokuuta","syyskuuta","lokakuuta","marraskuuta","joulukuuta"];
    const today = new Date();

    const formatted = loydot.map(p => {
      const [kk,pv] = p.split("-").map(Number);
      return { text:`${pv}. ${kuukaudet[kk-1]}`, date:new Date(today.getFullYear(), kk-1, pv) };
    });

    const next = formatted.reduce((best, f) => {
      let d = new Date(f.date);
      if (d < today) d.setFullYear(d.getFullYear()+1);
      const diff = Math.ceil((d-today)/(864e5));
      return diff < best.diff ? { ...f, diff } : best;
    }, { diff:Infinity });

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle("🔍 Nimipäivähaku")
        .setDescription(`**${nimi}**: ${formatted.map(f=>f.text).join(", ")}`)
        .addFields({ name:"⏭️ Seuraava", value:`${next.text} (${muotoilePaivaEro(next.diff)})` })]
    });
  }

  if (cmd === "sahko") {
    await interaction.deferReply();
    const data = await haePorssisahkoData(false);
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle("⚡ Pörssisähkö").setURL("https://www.porssisahkoa.fi/")
        .addFields(
          { name:"🔻 Halvin", value:`${data.halvin.price} c/kWh\nklo ${data.halvin.time}`, inline:true },
          { name:"⚖️ Keski",  value:`${data.keski} c/kWh`, inline:true },
          { name:"🔺 Kallein",value:`${data.kallein.price} c/kWh\nklo ${data.kallein.time}`, inline:true }
        )]
    });
  }

  if (cmd === "saa") {
    await interaction.deferReply();
    const kaupunki = interaction.options.getString("kaupunki");
    const data = await haeSaa(kaupunki);
    if (!data) return interaction.editReply("Säätietoja ei löytynyt.");
    const c = data.current;
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`🌤️ Sää: ${data.location.name}`)
        .setDescription(c.condition.text)
        .setThumbnail(`https:${c.condition.icon}`)
        .addFields(
          { name:"🌡️ Lämpötila",  value:`${c.temp_c} °C`,                    inline:true },
          { name:"🤔 Tuntuu kuin", value:`${c.feelslike_c} °C`,               inline:true },
          { name:"💨 Tuuli",       value:`${(c.wind_kph/3.6).toFixed(1)} m/s`,inline:true },
          { name:"💧 Kosteus",     value:`${c.humidity}%`,                    inline:true },
          { name:"☁️ Pilvisyys",   value:`${c.cloud}%`,                       inline:true },
          { name:"👀 Näkyvyys",    value:`${c.vis_km} km`,                    inline:true }
        )]
    });
  }

  if (cmd === "liikenne") {
    await interaction.deferReply({ ephemeral:true });
    const [tieData, junaData] = await Promise.all([haeTiehairot(), haeJunahahairot()]);

    const embed = new EmbedBuilder()
      .setTitle("🚦 Liikennetilanne")
      .setURL("https://liikennetilanne.fintraffic.fi/")
      .setColor(0xe8a000);

    if (!tieData)
      embed.addFields({ name:"🚗 Tieliikenne", value:"Tietoja ei saatavilla." });
    else if (!tieData.length)
      embed.addFields({ name:"🚗 Tieliikenne", value:"✅ Ei aktiivisia häiriöitä." });
    else
      embed.addFields({ name:`🚗 Tieliikenne (${tieData.length} häiriötä)`, value:
        tieData.map(h => `• **${h.otsikko}**${h.sijainti?`\n  ${h.sijainti}`:""}${h.alkoi?`\n  🕐 Alkaen ${h.alkoi}`:""}`).join("\n\n")
      });

    if (!junaData)
      embed.addFields({ name:"🚆 Junaliikenne", value:"Tietoja ei saatavilla." });
    else if (!junaData.length)
      embed.addFields({ name:"🚆 Junaliikenne", value:"✅ Ei merkittäviä myöhästymisiä." });
    else
      embed.addFields({ name:`🚆 Junaliikenne (${junaData.length} myöhässä)`, value:
        junaData.map(j=>`• **${j.juna}** — myöhässä **${j.myohassa} min** (${j.asema})`).join("\n")
      });

    embed.setFooter({ text:"Lähde: Digitraffic / Fintraffic" }).setTimestamp();
    return interaction.editReply({ embeds:[embed], ephemeral:true });
  }
});

/* --- CRON --- */

client.once("ready", () => {
  console.log(`Kirjautunut: ${client.user.tag}`);

  cron.schedule("0 6 * * *", async () => {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle(":wave:  Huomenta!")
      .setURL("https://www.porssisahkoa.fi/")
      .setDescription(muotoileNimet(haeNimipaivat()));

    const liputus = haeLiputuspaiva();
    if (liputus) embed.addFields({ name:"🇫🇮 Liputuspäivä", value:liputus });

    const synttarit = muotoileSynttarit(haeSynttarit());
    if (synttarit) embed.addFields({ name:"🎂 Onneksi olkoon", value:synttarit });

    const sahko = await haePorssisahkoData(true);
    if (sahko) embed.addFields({ name:"⚡ Sähkö (tästä hetkestä →)", value:
      `🔻 ${sahko.halvin.price} c/kWh\nklo ${sahko.halvin.time}\n` +
      `⚖️ ${sahko.keski} c/kWh\n` +
      `🔺 ${sahko.kallein.price} c/kWh\nklo ${sahko.kallein.time}`
    });

    await channel.send({ embeds:[embed] });
  }, { timezone:"Europe/Helsinki" });
});

client.login(TOKEN);
