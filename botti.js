require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const axios = require("axios");
const cheerio = require("cheerio");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/* ------------------ NIMIPÄIVÄT ------------------ */
function haeNimipaivat() {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "nimipaivat.json"), "utf-8")
    );
    const today = new Date();
    const key = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return data[key] || [];
  } catch {
    return [];
  }
}

/* ------------------ LIPUTUSPÄIVÄT ------------------ */
function haeLiputuspaiva() {
  const liputuspaivat = {
    "02-05": "J. L. Runebergin päivä",
    "02-28": "Kalevalan päivä",
    "03-19": "Minna Canthin päivä",
    "04-09": "Mikael Agricolan päivä",
    "05-01": "Vappu",
    "05-09": "Eurooppa-päivä",
    "06-04": "Puolustusvoimain lippujuhlan päivä",
    "06-20": "Juhannusaatto",
    "12-06": "Itsenäisyyspäivä"
  };

  const today = new Date();
  const key = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return liputuspaivat[key] || null;
}

/* ------------------ APU ------------------ */
function muotoileNimetPersoonallinen(nimet) {
  if (nimet.length === 0) return "Tänään ei ole nimipäiviä. 😊";
  if (nimet.length === 1) return `🎉 Onnea **${nimet[0]}**!`;
  return `🎊 Nimipäivät: **${nimet.join(", ")}**`;
}

/* ------------------ PÖRSSISÄHKÖ ------------------ */
async function haePorssisahkoData(onlyFuture = false) {
  try {
    const res = await axios.get("https://www.porssisahkoa.fi/", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(res.data);
    const prices = [];

    $("table tbody tr").each((i, el) => {
      const cols = $(el).find("td").map((i, td) => $(td).text().trim()).get();
      if (cols.length >= 2) {
        const time = cols[0];
        const price = parseFloat(cols[1].replace(",", ".").replace("c/kWh", ""));
        if (!isNaN(price)) prices.push({ time, price });
      }
    });

    if (!prices.length) return null;

    let filtered = prices;

    if (onlyFuture) {
      const now = new Date();
      const currentHour = now.getHours();

      filtered = prices.filter(p => {
        const hour = parseInt(p.time.split("-")[0]);
        return hour >= currentHour;
      });
    }

    if (!filtered.length) return null;

    const sorted = [...filtered].sort((a, b) => a.price - b.price);
    const halvin = sorted[0];
    const kallein = sorted[sorted.length - 1];
    const avg = (filtered.reduce((a, b) => a + b.price, 0) / filtered.length).toFixed(2);

    return { halvin, kallein, keski: avg, prices: filtered };

  } catch (err) {
    console.error(err.message);
    return null;
  }
}

/* ------------------ KOMENNOT ------------------ */
const commands = [
  new SlashCommandBuilder()
    .setName("nimipäivät")
    .setDescription("Näyttää nimipäivät"),

  new SlashCommandBuilder()
    .setName("nimihaku")
    .setDescription("Hae milloin nimellä on nimipäivä")
    .addStringOption(option =>
      option.setName("nimi")
        .setDescription("Anna nimi")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("sahko")
    .setDescription("Näyttää sähkön hinnan")
    .addIntegerOption(option =>
      option.setName("tunti")
        .setDescription("Anna tunti (0-23)")
        .setRequired(false)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("Slash-komennot rekisteröity");
  } catch (e) {
    console.error(e);
  }
})();

/* ------------------ INTERAKTIOT ------------------ */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "nimipäivät") {
    const nimet = haeNimipaivat();

    const embed = new EmbedBuilder()
      .setTitle("📅 Nimipäivät")
      .setDescription(muotoileNimetPersoonallinen(nimet))
      .setColor(0x00ff99);

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "nimihaku") {
    const nimi = interaction.options.getString("nimi").toLowerCase();

    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(__dirname, "nimipaivat.json"), "utf-8")
      );

      const loydot = [];

      for (const [pvm, nimet] of Object.entries(data)) {
        if (nimet.map(n => n.toLowerCase()).includes(nimi)) {
          loydot.push(pvm);
        }
      }

      if (loydot.length === 0) {
        return interaction.reply(`Nimelle **${nimi}** ei löytynyt nimipäivää.`);
      }

      // muotoilut
      const kuukaudet = [
        "tammikuuta","helmikuuta","maaliskuuta","huhtikuuta","toukokuuta","kesäkuuta",
        "heinäkuuta","elokuuta","syyskuuta","lokakuuta","marraskuuta","joulukuuta"
      ];

      const tanaan = new Date();

      const formatted = loydot.map(p => {
        const [kk, pv] = p.split("-");
        return {
          text: `${parseInt(pv)}. ${kuukaudet[parseInt(kk)-1]}`,
          date: new Date(tanaan.getFullYear(), parseInt(kk)-1, parseInt(pv))
        };
      });

      // etsitään seuraava nimipäivä
      let seuraava = null;
      let minDiff = Infinity;

      formatted.forEach(f => {
        let d = new Date(f.date);
        if (d < tanaan) d.setFullYear(d.getFullYear() + 1);

        const diff = Math.ceil((d - tanaan) / (1000 * 60 * 60 * 24));
        if (diff < minDiff) {
          minDiff = diff;
          seuraava = { ...f, diff };
        }
      });

      const embed = new EmbedBuilder()
        .setTitle("🔍 Nimipäivähaku")
        .setDescription(`**${nimi}** nimipäivät: ${formatted.map(f => f.text).join(", ")}`)
        .addFields({
          name: "⏭️ Seuraava",
          value: `${seuraava.text} (${seuraava.diff} päivän päästä)`
        })
        .setColor(0x3399ff);

      return interaction.reply({ embeds: [embed] });

    } catch (e) {
      console.error(e);
      return interaction.reply("Virhe nimipäivähaussa.");
    }
  }

  if (interaction.commandName === "sahko") {
    await interaction.deferReply();

    const tunti = interaction.options.getInteger("tunti");
    const data = await haePorssisahkoData();
    if (!data) return interaction.editReply("Ei saatu sähkötietoja.");

    // jos haetaan tietty tunti
    if (tunti !== null) {
      const loytyi = data.prices.find(p => {
        const hour = parseInt(p.time.split("-")[0]);
        return hour === tunti;
      });

      if (!loytyi) {
        return interaction.editReply(`Tunnille ${tunti} ei löytynyt hintaa.`);
      }

      const embed = new EmbedBuilder()
        .setTitle("⚡ Sähkön hinta")
        .setDescription(`Klo ${tunti}:00 → **${loytyi.price} c/kWh**`)
        .setColor(0x3399ff);

      return interaction.editReply({ embeds: [embed] });
    }

    // muuten normaali näkymä
    const embed = new EmbedBuilder()
      .setTitle("⚡ Pörssisähkö")
      .addFields(
        { name: "🔻 Halvin", value: `${data.halvin.price} (${data.halvin.time})`, inline: true },
        { name: "Keski", value: `${data.keski}`, inline: true },
        { name: "🔺 Kallein", value: `${data.kallein.price} (${data.kallein.time})`, inline: true }
      );

    if (data.kallein.price > 20) {
      embed.addFields({ name: "⚠️ Varoitus", value: "Sähkö on kallista tänään!" });
    }

    return interaction.editReply({ embeds: [embed] });
  }
});

/* ------------------ CRON ------------------ */
client.once("ready", () => {
  console.log(`Kirjautunut: ${client.user.tag}`);

  cron.schedule("0 6 * * *", async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (!channel) return;

      const nimet = haeNimipaivat();
      const liputus = haeLiputuspaiva();
      const sahko = await haePorssisahkoData(true);

      let vari = 0xffcc00; // oletus

      if (sahko) {
        if (sahko.keski < 10) vari = 0x00ff99; // halpa (vihreä)
        else if (sahko.keski > 20) vari = 0xff3300; // kallis (punainen)
        else vari = 0xffcc00; // normaali (keltainen)
      }

      const embed = new EmbedBuilder()
        .setTitle("🌞 Huomenta!")
        .setColor(vari)
        .setDescription(muotoileNimetPersoonallinen(nimet))
        .setTimestamp();

      if (liputus) {
        embed.addFields({ name: "🇫🇮 Liputuspäivä", value: liputus });
      }

      if (sahko) {
        embed.addFields(
          { name: "🔻 Halvin", value: `${sahko.halvin.price} c/kWh (${sahko.halvin.time})`, inline: true },
          { name: "Keski", value: `${sahko.keski}`, inline: true },
          { name: "🔺 Kallein", value: `${sahko.kallein.price} c/kWh (${sahko.kallein.time})`, inline: true }
        );

        if (sahko.kallein.price > 20) {
          embed.addFields({ name: "⚠️", value: "Sähkö on kallista tänään!" });
        }
      }

      await channel.send({ embeds: [embed] });

    } catch (e) {
      console.error("CRON virhe:", e);
    }
  }, { timezone: "Europe/Helsinki" });
});

client.login(TOKEN);
