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
    const key = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    return data[key] || [];
  } catch {
    return [];
  }
}

/* ------------------ LIPUTUSPÄIVÄT ------------------ */
function getNthWeekdayOfMonth(year, month, weekday, nth) {
  const firstDay = new Date(year, month, 1);
  let offset = weekday - firstDay.getDay();
  if (offset < 0) offset += 7;
  return new Date(year, month, 1 + offset + (nth - 1) * 7);
}

function haeLiputuspaiva(pvm) {
  const year = pvm.getFullYear();
  const key = `${String(pvm.getMonth() + 1).padStart(2, "0")}-${String(
    pvm.getDate()
  ).padStart(2, "0")}`;

  const fixed = {
    "02-05": "Runebergin päivä",
    "02-06": "Saamelaisten kansallispäivä",
    "02-28": "Kalevalan päivä",
    "03-19": "Minna Canthin päivä",
    "04-09": "Agricolan päivä",
    "05-01": "Vappu",
    "05-09": "Eurooppa-päivä",
    "05-12": "Snellmanin päivä",
    "06-04": "Puolustusvoimain päivä",
    "07-06": "Eino Leinon päivä",
    "12-06": "Itsenäisyyspäivä"
  };

  if (fixed[key]) return fixed[key];

  const aitienpaiva = getNthWeekdayOfMonth(year, 4, 0, 2);
  const isanpaiva = getNthWeekdayOfMonth(year, 10, 0, 2);
  const kaatuneet = getNthWeekdayOfMonth(year, 4, 0, 3);

  let juhannus;
  for (let d = 20; d <= 26; d++) {
    const temp = new Date(year, 5, d);
    if (temp.getDay() === 6) juhannus = temp;
  }

  const same = (a, b) =>
    a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth();

  if (same(pvm, aitienpaiva)) return "Äitienpäivä";
  if (same(pvm, isanpaiva)) return "Isänpäivä";
  if (same(pvm, kaatuneet)) return "Kaatuneitten muistopäivä";
  if (same(pvm, juhannus)) return "Juhannus, Suomen lipun päivä";

  return null;
}

/* ------------------ APU ------------------ */
function muotoileNimetPersoonallinen(nimet) {
  if (nimet.length === 0) return "Tänään ei ole nimipäiviä. 😊";
  if (nimet.length === 1) return `🎉 Onnea **${nimet[0]}**! Hyvää nimipäivää! 🎂`;
  return `🎊 Hyvää nimipäivää kaikille: **${nimet.join(", ")}**! 🌸`;
}

/* ------------------ PÖRSSISÄHKÖ ------------------ */
async function haePorssisahkoData() {
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
        const priceStr = cols[1].replace(",", ".").replace("c/kWh", "").trim();
        const price = parseFloat(priceStr);
        if (!isNaN(price)) prices.push({ time, price });
      }
    });

    if (prices.length === 0) return null;

    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const halvin = sorted[0];
    const kallein = sorted[sorted.length - 1];
    const sum = prices.reduce((acc, p) => acc + p.price, 0);
    const avg = sum / prices.length;

    return { halvin, kallein, keski: { price: avg.toFixed(2) }, prices };
  } catch (err) {
    console.error("Sähködata virhe:", err.message);
    return null;
  }
}

/* ------------------ SLASH KOMENNOT ------------------ */
const commands = [
  new SlashCommandBuilder()
    .setName("nimipäivät")
    .setDescription("Näytä päivän nimipäivät ja liputuspäivä"),

  new SlashCommandBuilder()
    .setName("nimipäivähaku")
    .setDescription("Hae nimipäivä nimellä")
    .addStringOption(o =>
      o.setName("nimi").setDescription("Nimi").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("sahko")
    .setDescription("Näyttää pörssisähkön päivän hinnat")
    .addBooleanOption(o =>
      o
        .setName("tunti")
        .setDescription("Näytä tunnin hinnat koko päivälle")
        .setRequired(false)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }))();

/* ------------------ INTERAKTIOT ------------------ */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "nimipäivät") {
    const nyt = new Date();
    const nimet = haeNimipaivat();
    const liputus = haeLiputuspaiva(nyt);

    const embed = new EmbedBuilder()
      .setTitle("🌞 Hyvää huomenta!")
      .setDescription(
        nyt.toLocaleDateString("fi-FI", {
          weekday: "long",
          day: "numeric",
          month: "long"
        })
      )
      .addFields({ name: "🎂 Nimipäivät", value: muotoileNimetPersoonallinen(nimet) })
      .setColor(0xffcc70);

    if (liputus) embed.addFields({ name: "⚑ Liputuspäivä", value: liputus });

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "nimipäivähaku") {
    const haku = interaction.options.getString("nimi").toLowerCase();
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "nimipaivat.json")));
    const loydetyt = [];

    for (const [key, nimet] of Object.entries(data)) {
      if (nimet.some(n => n.toLowerCase() === haku)) {
        const [kk, pp] = key.split("-");
        const date = new Date(2026, kk - 1, pp);
        loydetyt.push(
          date.toLocaleDateString("fi-FI", { day: "numeric", month: "long" })
        );
      }
    }

    const nimiIso = haku.charAt(0).toUpperCase() + haku.slice(1);
    if (loydetyt.length === 0) return interaction.reply(`😕 Nimeä ${nimiIso} ei löytynyt.`);
    if (loydetyt.length === 1) return interaction.reply(`🎉 ${nimiIso} viettää nimipäivää ${loydetyt[0]}.`);
    return interaction.reply(`🎉 ${nimiIso} viettää nimipäivää:\n- ${loydetyt.join("\n- ")}`);
  }

  if (interaction.commandName === "sahko") {
    await interaction.deferReply();
    const data = await haePorssisahkoData();
    if (!data) return interaction.editReply("Sähkön hintatietoja ei saatu haettua.");

    const showHours = interaction.options.getBoolean("tunti");
    if (showHours) {
      const embed = new EmbedBuilder()
        .setTitle("⚡ Pörssisähkön tunnin hinnat")
        .setDescription(
          data.prices.map(p => `${p.time}: ${p.price} c/kWh`).join("\n")
        )
        .setColor(0xffdd00);
      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setTitle("⚡ Pörssisähkön päivän hinnat")
      .addFields(
        { name: "🔻 Halvin", value: `${data.halvin.price} c/kWh (${data.halvin.time})`, inline: true },
        { name: "📊 Keskihinta", value: `${data.keski.price} c/kWh`, inline: true },
        { name: "🔺 Kallein", value: `${data.kallein.price} c/kWh (${data.kallein.time})`, inline: true }
      )
      .setColor(0xffdd00);

    await interaction.editReply({ embeds: [embed] });
  }
});

/* ------------------ CRON: AAMUTERVEHDYS + SÄHKÖ ------------------ */
client.once("ready", () => {
  console.log(`Bot käynnissä: ${client.user.tag}`);

  cron.schedule("0 6 * * *", async () => {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return;

    // Nimipäiväembed
    const nimet = haeNimipaivat();
    const liputus = haeLiputuspaiva(new Date());

    const nimipaivaEmbed = new EmbedBuilder()
      .setTitle("🌞 Huomenta!")
      .addFields({ name: "🎂 Nimipäivät", value: muotoileNimetPersoonallinen(nimet) })
      .setColor(0x4caf50);

    if (liputus) nimipaivaEmbed.addFields({ name: "⚑ Liputuspäivä", value: liputus });

    await channel.send({ embeds: [nimipaivaEmbed] });

    // Pörssisähköembed
    const sahkoData = await haePorssisahkoData();
    if (sahkoData) {
      const sahkoEmbed = new EmbedBuilder()
        .setTitle("⚡ Pörssisähkön päivän hinnat")
        .addFields(
          { name: "🔻 Halvin", value: `${sahkoData.halvin.price} c/kWh (${sahkoData.halvin.time})`, inline: true },
          { name: "📊 Keskihinta", value: `${sahkoData.keski.price} c/kWh`, inline: true },
          { name: "🔺 Kallein", value: `${sahkoData.kallein.price} c/kWh (${sahkoData.kallein.time})`, inline: true }
        )
        .setColor(0xffdd00);

      await channel.send({ embeds: [sahkoEmbed] });
    }
  }, { timezone: "Europe/Helsinki" });
});

client.login(TOKEN);