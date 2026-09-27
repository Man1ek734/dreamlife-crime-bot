const { EmbedBuilder } = require('discord.js');

const CONFIG = {
  gang: {
    channelId: '1526702996690440292',
    title: '🎨 Kolory Gangów',
    heading: '**Przypisane kolory gangów:**',
    footer: '*Każdy gang posiada swój indywidualny kolor.*',
    defaults: [
      { name: 'MS-13', colorName: 'Jasnoszary', hex: '#BDBDBD' },
      { name: 'Varrios Los Aztecas', colorName: 'Granatowy', hex: '#1A237E' },
      { name: 'Rollin 20s Bloods', colorName: 'Czerwony', hex: '#E53935' },
      { name: 'Ballas', colorName: 'Fioletowy', hex: '#8E24AA' },
      { name: 'The Famillies', colorName: 'Zielony', hex: '#43A047' },
      { name: 'The Lost MC', colorName: 'Ciemny szary', hex: '#424242' },
    ],
  },
  organization: {
    channelId: '1524480689154691152',
    title: '🎨 Kolory Organizacji',
    heading: '**Przypisane kolory organizacji:**',
    footer: '*Każda organizacja posiada swój indywidualny kolor.*',
    defaults: [
      { name: 'Rose Dominion', colorName: 'Pomarańczowy', hex: '#FB8C00' },
      { name: 'Arizona', colorName: 'Jasnoniebieski', hex: '#64B5F6' },
    ],
  },
};

function normalizeHex(input) {
  const value = input.trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(value)) return null;
  return '#' + value;
}

function parseEntries(description = '') {
  const entries = [];
  const regex = /[^\n]*\*\*(.+?)\*\*\s+—\s+([^\n]+)\n└ HEX: `(#[0-9A-Fa-f]{6})`/g;
  let match;
  while ((match = regex.exec(description)) !== null) {
    entries.push({
      name: match[1].trim(),
      colorName: match[2].trim(),
      hex: match[3].toUpperCase(),
    });
  }
  return entries;
}

function buildDescription(config, entries) {
  const body = entries.map(entry =>
    '🎨 **' + entry.name + '** — ' + entry.colorName + '\n' +
    '└ HEX: `' + entry.hex + '`'
  ).join('\n\n');

  return config.heading + '\n\n' +
    (body || '*Brak przypisanych kolorów.*') +
    '\n\n━━━━━━━━━━━━━━━━━━━━\n' +
    config.footer;
}

function buildEmbed(config, entries) {
  return new EmbedBuilder()
    .setTitle(config.title)
    .setDescription(buildDescription(config, entries))
    .setColor(0xed4245)
    .setFooter({ text: 'DreamLife RolePlay © 2026' });
}

async function getPanel(client, type) {
  const config = CONFIG[type];
  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Nie znaleziono kanału panelu kolorów: ' + config.channelId);
  }

  const messages = await channel.messages.fetch({ limit: 50 });
  const panel = messages.find(message =>
    message.author.id === client.user.id &&
    message.embeds.some(embed => embed.title === config.title)
  );

  return { channel, panel, config };
}

async function ensurePanel(client, type) {
  const { channel, panel, config } = await getPanel(client, type);
  if (panel) return panel;

  return channel.send({ embeds: [buildEmbed(config, config.defaults)] });
}

async function upsertColor(client, type, role, colorName, hex) {
  const normalizedHex = normalizeHex(hex);
  if (!normalizedHex) throw new Error('INVALID_HEX');

  const { channel, panel, config } = await getPanel(client, type);
  const entries = panel
    ? parseEntries(panel.embeds?.[0]?.description || '')
    : [...config.defaults];

  const index = entries.findIndex(entry =>
    entry.name.toLocaleLowerCase('pl-PL') === role.name.toLocaleLowerCase('pl-PL')
  );

  const next = { name: role.name, colorName: colorName.trim(), hex: normalizedHex };
  if (index >= 0) entries[index] = next;
  else entries.push(next);

  const embed = buildEmbed(config, entries);

  if (panel) {
    await panel.edit({ embeds: [embed] });
    return panel;
  }

  return channel.send({ embeds: [embed] });
}

module.exports = {
  CONFIG,
  normalizeHex,
  ensurePanel,
  upsertColor,
};
