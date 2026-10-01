const { EmbedBuilder } = require('discord.js');

const REMOVED_COLOR_NAMES = new Set(['pety', 'peciki']);

const COLOR_NAMES = new Map([
  ['#E53935', 'Czerwony'],
  ['#FF6B6B', 'Jasnoczerwony'],
  ['#B71C1C', 'Ciemnoczerwony'],
  ['#1E88E5', 'Niebieski'],
  ['#64B5F6', 'Jasnoniebieski'],
  ['#1A237E', 'Granatowy'],
  ['#43A047', 'Zielony'],
  ['#81C784', 'Jasnozielony'],
  ['#1B5E20', 'Ciemnozielony'],
  ['#FDD835', 'Żółty'],
  ['#FB8C00', 'Pomarańczowy'],
  ['#8E24AA', 'Fioletowy'],
  ['#BA68C8', 'Jasnofioletowy'],
  ['#EC407A', 'Różowy'],
  ['#F48FB1', 'Jasnoróżowy'],
  ['#795548', 'Brązowy'],
  ['#1C1C1C', 'Czarny'],
  ['#F5F5F5', 'Biały'],
  ['#757575', 'Szary'],
  ['#BDBDBD', 'Jasnoszary'],
  ['#424242', 'Ciemny szary'],
  ['#D7C4A3', 'Beżowy'],
  ['#D4AF37', 'Złoty'],
  ['#B0BEC5', 'Srebrny'],
  ['#800020', 'Bordowy'],
  ['#00ACC1', 'Turkusowy'],
  ['#66CDAA', 'Miętowy'],
  ['#A4C639', 'Limonkowy'],
  ['#FF7043', 'Koralowy'],
  ['#FA8072', 'Łososiowy'],
  ['#9575CD', 'Lawendowy'],
  ['#42A5F5', 'Błękitny'],
]);

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
  const value = String(input || '').trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(value)) return null;
  return '#' + value;
}

function inferColorName(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return 'Niestandardowy';
  return COLOR_NAMES.get(normalized) || 'Niestandardowy';
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

  return entries.filter(entry =>
    !REMOVED_COLOR_NAMES.has(entry.name.toLocaleLowerCase('pl-PL'))
  );
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

  const messages = await channel.messages.fetch({ limit: 100 });
  const panels = [...messages.values()].filter(message =>
    message.author.id === client.user.id &&
    message.embeds.some(embed => embed.title === config.title)
  );

  return { channel, panel: panels[0] || null, panels, config };
}

async function ensurePanel(client, type) {
  const { channel, panels, config } = await getPanel(client, type);
  const mainPanel = panels[0] || null;
  const entries = mainPanel
    ? parseEntries(mainPanel.embeds?.[0]?.description || '')
    : [...config.defaults];

  for (const duplicate of panels.slice(1)) {
    await duplicate.delete().catch(() => {});
  }

  if (mainPanel) {
    await mainPanel.edit({ embeds: [buildEmbed(config, entries)] });
    console.log(config.title + ' odświeżony bez tworzenia nowej wiadomości.');
    return mainPanel;
  }

  const newPanel = await channel.send({
    embeds: [buildEmbed(config, entries)],
  });

  console.log(config.title + ' utworzony, bo nie było panelu.');
  return newPanel;
}

async function getEntries(client, type) {
  const { panel, config } = await getPanel(client, type);
  return panel
    ? parseEntries(panel.embeds?.[0]?.description || '')
    : [...config.defaults];
}

async function hasEntry(client, type, roleName) {
  const entries = await getEntries(client, type);
  const wanted = roleName.toLocaleLowerCase('pl-PL');
  return entries.some(entry => entry.name.toLocaleLowerCase('pl-PL') === wanted);
}

async function removeColor(client, type, roleName) {
  const { channel, panel, config } = await getPanel(client, type);
  if (!panel) return null;

  const wanted = roleName.toLocaleLowerCase('pl-PL');
  const entries = parseEntries(panel.embeds?.[0]?.description || '')
    .filter(entry => entry.name.toLocaleLowerCase('pl-PL') !== wanted);

  await panel.edit({ embeds: [buildEmbed(config, entries)] });
  return panel;
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

  const next = {
    name: role.name,
    colorName: (colorName || inferColorName(normalizedHex)).trim(),
    hex: normalizedHex,
  };

  if (index >= 0) entries[index] = next;
  else entries.push(next);

  const embed = buildEmbed(config, entries);

  if (panel) {
    await panel.edit({ embeds: [embed] });
    return panel;
  }

  return channel.send({ embeds: [embed] });
}

async function syncRole(client, type, oldRole, newRole) {
  const { panel, config } = await getPanel(client, type);
  if (!panel) return null;

  const entries = parseEntries(panel.embeds?.[0]?.description || '');
  const oldName = oldRole.name.toLocaleLowerCase('pl-PL');
  const newName = newRole.name.toLocaleLowerCase('pl-PL');

  const index = entries.findIndex(entry => {
    const name = entry.name.toLocaleLowerCase('pl-PL');
    return name === oldName || name === newName;
  });

  if (index < 0) return null;

  const hex = normalizeHex(newRole.hexColor) || '#000000';
  const colorChanged = oldRole.color !== newRole.color;
  const panelAlreadyHasNewHex = entries[index].hex === hex;

  entries[index] = {
    name: newRole.name,
    colorName: colorChanged && !panelAlreadyHasNewHex
      ? inferColorName(hex)
      : entries[index].colorName,
    hex,
  };

  await panel.edit({ embeds: [buildEmbed(config, entries)] });
  return panel;
}

module.exports = {
  CONFIG,
  normalizeHex,
  inferColorName,
  ensurePanel,
  upsertColor,
  removeColor,
  hasEntry,
  syncRole,
};
