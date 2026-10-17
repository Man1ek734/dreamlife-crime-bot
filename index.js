require('dotenv').config();
const {
  ActionRowBuilder,
  AuditLogEvent,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageType,
  Partials,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');

const ping = require('./commands/ping');
const warn = require('./commands/warn');
const dodajgang = require('./commands/dodajgang');
const dodajorganizacje = require('./commands/dodajorganizacje');
const usungang = require('./commands/usungang');
const usunorganizacje = require('./commands/usunorganizacje');
const zawieszenie = require('./commands/zawieszenie');
const nadajrange = require('./commands/nadajrange');
const changlog = require('./commands/changlog');
const listagangow = require('./commands/listagangow');
const listaorganizacji = require('./commands/listaorganizacji');
const kolorgang = require('./commands/kolorgang');
const kolororganizacje = require('./commands/kolororganizacje');
const kolory = require('./commands/kolory');
const dodajticket = require('./commands/dodajticket');

const WELCOME_CHANNEL_ID = '1437087479089074303';
const TICKET_PANEL_CHANNEL_ID = '1519136441563611346';
const BOT_LOG_CHANNEL_ID = '1437087481542479904';
const GUILD_ID = '1437087475704266928';
const REACTION_ROLE_CHANNEL_ID = '1553474554125361262';
const AUTO_ROLE_ID = '1437087476111114370';
const APPEAL_INFO_CHANNEL_ID = '1437087480364011732';
const APPEAL_TICKET_CHANNEL_ID = '1519136441563611346';
const ORG_PENALTIES_CHANNEL_ID = '1519105017309696153';
const STARTER_PACK_CHANNEL_ID = '1536012375314927666';
const STARTER_PACK_ROLE_ID = '1437087476111114370';
const GANG_STARTER_PACK_CHANNEL_ID = '1536012429866049606';
const ORG_COLORS_CHANNEL_ID = '1524480689154691152';
const GANG_COLORS_CHANNEL_ID = '1526702996690440292';
const ORGANIZACJA_PARENT_ROLE_ID = '1437206381856948334';
const CRIME_RULES_CHANNEL_ID = '1437087479411769545';
const REACTION_ROLE_MAP = {
  // czerwona ikonka -> Organizacja Team
  '1553529685110034615': '1437087476140216331',

  // szara ikonka -> Gang Team
  '1553529625898909696': '1517919913543467008',
};

let reactionRoleMessageId = null;

const TICKET_OPTIONS = {
  zarzad: {
    label: 'Sprawa do zarządu',
    description: 'Masz problem lub sprawę, pisz',
    emoji: '🌐',
  },
  opiekunowie: {
    label: 'Sprawa do opiekunów Crime',
    description: 'Opiekunowie Crime',
    emoji: '📩',
  },
  pytanie: {
    label: 'Pytanie',
    description: 'Zadaj pytanie',
    emoji: '📜',
  },
  warn: {
    label: 'Odwołania',
    description: 'Odwołania',
    emoji: '📞',
  },
  zamowienia: {
    label: 'Zamówienia (IC)',
    description: 'Zamów sprzęt',
    emoji: '💼',
  },
  fckck: {
    label: 'Podanie na FCK/CK',
    description: 'Podanie na FCK/CK',
    emoji: '☠️',
  },
  mafia: {
    label: 'Kontakt z Mafia (IC)',
    description: 'Kontakt z Mafia (IC)',
    emoji: '✉️',
  },
  starterpack: {
    label: 'Odbierz starterpack',
    description: 'Odbierz starterpack',
    emoji: '🎁',
  },
  cartel: {
    label: 'Kontakt z Cartelem (IC)',
    description: 'Kontakt z Cartelem (IC)',
    emoji: '📨',
  },
  cartel_orders: {
    label: 'Zamówienia do Cartelu (IC)',
    description: 'Zamówienia do Cartelu (IC)',
    emoji: '📦',
  },
  mafia_orders: {
    label: 'Zamówienia do Mafii (IC)',
    description: 'Zamówienia do Mafii (IC)',
    emoji: '💼',
  },
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

client.commands = new Collection();
client.commands.set(ping.data.name, ping);
client.commands.set(warn.data.name, warn);
client.commands.set(dodajgang.data.name, dodajgang);
client.commands.set(dodajorganizacje.data.name, dodajorganizacje);
client.commands.set(usungang.data.name, usungang);
client.commands.set(usunorganizacje.data.name, usunorganizacje);
client.commands.set(zawieszenie.data.name, zawieszenie);
client.commands.set(nadajrange.data.name, nadajrange);
client.commands.set(changlog.data.name, changlog);
client.commands.set(listagangow.data.name, listagangow);
client.commands.set(listaorganizacji.data.name, listaorganizacji);
client.commands.set(kolorgang.data.name, kolorgang);
client.commands.set(kolororganizacje.data.name, kolororganizacje);
client.commands.set(dodajticket.data.name, dodajticket);

const messageCache = new Map();

async function sendBotLog(guild, embed, files = []) {
  try {
    const logChannel =
      guild.channels.cache.get(BOT_LOG_CHANNEL_ID) ||
      await guild.channels.fetch(BOT_LOG_CHANNEL_ID).catch(() => null);

    if (!logChannel || !logChannel.isTextBased()) return;
    await logChannel.send({ embeds: [embed], files });
  } catch (error) {
    console.error('Błąd wysyłania logu:', error);
  }
}

async function createTicketTranscript(channel) {
  const allMessages = [];
  let before;

  while (true) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (batch.size === 0) break;

    allMessages.push(...batch.values());
    before = batch.last().id;

    if (batch.size < 100) break;
  }

  allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = [
    'Transcript ticketa: #' + channel.name,
    'ID kanału: ' + channel.id,
    'Data wygenerowania: ' + new Date().toLocaleString('pl-PL'),
    '',
    '============================================================',
    '',
  ];

  for (const message of allMessages) {
    const timestamp = new Date(message.createdTimestamp).toLocaleString('pl-PL');
    const author = message.author ? message.author.tag : 'Nieznany użytkownik';
    const content = message.content?.trim() || '[brak treści tekstowej]';

    lines.push('[' + timestamp + '] ' + author + ' (' + (message.author?.id || 'brak ID') + ')');
    lines.push(content);

    for (const attachment of message.attachments.values()) {
      lines.push('Załącznik: ' + attachment.url);
    }

    if (message.embeds.length > 0) {
      for (const embed of message.embeds) {
        if (embed.title) lines.push('Embed — tytuł: ' + embed.title);
        if (embed.description) lines.push('Embed — treść: ' + embed.description);
      }
    }

    lines.push('');
  }

  const safeName = channel.name.replace(/[^a-zA-Z0-9-_]/g, '-');
  return new AttachmentBuilder(
    Buffer.from(lines.join('\n'), 'utf8'),
    { name: 'transcript-' + safeName + '.txt' }
  );
}

async function getAuditExecutor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const now = Date.now();

    const entry = logs.entries.find(item => {
      const sameTarget = !targetId || item.target?.id === targetId;
      const recent = now - item.createdTimestamp < 8000;
      return sameTarget && recent;
    });

    return entry?.executor ?? null;
  } catch {
    return null;
  }
}

function trimLogText(text, fallback = '*brak treści*') {
  if (!text) return fallback;
  return text.length > 900 ? `${text.slice(0, 897)}...` : text;
}

async function ensureAutoRoleForExistingMembers(guild) {
  try {
    const members = await guild.members.fetch();
    let added = 0;

    for (const member of members.values()) {
      if (member.user.bot) continue;
      if (member.roles.cache.has(AUTO_ROLE_ID)) continue;

      try {
        await member.roles.add(AUTO_ROLE_ID, 'Automatyczne nadanie rangi Przyszły Gangster wszystkim członkom');
        added++;
      } catch (error) {
        console.error(`Nie udało się nadać auto-rangi użytkownikowi ${member.user.tag}:`, error);
      }
    }

    console.log(`Auto-ranga Przyszły Gangster: nadano ${added} osobom.`);
  } catch (error) {
    console.error('Nie udało się nadać auto-rangi obecnym członkom:', error);
  }
}



function buildReactionRolePanel() {
  return new EmbedBuilder()
    .setTitle('<:org:1553529625898909696> Crime DreamLife Roleplay')
    .setDescription(
      '**ODBIÓR RANGI**\n\n' +
      'Zaznaczcie w jakim teamie jesteście abyśmy mogli pingować was po teamach a nie everyone.\n\n' +
      '<:org:1553529625898909696> - Organizacja Team, <:gang:1553529685110034615> - Gang Team'
    )
    .setColor(0x2b2d31)
    .setFooter({ text: 'DreamLife RolePlay © 2026' });
}

async function ensureReactionRolePanel() {
  try {
    const channel = await client.channels.fetch(REACTION_ROLE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const panels = [...messages.values()].filter(
      message =>
        message.author.id === client.user.id &&
        message.embeds.some(embed => embed.title === '<:org:1553529625898909696> Crime DreamLife Roleplay')
    );

    let panel = panels[0] || null;

    for (const duplicate of panels.slice(1)) {
      await duplicate.delete().catch(() => {});
    }

    if (panel) {
      await panel.edit({ embeds: [buildReactionRolePanel()] });
    } else {
      panel = await channel.send({ embeds: [buildReactionRolePanel()] });
    }

    reactionRoleMessageId = panel.id;

    const oldGunReaction = panel.reactions.cache.get('🔫');
    if (oldGunReaction) await oldGunReaction.remove().catch(() => {});

    const oldKnifeReaction = panel.reactions.cache.get('🔪');
    if (oldKnifeReaction) await oldKnifeReaction.remove().catch(() => {});

    if (!panel.reactions.cache.has('1553529625898909696')) {
      await panel.react('1553529625898909696');
    }
    if (!panel.reactions.cache.has('1553529685110034615')) {
      await panel.react('1553529685110034615');
    }

    console.log('Panel reaction roles jest gotowy.');
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu reaction roles:', error);
  }
}

function getTicketChannelBaseName(selected, ticketType) {
  const customNames = {
    zarzad: 'sprawa-do-zarzadu',
    opiekunowie: 'sprawa-do-opiekunow-crime',
    pytanie: 'pytanie',
    warn: 'odwolania',
    zamowienia: 'zamowienia',
    fckck: 'podanie-fck-ck',
    mafia: 'kontakt-z-mafia',
    starterpack: 'odbierz-starterpack',
    cartel: 'kontakt-z-cartelem',
    cartel_orders: 'zamowienia-do-cartelu',
    mafia_orders: 'zamowienia-do-mafii',
  };

  if (customNames[selected]) return customNames[selected];

  return ticketType.label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(ic\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'ticket';
}

function getNextTicketNumber(guild, baseName) {
  let maxNumber = 0;
  const prefix = baseName + '-';

  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildText) continue;
    if (!channel.name.startsWith(prefix)) continue;

    const suffix = channel.name.slice(prefix.length);
    const number = Number.parseInt(suffix, 10);

    if (Number.isFinite(number) && number > maxNumber) {
      maxNumber = number;
    }
  }

  return maxNumber + 1;
}

function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle('Tickety — DreamLifeRP Crime')
    .setDescription(
      'Wybierz kategorię poniżej, aby utworzyć prywatny ticket.\n' +
      'Po wybraniu odpowiedniej opcji bot utworzy dla Ciebie osobny kanał.'
    )
    .setColor(0x2b2d31)
    .setFooter({ text: 'DreamLife RolePlay © 2026' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('Wybierz opcję')
    .addOptions(
      Object.entries(TICKET_OPTIONS).map(([value, option]) => ({
        label: option.label,
        description: option.description,
        value,
        emoji: option.emoji,
      }))
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

async function ensureStarterPackPanel() {
  try {
    const channel = await client.channels.fetch(STARTER_PACK_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const title = '🎁 Starter Pack dla Organizacji';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        '**Pakiet startowy dla nowych organizacji:**\n\n' +
        '🚙 **x1 SUV**\n' +
        '🚗 **x1 Sedan**\n' +
        '💵 **25 000$**\n' +
        '🔫 **x3 Pistolety** *(do wyboru)*\n' +
        '📦 **x150 Amunicji**\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '**📩 ODBIÓR STARTER PACKA**\n' +
        'Aby odebrać Starter Pack, otwórz ticket na kanale <#1519136441563611346>.'
      )
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' });

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const oldPanels = messages
      ? [...messages.values()].filter(message =>
          message.author.id === client.user.id &&
          message.embeds.some(embed => embed.title === title)
        )
      : [];

    for (const oldPanel of oldPanels) {
      await oldPanel.delete().catch(() => {});
    }

    const payload = {
      content: '',
      embeds: [embed],
      allowedMentions: { parse: [] },
    };

    await channel.send(payload);
    console.log('Panel Starter Pack dla organizacji wysłany ponownie bez duplikatów.');
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu Starter Pack:', error);
  }
}

async function ensureGangStarterPackPanel() {
  try {
    const channel = await client.channels.fetch(GANG_STARTER_PACK_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const title = '🎁 Starter Pack Gangu';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        '**Pakiet startowy dla nowych gangów:**\n\n' +
        '🚘 **x1 LowRider**\n' +
        '🏍️ **x1 Motocykl**\n' +
        '💵 **20 000$**\n' +
        '🗡️ **x5 Broni białej** *(do wyboru)*\n' +
        '🔫 **x1 Pistolet** *(do wyboru)*\n' +
        '📦 **x50 Amunicji**\n' +
        '🎨 **x10 Spray**\n' +
        '🧽 **x10 Zmywaczy do Sprayu**\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '**📩 ODBIÓR STARTER PACKA**\n' +
        'Aby odebrać Starter Pack, otwórz ticket na kanale <#1519136441563611346>.'
      )
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' });

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const oldPanels = messages
      ? [...messages.values()].filter(message =>
          message.author.id === client.user.id &&
          message.embeds.some(embed => embed.title === title)
        )
      : [];

    for (const oldPanel of oldPanels) {
      await oldPanel.delete().catch(() => {});
    }

    const payload = {
      content: '',
      embeds: [embed],
      allowedMentions: { parse: [] },
    };

    await channel.send(payload);
    console.log('Panel Starter Pack Gangu wysłany ponownie bez duplikatów.');
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu Starter Pack Gangu:', error);
  }
}

async function ensureOrganizationColorsPanel() {
  try {
    const channel = await client.channels.fetch(ORG_COLORS_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const title = '🎨 Kolory Organizacji';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        '**Przypisane kolory organizacji:**\n\n' +
        '🟧 **Rose Dominion** — Pomarańczowy\n' +
        '└ HEX: `#FB8C00`\n\n' +
        '🩵 **Arizona** — Jasnoniebieski\n' +
        '└ HEX: `#64B5F6`\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '*Każda organizacja posiada swój indywidualny kolor.*'
      )
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' });

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const oldPanel = messages?.find(message =>
      message.author.id === client.user.id &&
      message.embeds.some(embed => embed.title === title)
    );

    if (oldPanel) {
      await oldPanel.delete().catch(() => {});
    }

    await channel.send({ embeds: [embed] });
    console.log('Panel kolorów organizacji został wysłany.');
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu kolorów organizacji:', error);
  }
}

async function ensureGangColorsPanel() {
  try {
    const channel = await client.channels.fetch(GANG_COLORS_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const title = '🎨 Kolory Gangów';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        '**Przypisane kolory gangów:**\n\n' +
        '🩶 **MS-13** — Jasnoszary\n' +
        '└ HEX: `#BDBDBD`\n\n' +
        '🔵 **Varrios Los Aztecas** — Granatowy\n' +
        '└ HEX: `#1A237E`\n\n' +
        '🔴 **Rollin 20s Bloods** — Czerwony\n' +
        '└ HEX: `#E53935`\n\n' +
        '🟣 **Ballas** — Fioletowy\n' +
        '└ HEX: `#8E24AA`\n\n' +
        '🟢 **The Famillies** — Zielony\n' +
        '└ HEX: `#43A047`\n\n' +
        '⚫ **The Lost MC** — Ciemny szary\n' +
        '└ HEX: `#424242`\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '*Każdy gang posiada swój indywidualny kolor.*'
      )
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' });

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const oldPanel = messages?.find(message =>
      message.author.id === client.user.id &&
      message.embeds.some(embed => embed.title === title)
    );

    if (oldPanel) {
      await oldPanel.delete().catch(() => {});
    }

    await channel.send({ embeds: [embed] });
    console.log('Panel kolorów gangów został wysłany.');
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu kolorów gangów:', error);
  }
}

async function ensureCrimeRulesPanel() {
  try {
    const channel = await client.channels.fetch(CRIME_RULES_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const oldPanels = messages
      ? [...messages.values()].filter(message =>
          message.author.id === client.user.id &&
          message.embeds.some(embed =>
            embed.title?.includes('REGULAMIN CRIME') ||
            embed.title?.includes('SŁOWNIK') ||
            embed.title === 'POSTANOWIENIE KOŃCOWE' ||
            embed.description?.includes('# REGULAMIN CRIME') ||
            embed.description?.includes('## §1. POSTANOWIENIA OGÓLNE')
          )
        )
      : [];

    for (const oldPanel of oldPanels) {
      await oldPanel.delete().catch(() => {});
    }

    const sections = [
      `# REGULAMIN CRIME
### DreamLife RolePlay

**WAŻNE INFORMACJE**

Niniejszy regulamin obowiązuje wszystkich graczy prowadzących działalność przestępczą na serwerze **DreamLife RolePlay**.

Nieznajomość regulaminu nie zwalnia z obowiązku jego przestrzegania. Każdy gracz zobowiązany jest również do przestrzegania Regulaminu Głównego serwera.

Opiekun Crime rozpatruje naruszenia indywidualnie, uwzględniając dostępne dowody, przebieg akcji oraz kontekst fabularny.`,

      `## §1. POSTANOWIENIA OGÓLNE

**1.1.** Każda akcja przestępcza musi posiadać logiczne uzasadnienie fabularne (IC) oraz być zgodna z charakterem odgrywanej postaci.

**1.2.** Zabrania się Metagamingu, Powergamingu, FailRP oraz nieprzestrzegania zasad FearRP.

**1.3.** Każdy gracz zobowiązany jest do poszanowania życia i zdrowia swojej postaci oraz realistycznego reagowania na zagrożenie.

**1.4.** Zabrania się bezpodstawnego prowokowania służb porządkowych i innych graczy wyłącznie w celu wywołania pościgu lub strzelaniny.

**1.5.** Każdy uczestnik akcji zobowiązany jest do umożliwienia drugiej stronie odpowiedniej interakcji RP.

**1.6.** Zabrania się celowego wykorzystywania mechanik serwera w sposób sprzeczny z ich przeznaczeniem.

**1.7.** Zabrania się prowadzenia działalności Crime podczas noszenia stroju roboczego z legalnej pracy.

**1.8.** Administracja ma prawo przerwać akcję w przypadku rażącego naruszenia regulaminu lub wystąpienia poważnych problemów technicznych.`,

      `## §2. ORGANIZACJE PRZESTĘPCZE

**2.1.** Utworzenie oficjalnej organizacji przestępczej wymaga akceptacji Opiekuna Crime.

**2.2.** Lider organizacji odpowiada za jej funkcjonowanie, przestrzeganie regulaminu przez członków oraz utrzymywanie odpowiedniego poziomu RP.

**2.3.** Każda organizacja powinna posiadać określony charakter działalności, strukturę oraz własną historię fabularną.

**2.4.** Konflikty pomiędzy organizacjami muszą wynikać z wydarzeń IC i posiadać uzasadnienie fabularne.

**2.5.** Zabrania się rozpoczynania wojen organizacyjnych wyłącznie w celu zdobywania broni, pieniędzy lub wyposażenia przeciwników.

**2.6.** Organizacje mogą zawierać sojusze i prowadzić wspólne interesy, pod warunkiem przestrzegania zasad serwera.

**2.7.** Zabrania się wykorzystywania nowych graczy wyłącznie jako uczestników walk bez zapewnienia im możliwości rozwijania własnego RP.

**2.8.** Podszywanie się pod inną organizację wymaga odpowiedniego uzasadnienia IC i nie może służyć obchodzeniu regulaminu.

**2.9.** Organizacje zobowiązane są do rozwijania swojej historii poprzez różnorodne działania RP, a nie wyłącznie napady i strzelaniny.

**2.10.** Organizacje niezatwierdzone przez Opiekuna Crime mogą uczestniczyć w akcjach hostylnych w maksymalnie 5 osób.`,

      `## §3. NAPADY I RABUNKI

**3.1.** Każdy napad musi zostać przeprowadzony w sposób realistyczny, z wykorzystaniem odpowiednich mechanik serwera.

**3.2.** Zabrania się organizowania napadów wyłącznie w celu sprowokowania strzelaniny z policją.

**3.3.** Żądania przedstawiane podczas negocjacji muszą być realistyczne, adekwatne do sytuacji oraz możliwe do spełnienia.

**3.4.** Zabrania się wykorzystywania podstawionych zakładników, którzy dobrowolnie uczestniczą w napadzie w celu uzyskania korzyści negocjacyjnych.

**3.5.** Zabrania się bezpodstawnego zabijania zakładników. Każde użycie przemocy musi wynikać z przebiegu sytuacji RP.

**3.6.** Obie strony mają obowiązek prowadzenia negocjacji w sposób umożliwiający rozwój akcji RP.

**3.7.** Ustalenia negocjacyjne powinny być respektowane przez obie strony, chyba że dalszy przebieg sytuacji IC uzasadnia ich zmianę.

**3.8.** Zabrania się rozpoczynania kolejnego napadu wyłącznie w celu kontynuowania zakończonej strzelaniny.

**3.9.** Podczas napadów obowiązują limity uczestników określone w §10.`,

      `## §4. PORWANIA I ZAKŁADNICY

**4.1.** Każde porwanie musi posiadać konkretny cel fabularny oraz odpowiednie uzasadnienie IC.

**4.2.** Zabrania się porywania graczy wyłącznie dla zabawy, utrudniania rozgrywki lub bez uzasadnionego powodu.

**4.3.** Zabrania się porywania osób na terenie miasta bez odpowiedniego podłoża RP.

**4.4.** Zabrania się wielokrotnego porywania tej samej osoby w krótkim czasie bez odpowiedniej kontynuacji fabularnej.

**4.5.** Osoba porwana zobowiązana jest do przestrzegania zasad FearRP i realistycznego odgrywania zagrożenia.

**4.6.** Porywający zobowiązani są do aktywnego prowadzenia akcji RP. Zabrania się bezcelowego przetrzymywania gracza przez nadmiernie długi czas.

**4.7.** Zabrania się wymuszania informacji, których postać nie posiada lub które zostały uzyskane w sposób OOC.

**4.8.** Zabrania się porywania funkcjonariuszy LSPD/LSSD do akcji hostylnej, jeżeli na służbie znajduje się mniej niż 5 funkcjonariuszy. Wyjątkiem jest sytuacja, w której funkcjonariusze sami rozpoczną inicjację.

**4.9.** Zabrania się porywania pracowników EMS, jeżeli na służbie znajduje się mniej niż 5 medyków. Wyjątkiem jest sytuacja, w której sami rozpoczną inicjację.

**4.10.** Zabrania się porywania funkcjonariuszy wyłącznie w celu zdobycia ich wyposażenia służbowego.

**4.11.** Zakładnicy muszą mieć możliwość aktywnego uczestniczenia w przebiegu akcji RP.`,

      `## §5. INICJACJE I STRZELANINY

**5.1.** Każde rozpoczęcie wymiany ognia musi zostać poprzedzone odpowiednią inicjacją głosową.

**5.2.** Inicjacja musi być jednoznaczna, zrozumiała i możliwa do usłyszenia przez drugą stronę. Należy zapewnić realną możliwość reakcji.

**5.3.** Dozwolone przykłady komunikatów inicjacyjnych: „Poddaj się!”, „Podnieś ręce!”, „Zatrzymaj się i wyjdź z pojazdu z rękami w górze!”.

**5.4.** Samo wypowiedzenie komunikatu inicjacyjnego nie uprawnia do natychmiastowego otwarcia ognia, jeżeli druga strona nie miała realnej możliwości zareagowania.

**5.5.** Na terenach Red Zone również obowiązuje inicjacja głosowa.

**5.6.** Obowiązuje bezwzględny zakaz Random Deathmatch (RDM) oraz Vehicle Deathmatch (VDM).

**5.7.** Zabrania się powrotu do tej samej akcji po odrodzeniu postaci w szpitalu lub zakończeniu jej udziału w akcji wskutek BW.

**5.8.** Dołączenie do trwającej strzelaniny wymaga powiązania IC z wydarzeniem. Zabrania się wykorzystywania informacji OOC.

**5.9.** Sama przynależność do wrogiej organizacji nie stanowi wystarczającego powodu do otwarcia ognia.

**5.10.** Zabrania się rozpoczynania strzelanin wyłącznie w celu zdobywania ekwipunku przeciwników.

**5.11.** Zabrania się wykorzystywania błędów animacji, tekstur oraz mechanik gry do uzyskiwania przewagi podczas walki.

**5.12.** Konflikty powinny być rozwijane również poprzez negocjacje, groźby IC i inne formy RP.`,

      `## §6. INTERAKCJE Z POLICJĄ

**6.1.** Zabrania się bezpodstawnego prowokowania funkcjonariuszy w celu wywołania pościgu lub strzelaniny.

**6.2.** Rutynowa kontrola drogowa nie stanowi sama w sobie wystarczającego powodu do otwarcia ognia w kierunku funkcjonariuszy.

**6.3.** Ucieczki przed policją muszą być prowadzone realistycznie, z uwzględnieniem możliwości pojazdu, jego uszkodzeń oraz warunków drogowych.

**6.4.** Zabrania się wykorzystywania błędów mapy, niedostępnych obszarów i nierealistycznych manewrów w celu uniknięcia zatrzymania.

**6.5.** Atak na funkcjonariusza musi posiadać odpowiednie uzasadnienie IC wynikające z przebiegu akcji.

**6.6.** Zabrania się celowego wywoływania kolejnych interwencji policyjnych wyłącznie w celu prowadzenia ciągłych starć.

**6.7.** Funkcjonariusze LSPD/LSSD mają zakaz interweniowania na Red Zone podczas trwającej wymiany ognia pomiędzy organizacjami przestępczymi.

**6.8.** Podczas zatrzymań i interwencji obie strony zobowiązane są do przestrzegania zasad FearRP oraz zakazu Powergamingu.`,

      `## §7. KRADZIEŻE I PRZESZUKANIA

**7.1.** Każda kradzież lub rabunek innego gracza musi posiadać uzasadnienie fabularne oraz zostać odpowiednio odegrana.

**7.2.** Zabrania się masowego i bezpodstawnego okradania przypadkowych osób wyłącznie w celu zdobywania pieniędzy lub przedmiotów.

**7.3.** Zabrania się zmuszania graczy do wypłacania pieniędzy z bankomatów, kont bankowych lub przekazywania majątku poza dozwolonymi mechanikami serwera.

**7.4.** Zabrania się żądania przedmiotów, których postać nie posiada przy sobie.

**7.5.** Przeszukanie gracza musi wynikać z prowadzonej sytuacji RP i odbywać się zgodnie z mechanikami serwera.

**7.6.** Zabrania się wielokrotnego rabowania tej samej osoby bez odpowiedniego uzasadnienia IC.

**7.7.** Zabrania się okradania graczy podczas nielegalnych transakcji. Wyjątek stanowią działania LSPD/LSSD.`,

      `## §8. STREFY I TERENY ORGANIZACJI

**8.1.** Na terenie Green Zone obowiązuje zakaz prowadzenia nielegalnych interesów oraz rozpoczynania akcji przestępczych.

**8.2.** Jeżeli gracz po wcześniejszej inicjacji ucieknie na Green Zone, dozwolona jest kontynuacja rozpoczętej akcji RP, z zastrzeżeniem punktu 8.3.

**8.3.** Na terenie szpitali, komend i więzień oraz w ich bezpośrednim otoczeniu obowiązuje całkowity zakaz odbijania, porywania i strzelanin. Wyjątek dotyczący LSPD/LSSD podlega zasadom ich działań służbowych.

**8.4.** Green Zone: szpitale, komendy, warsztaty mechaniczne, urzędy, miejsca legalnej pracy i apartamenty.

**8.5.** Red Zone: siedziby organizacji przestępczych i tereny związane z narkotykami.

**8.6.** Na Red Zone nadal obowiązuje inicjacja głosowa.

**8.7.** Organizacje mogą posiadać własne tereny, siedziby, kryjówki i magazyny.

**8.8.** Wtargnięcie na teren innej organizacji może rozpocząć konflikt IC, lecz nie daje automatycznego prawa do otwarcia ognia.

**8.9.** Zabrania się bezpodstawnych ataków na siedziby innych organizacji.

**8.10.** Ataki na bazy, magazyny i kryjówki muszą wynikać z rozwiniętego konfliktu fabularnego.

**8.11.** Przejmowanie terenów musi odbywać się zgodnie z zasadami ustalonymi przez Opiekuna Crime.

**8.12.** Zabrania się wykorzystywania błędów mapy i niedostępnych pomieszczeń w celu uzyskania przewagi.`,

      `## §9. FAIR PLAY I KWESTIE TECHNICZNE

**9.1.** Obowiązuje bezwzględny zakaz korzystania z cheatów, niedozwolonych skryptów oraz modyfikacji zapewniających nieuczciwą przewagę.

**9.2.** Zabrania się wykorzystywania błędów gry, duplikowania przedmiotów oraz obchodzenia mechanik serwera.

**9.3.** Zabrania się Combat Loggingu, czyli celowego opuszczania serwera podczas akcji RP w celu uniknięcia jej konsekwencji.

**9.4.** W przypadku awarii gry podczas trwającej akcji należy, o ile to możliwe, niezwłocznie powrócić na serwer i poinformować uczestników o sytuacji.

**9.5.** Zabrania się przenoszenia konfliktów IC do komunikacji OOC oraz wykorzystywania sporów OOC w rozgrywce IC.

**9.6.** Każdy gracz zobowiązany jest do zachowania kultury osobistej w komunikacji OOC.

**9.7.** Zabrania się celowego utrudniania rozgrywki innym graczom oraz świadomego wykorzystywania luk w regulaminie.`,

      `## §10. LIMITY UCZESTNIKÓW AKCJI

**Rodzaj akcji — Crime / LSPD-LSSD**

Konwój — **10 / 12**

Akcja hostylna — **8 / 10**

Bankomat — **1–2 / 2–4**

Sklep — **1–3 / 2–4**

Bank Fleeca — **2–5 / 3–6**

Jubiler — **3–6 / 3–7**

Pacific Bank — **5–10 / 7–12**

**10.1.** Każdy uczestnik zobowiązany jest do przestrzegania limitów przypisanych do rodzaju akcji.

**10.2.** Limity dotyczą aktywnych uczestników po stronie Crime oraz LSPD/LSSD.

**10.3.** Zabrania się angażowania dodatkowych osób w celu obejścia limitów.

**10.4.** Organizacje niezatwierdzone mogą uczestniczyć w akcjach hostylnych w maksymalnie 5 osób.

**10.5.** W przypadku przedziałów liczbowych obowiązuje zarówno minimum, jak i maksimum.

**10.6.** Zmiany limitów wymagają poinformowania społeczności.`,

      `## §11. KARY I POSTANOWIENIA ADMINISTRACYJNE

**10.1.** Naruszenie regulaminu może skutkować ostrzeżeniem, karą administracyjną, czasową blokadą dostępu do Crime lub innymi sankcjami przewidzianymi w Regulaminie Głównym.

**10.2.** Poważne lub powtarzające się naruszenia mogą skutkować ostrzeżeniem organizacyjnym, zawieszeniem działalności lub rozwiązaniem organizacji.

**10.3.** Opiekun Crime rozpatruje zgłoszenia indywidualnie, uwzględniając przedstawione dowody, przebieg akcji i okoliczności zdarzenia.

**10.4.** Każdy gracz ma prawo odwołać się od nałożonej kary za pośrednictwem oficjalnego systemu odwołań DreamLife RolePlay.

**10.5.** Administracja zastrzega sobie prawo do aktualizowania regulaminu, informując społeczność o istotnych zmianach.

**10.6.** W sprawach nieuregulowanych niniejszym dokumentem zastosowanie ma Regulamin Główny DreamLife RolePlay.`,

      `## §12. SŁOWNIK NAJWAŻNIEJSZYCH POJĘĆ

**12.1. RP (RolePlay)** – odgrywanie fikcyjnej postaci zgodnie z jej charakterem, historią i zasadami serwera.

**12.2. IC (In Character)** – działania, rozmowy i informacje należące do świata gry.

**12.3. OOC (Out of Character)** – informacje i rozmowy niezwiązane bezpośrednio z odgrywaną postacią.

**12.4. MG (Metagaming)** – wykorzystywanie informacji zdobytych poza rozgrywką IC.

**12.5. PG (Powergaming)** – wymuszanie działań lub rezultatów RP na innych graczach bez możliwości odpowiedniej reakcji.

**12.6. FailRP** – zachowanie niezgodne z zasadami odgrywania postaci i realizmem sytuacji.

**12.7. FearRP** – realistyczne odgrywanie strachu o życie i zdrowie postaci.

**12.8. RDM (Random Deathmatch)** – atakowanie lub zabijanie graczy bez uzasadnienia RP.

**12.9. VDM (Vehicle Deathmatch)** – wykorzystywanie pojazdu jako broni w sposób niezgodny z zasadami RP.

**12.10. BW (Brutally Wounded)** – stan ciężkiego zranienia lub nieprzytomności postaci.

**12.11. CK (Character Kill)** – trwałe zakończenie historii postaci zgodnie z zasadami serwera.

**12.12. FCK (Faction Character Kill)** – zakończenie historii postaci w ramach wątku organizacyjnego.

**12.13. CL (Combat Logging)** – celowe opuszczenie gry podczas akcji RP w celu uniknięcia konsekwencji.

**12.14. NLR (New Life Rule)** – zasada dotycząca pamięci postaci po odrodzeniu, zależna od regulaminu serwera.

**12.15. Inicjacja RP** – jednoznaczne rozpoczęcie konfliktu lub zagrożenia przez komunikat lub działanie.

**12.16. Looting** – przeszukiwanie i zabieranie przedmiotów z ekwipunku innego gracza.

**12.17. Cop Baiting** – celowe prowokowanie funkcjonariuszy bez uzasadnienia fabularnego.

**12.18. Revenge Kill (RK)** – odwet z naruszeniem zasad pamięci postaci lub kontynuacji RP.

**12.19. Stream Sniping** – wykorzystywanie transmisji innego gracza do zdobycia przewagi.

**12.20. Exploiting** – świadome wykorzystywanie błędów gry lub mechanik serwera.

**12.21. Hostage RP** – rozgrywka związana z przetrzymywaniem zakładnika i negocjacjami.

**12.22. Drive-By** – prowadzenie ostrzału z pojazdu z zachowaniem zasad serwera.

**12.23. Hard RP** – styl rozgrywki kładący nacisk na realizm, konsekwencje i historię postaci.

**12.24. Crime** – działalność przestępcza w ramach rozgrywki RP.

**12.25. Opiekun Crime** – osoba odpowiedzialna za nadzorowanie organizacji i egzekwowanie Regulaminu Crime.

**12.26. Green Zone (GZ)** – strefa chroniona z ograniczeniami dotyczącymi działalności przestępczej.

**12.27. Red Zone (RZ)** – strefa działalności przestępczej, w której nadal obowiązuje inicjacja.

**12.28. Akcja hostylna** – bezpośredni konflikt, groźby, przemoc lub wymiana ognia między stronami.`,

      `## POSTANOWIENIE KOŃCOWE

Celem Regulaminu Crime jest zapewnienie realistycznej, sprawiedliwej i angażującej rozgrywki przestępczej na serwerze **DreamLife RolePlay**.

Każda organizacja oraz każdy gracz prowadzący działalność przestępczą powinien rozwijać fabułę serwera, tworzyć interesujące sytuacje RP i respektować zasady uczciwej rozgrywki.

**Z poważaniem,**

**Opiekun Crime | DreamLife RolePlay**

© 2026 DreamLife RolePlay`,
    ];

    for (let i = 0; i < sections.length; i++) {
      const embed = new EmbedBuilder()
        .setDescription(sections[i])
        .setColor(0xed4245);

      await channel.send({ embeds: [embed] });
    }

    console.log('Regulamin Crime wysłany: każda sekcja w osobnej wiadomości.');
  } catch (error) {
    console.error('Błąd podczas wysyłania Regulaminu Crime:', error);
  }
}

async function ensureOrganizationPenaltiesPanel() {
  try {
    const channel = await client.channels.fetch(ORG_PENALTIES_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const title = '⚠️ Kary nakładane na organizacje';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        '**Cheater w organizacji**\n' +
        '→ 1 Warn + zawieszenie 24h\n\n' +
        '**Złamanie limitów**\n' +
        '→ 1 Warn\n\n' +
        '**Masowe łamanie regulaminu serwera**\n' +
        '→ 1 Warn\n\n' +
        '**Niska aktywność organizacji**\n' +
        '→ 1 Warn\n\n' +
        '**Masowy metagaming**\n' +
        '→ 1 Warn\n\n' +
        '**Zakazane mody**\n' +
        '→ 1 Warn\n\n' +
        '**Brak propów**\n' +
        '→ 1 Warn\n\n' +
        '**Łamanie zasad RP**\n' +
        '→ 1 Warn\n\n' +
        '**Całkowicie bojówkarskie podejście do rozgrywki**\n' +
        '→ Warn / usunięcie organizacji\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '**📌 LIMIT WARNÓW**\n' +
        'Organizacja przestępcza może posiadać maksymalnie **2 Warny**.\n' +
        'Otrzymanie **3 Warna** skutkuje rozwiązaniem organizacji.\n\n' +
        '**📨 ODWOŁANIA**\n' +
        'Jeżeli uważacie, że **Warn** został nadany niesłusznie, skontaktujcie się z **Opiekunami Crime** poprzez ticket.\n\n' +
        '**🎯 ANULOWANIE WARNA**\n' +
        'Jeżeli organizacja chce anulować swojego **Warna**, musi otworzyć ticket. Następnie otrzyma zadania od **Mafii**, które musi wykonać.'
      )
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' });

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const oldPanel = messages?.find(message =>
      message.author.id === client.user.id &&
      message.embeds.some(embed => embed.title === title)
    );

    if (oldPanel) {
      await oldPanel.delete().catch(() => {});
    }

    await channel.send({ embeds: [embed] });
    console.log('Panel kar organizacji został wysłany.');
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu kar organizacji:', error);
  }
}

async function ensureAppealInfoPanel() {
  try {
    const channel = await client.channels.fetch(APPEAL_INFO_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const title = '📢 Odwołania';
    const oldTitle = '📢 Odwołania od kar';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        'Odwołania od **warna** lub **zawieszenia** składaj tylko na kanale <#' +
        APPEAL_TICKET_CHANNEL_ID +
        '>.'
      )
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' });

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const panels = messages
      ? [...messages.values()].filter(message =>
          message.author.id === client.user.id &&
          message.embeds.some(e => e.title === title || e.title === oldTitle)
        )
      : [];

    const panel = panels[0] || null;

    for (const duplicate of panels.slice(1)) {
      await duplicate.delete().catch(() => {});
    }

    if (panel) {
      await panel.edit({ embeds: [embed] });
    } else {
      await channel.send({ embeds: [embed] });
    }

    console.log('Panel informacji o odwołaniach jest gotowy.');
  } catch (error) {
    console.error('Błąd podczas tworzenia informacji o odwołaniach:', error);
  }
}

async function ensureTicketPanel() {
  try {
    const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const panels = [...messages.values()].filter(
      message =>
        message.author.id === client.user.id &&
        message.components.some(row =>
          row.components.some(component => component.customId === 'ticket_select')
        )
    );

    const existingPanel = panels[0] || null;

    for (const duplicate of panels.slice(1)) {
      await duplicate.delete().catch(() => {});
    }

    if (existingPanel) {
      await existingPanel.edit(buildTicketPanel());
      console.log('Panel ticketów odświeżony bez tworzenia nowej wiadomości.');
    } else {
      await channel.send(buildTicketPanel());
      console.log('Panel ticketów utworzony.');
    }
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu ticketów:', error);
  }
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`Zalogowano jako ${readyClient.user.tag}`);

  try {
    await readyClient.application.commands.set([]);
    console.log('Stare globalne komendy slash zostały wyczyszczone.');

    const guild = await readyClient.guilds.fetch(GUILD_ID);
    await guild.commands.set([
      ping.data.toJSON(),
      warn.data.toJSON(),
      dodajgang.data.toJSON(),
      dodajorganizacje.data.toJSON(),
      usungang.data.toJSON(),
      usunorganizacje.data.toJSON(),
      zawieszenie.data.toJSON(),
      nadajrange.data.toJSON(),
      changlog.data.toJSON(),
      listagangow.data.toJSON(),
      listaorganizacji.data.toJSON(),
      kolorgang.data.toJSON(),
      kolororganizacje.data.toJSON(),
      dodajticket.data.toJSON(),
    ]);
    console.log('Komendy slash zsynchronizowane.');
    await ensureAutoRoleForExistingMembers(guild);
  } catch (error) {
    console.error('Błąd synchronizacji komend slash:', error);
  }

  await ensureTicketPanel();
  await ensureReactionRolePanel();
  await ensureAppealInfoPanel();
  await ensureOrganizationPenaltiesPanel();
  await ensureCrimeRulesPanel();
  await ensureStarterPackPanel();
  await ensureGangStarterPackPanel();
  await kolory.ensurePanel(readyClient, 'organization');
  await kolory.ensurePanel(readyClient, 'gang');
  await listagangow.updateGangList(readyClient);
  await listaorganizacji.updateOrganizationList(readyClient);
});


client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.message.channelId !== REACTION_ROLE_CHANNEL_ID) return;
    if (reaction.message.id !== reactionRoleMessageId) return;

    const emojiKey = reaction.emoji.id || reaction.emoji.name;
    const roleId = REACTION_ROLE_MAP[emojiKey];
    if (!roleId) return;

    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId, `Reaction role: ${emojiKey}`);
    }
  } catch (error) {
    console.error('Nie udało się nadać reaction role:', error);
  }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.message.channelId !== REACTION_ROLE_CHANNEL_ID) return;
    if (reaction.message.id !== reactionRoleMessageId) return;

    const emojiKey = reaction.emoji.id || reaction.emoji.name;
    const roleId = REACTION_ROLE_MAP[emojiKey];
    if (!roleId) return;

    const member = await reaction.message.guild.members.fetch(user.id);
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId, `Reaction role removed: ${emojiKey}`);
    }
  } catch (error) {
    console.error('Nie udało się zabrać reaction role:', error);
  }
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    if (!member.roles.cache.has(AUTO_ROLE_ID)) {
      await member.roles.add(AUTO_ROLE_ID, 'Automatyczna ranga dla nowego członka');
    }
  } catch (error) {
    console.error('Nie udało się nadać automatycznej rangi Przyszły Gangster:', error);
  }

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('👋 Witamy na DreamLifeRP Crime!')
    .setDescription(
      `Siema ${member}! Witamy na serwerze **DreamLifeRP Crime**.\n\nMiłej gry i powodzenia w crime! 🔥`
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setColor(0xed4245)
    .setFooter({ text: 'DreamLife RolePlay © 2026' })
    .setTimestamp();

  try {
    await channel.send({ content: `${member}`, embeds: [embed] });
  } catch (error) {
    console.error('Błąd wysyłania powitania:', error);
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.guild && !message.author?.bot && !message.system) {
    messageCache.set(message.id, {
      content: message.content,
      authorId: message.author.id,
      authorTag: message.author.tag,
      channelId: message.channelId,
    });

    if (messageCache.size > 5000) {
      const oldestKey = messageCache.keys().next().value;
      messageCache.delete(oldestKey);
    }
  }

  if (message.channelId !== WELCOME_CHANNEL_ID) return;
  if (message.type !== MessageType.UserJoin) return;

  try {
    await message.delete();
  } catch (error) {
    console.error('Nie udało się usunąć domyślnej wiadomości powitalnej:', error);
  }
});


client.on(Events.MessageDelete, async message => {
  if (!message.guild || message.channelId === BOT_LOG_CHANNEL_ID) return;
  if (message.author?.bot || message.system) return;

  const cached = messageCache.get(message.id);
  const deletedContent = message.content || cached?.content || '*treść niedostępna*';
  const authorText = message.author
    ? `${message.author} (\`${message.author.tag}\`)`
    : cached?.authorId
      ? `<@${cached.authorId}> (\`${cached.authorTag || 'nieznany'}\`)`
      : 'Nieznany';

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Wiadomość usunięta')
    .addFields(
      { name: 'Autor', value: authorText, inline: true },
      { name: 'Kanał', value: `<#${message.channelId || cached?.channelId}>`, inline: true },
      { name: 'Usunięta treść', value: trimLogText(deletedContent, '*treść niedostępna*') }
    )
    .setColor(0xed4245)
    .setTimestamp();

  messageCache.delete(message.id);
  await sendBotLog(message.guild, embed);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.channelId === BOT_LOG_CHANNEL_ID) return;
  if (newMessage.author?.bot || newMessage.system) return;

  if (newMessage.partial) {
    await newMessage.fetch().catch(() => {});
  }

  const cached = messageCache.get(newMessage.id);
  const oldContent = oldMessage.content || cached?.content || '*treść niedostępna*';
  const newContent = newMessage.content || '*treść niedostępna*';

  if (oldContent === newContent) return;

  const embed = new EmbedBuilder()
    .setTitle('✏️ Wiadomość edytowana')
    .addFields(
      { name: 'Autor', value: newMessage.author ? `${newMessage.author} (\`${newMessage.author.tag}\`)` : 'Nieznany', inline: true },
      { name: 'Kanał', value: `<#${newMessage.channelId}>`, inline: true },
      { name: 'Wcześniejsza wiadomość', value: trimLogText(oldContent, '*treść niedostępna*') },
      { name: 'Poprawiona wiadomość', value: trimLogText(newContent, '*treść niedostępna*') }
    )
    .setColor(0xfee75c)
    .setTimestamp();

  messageCache.set(newMessage.id, {
    content: newContent,
    authorId: newMessage.author?.id,
    authorTag: newMessage.author?.tag,
    channelId: newMessage.channelId,
  });

  await sendBotLog(newMessage.guild, embed);
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

  const trackedGangRoleChanged =
    addedRoles.some(role => listagangow.isTrackedRole(role.id)) ||
    removedRoles.some(role => listagangow.isTrackedRole(role.id));

  if (trackedGangRoleChanged) {
    await listagangow.updateGangList(newMember.client).catch(error =>
      console.error('Nie udało się odświeżyć listy gangów:', error)
    );
  }

  for (const role of addedRoles.values()) {
    const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
    const embed = new EmbedBuilder()
      .setTitle('➕ Nadano rolę')
      .addFields(
        { name: 'Użytkownik', value: `${newMember}`, inline: true },
        { name: 'Rola', value: `${role}`, inline: true },
        { name: 'Nadał', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
      )
      .setColor(0x57f287)
      .setTimestamp();
    await sendBotLog(newMember.guild, embed);
  }

  for (const role of removedRoles.values()) {
    const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
    const embed = new EmbedBuilder()
      .setTitle('➖ Zabrano rolę')
      .addFields(
        { name: 'Użytkownik', value: `${newMember}`, inline: true },
        { name: 'Rola', value: `@${role.name}`, inline: true },
        { name: 'Zabrał', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
      )
      .setColor(0xed4245)
      .setTimestamp();
    await sendBotLog(newMember.guild, embed);
  }

  const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? 0;
  const newTimeout = newMember.communicationDisabledUntilTimestamp ?? 0;

  if (oldTimeout !== newTimeout) {
    const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
    const muted = newTimeout > Date.now();

    const embed = new EmbedBuilder()
      .setTitle(muted ? '🔇 Nadano mute / timeout' : '🔊 Zdjęto mute / timeout')
      .addFields(
        { name: 'Użytkownik', value: `${newMember}`, inline: true },
        { name: muted ? 'Do' : 'Status', value: muted ? `<t:${Math.floor(newTimeout / 1000)}:F>` : 'Timeout zakończony/usunięty', inline: true },
        { name: muted ? 'Nadał' : 'Zmienił', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
      )
      .setColor(muted ? 0xfaa61a : 0x57f287)
      .setTimestamp();

    await sendBotLog(newMember.guild, embed);
  }
});

client.on(Events.GuildBanAdd, async ban => {
  const executor = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  const embed = new EmbedBuilder()
    .setTitle('🔨 Ban')
    .addFields(
      { name: 'Użytkownik', value: `${ban.user} (\`${ban.user.tag}\`)`, inline: true },
      { name: 'Zbanował', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(0xed4245)
    .setTimestamp();
  await sendBotLog(ban.guild, embed);
});

client.on(Events.GuildMemberRemove, async member => {
  const executor = await getAuditExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
  if (!executor) return;

  const embed = new EmbedBuilder()
    .setTitle('👢 Kick')
    .addFields(
      { name: 'Użytkownik', value: `${member.user} (\`${member.user.tag}\`)`, inline: true },
      { name: 'Wyrzucił', value: `${executor}`, inline: true }
    )
    .setColor(0xed4245)
    .setTimestamp();
  await sendBotLog(member.guild, embed);
});

client.on(Events.GuildRoleCreate, async role => {
  const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

  const embed = new EmbedBuilder()
    .setTitle('🎭 Utworzono rolę')
    .addFields(
      { name: 'Rola', value: `${role} (\`${role.name}\`)`, inline: true },
      { name: 'ID roli', value: `\`${role.id}\``, inline: true },
      { name: 'Utworzył', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(role.color || 0x57f287)
    .setTimestamp();

  await sendBotLog(role.guild, embed);
});

client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  try {
    const isGang =
      listagangow.isTrackedRole(newRole.id) ||
      await kolory.hasEntry(client, 'gang', oldRole.name) ||
      await kolory.hasEntry(client, 'gang', newRole.name);

    if (isGang) {
      await kolory.syncRole(client, 'gang', oldRole, newRole).catch(error => {
        console.error('Nie udało się zsynchronizować koloru gangu:', error);
      });

      await listagangow.updateGangList(client).catch(error => {
        console.error('Nie udało się odświeżyć listy gangów po zmianie roli:', error);
      });
    }

    const isOrganization =
      await kolory.hasEntry(client, 'organization', oldRole.name) ||
      await kolory.hasEntry(client, 'organization', newRole.name);

    if (isOrganization) {
      await kolory.syncRole(client, 'organization', oldRole, newRole).catch(error => {
        console.error('Nie udało się zsynchronizować koloru organizacji:', error);
      });

      await listaorganizacji.updateOrganizationList(client).catch(error => {
        console.error('Nie udało się odświeżyć listy organizacji po zmianie roli:', error);
      });
    }
  } catch (error) {
    console.error('Błąd automatycznej synchronizacji zmiany roli:', error);
  }
});

client.on(Events.GuildRoleDelete, async role => {
  const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Usunięto rolę')
    .addFields(
      { name: 'Nazwa', value: `\`${role.name}\``, inline: true },
      { name: 'ID roli', value: `\`${role.id}\``, inline: true },
      { name: 'Usunął', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendBotLog(role.guild, embed);

  const wasGang =
    listagangow.isTrackedRole(role.id) ||
    await kolory.hasEntry(client, 'gang', role.name).catch(() => false);

  if (wasGang) {
    await kolory.removeColor(client, 'gang', role.name).catch(error => {
      console.error('Nie udało się usunąć koloru gangu po usunięciu roli:', error);
    });

    await listagangow.updateGangList(client).catch(error => {
      console.error('Nie udało się odświeżyć listy gangów po usunięciu roli:', error);
    });
  }

  const wasOrganization =
    await kolory.hasEntry(client, 'organization', role.name).catch(() => false);

  if (wasOrganization) {
    await kolory.removeColor(client, 'organization', role.name).catch(error => {
      console.error('Nie udało się usunąć koloru organizacji po usunięciu roli:', error);
    });
  }

  await listaorganizacji.updateOrganizationList(client, role.id).catch(error => {
    console.error('Nie udało się odświeżyć listy organizacji po usunięciu roli:', error);
  });
});

client.on(Events.ChannelCreate, async channel => {
  if (!channel.guild || channel.id === BOT_LOG_CHANNEL_ID) return;
  const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

  const embed = new EmbedBuilder()
    .setTitle('📁 Utworzono kanał')
    .addFields(
      { name: 'Kanał', value: `${channel}`, inline: true },
      { name: 'Nazwa', value: `\`${channel.name}\``, inline: true },
      { name: 'Utworzył', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(0x57f287)
    .setTimestamp();

  await sendBotLog(channel.guild, embed);
});

client.on(Events.ChannelDelete, async channel => {
  if (!channel.guild || channel.id === BOT_LOG_CHANNEL_ID) return;
  const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Usunięto kanał')
    .addFields(
      { name: 'Nazwa', value: `\`${channel.name}\``, inline: true },
      { name: 'Usunął', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendBotLog(channel.guild, embed);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isModalSubmit() && interaction.customId.startsWith('warn_modal:')) {
      await warn.handleModal(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('zawieszenie_modal:')) {
      await zawieszenie.handleModal(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'changlog_modal') {
      await changlog.handleModal(interaction);
      return;
    }

    if (interaction.isRoleSelectMenu() && interaction.customId.startsWith('nadajrange_select:')) {
      await nadajrange.handleSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
      const selected = interaction.values[0];
      const ticketType = TICKET_OPTIONS[selected];
      if (!ticketType) return;

      const existingTicket = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildText &&
          channel.topic?.includes(`ticketOwner:${interaction.user.id}`)
      );

      if (existingTicket) {
        await interaction.reply({
          content: `Masz już otwarty ticket: ${existingTicket}`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const parentId = interaction.channel.parentId ?? undefined;
      const baseName = getTicketChannelBaseName(selected, ticketType);
      const ticketNumber = getNextTicketNumber(interaction.guild, baseName);

      const ticketChannel = await interaction.guild.channels.create({
        name: `${baseName}-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: parentId,
        topic: `ticketOwner:${interaction.user.id} | type:${selected}`,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
            ],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`${ticketType.emoji} ${ticketType.label}`)
        .setDescription(
          `Witaj ${interaction.user}!\n\nOpisz dokładnie swoją sprawę. Administracja odpowie, gdy będzie dostępna.`
        )
        .addFields(
          { name: 'Kategoria', value: ticketType.label, inline: true },
          { name: 'Autor', value: `${interaction.user}`, inline: true }
        )
        .setColor(0x2b2d31)
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Zamknij ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const przyszlyGangsterRole = interaction.guild.roles.cache.find(
        role => role.name.trim().toLocaleLowerCase('pl-PL').includes('przyszły gangster')
      );

      await ticketChannel.send({
        content: przyszlyGangsterRole
          ? `${interaction.user} ・<@&${przyszlyGangsterRole.id}>`
          : `${interaction.user} ・@Przyszły Gangster`,
        embeds: [ticketEmbed],
        components: [new ActionRowBuilder().addComponents(closeButton)],
        allowedMentions: przyszlyGangsterRole
          ? { users: [interaction.user.id], roles: [przyszlyGangsterRole.id] }
          : { users: [interaction.user.id] },
      });

      await interaction.editReply({
        content: `✅ Ticket został utworzony: ${ticketChannel}`,
      });

      await sendBotLog(
        interaction.guild,
        new EmbedBuilder()
          .setTitle('🎟️ Utworzono ticket')
          .addFields(
            { name: 'Autor', value: `${interaction.user}`, inline: true },
            { name: 'Kategoria', value: ticketType.label, inline: true },
            { name: 'Kanał', value: `${ticketChannel}`, inline: true }
          )
          .setColor(0x5865f2)
          .setTimestamp()
      );

      return;
    }

    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      const ownerMatch = interaction.channel.topic?.match(/ticketOwner:(\d+)/);
      const ownerId = ownerMatch?.[1];

      const canClose =
        interaction.user.id === ownerId ||
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

      if (!canClose) {
        await interaction.reply({
          content: 'Nie masz uprawnień do zamknięcia tego ticketu.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const ticketName = interaction.channel.name;
        const transcript = await createTicketTranscript(interaction.channel);

        await sendBotLog(
          interaction.guild,
          new EmbedBuilder()
            .setTitle('🔒 Zamknięto ticket')
            .addFields(
              { name: 'Ticket', value: `\`${ticketName}\``, inline: true },
              { name: 'Zamknął', value: `${interaction.user}`, inline: true },
              { name: 'Autor ticketu', value: ownerId ? `<@${ownerId}>` : 'Nieznany', inline: true },
              { name: 'Transcript', value: '📄 Plik z pełną rozmową znajduje się poniżej.' }
            )
            .setColor(0xed4245)
            .setTimestamp(),
          [transcript]
        );

        await interaction.editReply('✅ Ticket zostanie usunięty.');
        setTimeout(async () => {
          try {
            await interaction.channel.delete('Ticket zamknięty');
          } catch (error) {
            console.error('Nie udało się usunąć ticketu:', error);
          }
        }, 1500);
      } catch (error) {
        console.error('Nie udało się zamknąć ticketu:', error);
        await interaction.editReply('Nie udało się zamknąć ticketu.');
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction);
  } catch (error) {
    console.error('Błąd interakcji:', error);

    const message = 'Wystąpił błąd podczas wykonywania tej akcji.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

require('./auth-server').startAuthServer(client);

client.login(process.env.DISCORD_TOKEN);
