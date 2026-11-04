const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const AUTHORIZED_ROLE_IDS = [
  '1517965039670132796',
  '1465810885489725533',
  '1542655009626390729',
  '1537461404032958474',
];

const MESSAGE_LIMIT = 6;
const MESSAGE_WINDOW_MS = 5000;
const TIMEOUT_MS = 10 * 60 * 1000;
const JOIN_LIMIT = 8;
const JOIN_WINDOW_MS = 30000;
const LOCKDOWN_MS = 5 * 60 * 1000;
const MASS_MENTION_LIMIT = 5;
const STATE_FILE = path.join(process.cwd(), 'antyraid-state.json');

const messageBuckets = new Map();
const joinBuckets = new Map();
let logChannelId = null;
let enabled = true;
let lockdownUntil = 0;
let lockdownGuildId = null;
let lockdownTimer = null;
let savedOverwrites = {};

function hasPermission(interaction) {
  return (
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))
  );
}

function isExempt() {
  return false;
}

function saveState() {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({
        enabled,
        lockdownUntil,
        lockdownGuildId,
        savedOverwrites,
      }),
      'utf8'
    );
  } catch (error) {
    console.error('Nie udało się zapisać stanu Anti-Raid:', error);
  }
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    enabled = state.enabled !== false;
    lockdownUntil = Number(state.lockdownUntil) || 0;
    lockdownGuildId = state.lockdownGuildId || null;
    savedOverwrites = state.savedOverwrites || {};
  } catch (error) {
    console.error('Nie udało się odczytać stanu Anti-Raid:', error);
  }
}

async function sendLog(guild, title, description, color = 0xed4245) {
  if (!logChannelId) return;
  const channel =
    guild.channels.cache.get(logChannelId) ||
    await guild.channels.fetch(logChannelId).catch(() => null);

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setFooter({ text: 'DreamLife RolePlay © 2026' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

function getPublicTextChannels(guild) {
  return guild.channels.cache.filter(channel =>
    (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
    channel.viewable
  );
}

async function enableLockdown(guild, reason = 'Ręczna blokada Anti-Raid') {
  if (lockdownUntil > Date.now() && lockdownGuildId === guild.id) return false;

  savedOverwrites = {};

  for (const channel of getPublicTextChannels(guild).values()) {
    const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);

    savedOverwrites[channel.id] = overwrite
      ? {
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString(),
        }
      : null;

    await channel.permissionOverwrites.edit(
      guild.roles.everyone.id,
      { SendMessages: false },
      { reason }
    ).catch(() => {});
  }

  lockdownGuildId = guild.id;
  lockdownUntil = Date.now() + LOCKDOWN_MS;
  saveState();

  if (lockdownTimer) clearTimeout(lockdownTimer);
  lockdownTimer = setTimeout(() => {
    disableLockdown(guild, 'Automatyczne zakończenie blokady Anti-Raid').catch(() => {});
  }, LOCKDOWN_MS);

  await sendLog(
    guild,
    '🚨 ANTI-RAID — BLOKADA SERWERA',
    'Publiczne kanały tekstowe zostały zablokowane na **5 minut**.\nPowód: **' + reason + '**'
  );

  return true;
}

async function disableLockdown(guild, reason = 'Ręczne wyłączenie blokady Anti-Raid') {
  if (lockdownTimer) {
    clearTimeout(lockdownTimer);
    lockdownTimer = null;
  }

  for (const [channelId, previous] of Object.entries(savedOverwrites)) {
    const channel =
      guild.channels.cache.get(channelId) ||
      await guild.channels.fetch(channelId).catch(() => null);

    if (!channel || !channel.permissionOverwrites) continue;

    if (previous) {
      await channel.permissionOverwrites.edit(
        guild.roles.everyone.id,
        {
          SendMessages: null,
        },
        { reason }
      ).catch(() => {});

      await channel.permissionOverwrites.set(
        [
          ...channel.permissionOverwrites.cache
            .filter(overwrite => overwrite.id !== guild.roles.everyone.id)
            .map(overwrite => ({
              id: overwrite.id,
              type: overwrite.type,
              allow: overwrite.allow.bitfield,
              deny: overwrite.deny.bitfield,
            })),
          {
            id: guild.roles.everyone.id,
            type: 0,
            allow: BigInt(previous.allow),
            deny: BigInt(previous.deny),
          },
        ],
        reason
      ).catch(() => {});
    } else {
      await channel.permissionOverwrites.delete(guild.roles.everyone.id, reason).catch(() => {});
    }
  }

  lockdownUntil = 0;
  lockdownGuildId = null;
  savedOverwrites = {};
  saveState();

  await sendLog(
    guild,
    '✅ ANTI-RAID — ODBLOKOWANO',
    'Publiczne kanały tekstowe zostały odblokowane.'
  );
}

async function punishSpam(message, reason) {
  await message.delete().catch(() => {});

  let timeoutApplied = false;

  if (message.member?.moderatable) {
    timeoutApplied = await message.member
      .timeout(TIMEOUT_MS, reason)
      .then(() => true)
      .catch(() => false);
  }

  await sendLog(
    message.guild,
    '🛡️ ANTI-RAID — WYKRYTO SPAM',
    'Użytkownik: ' + message.author + '\nKanał: ' + message.channel.toString() + '\nPowód: **' + reason + '**\nKara: **' + (timeoutApplied ? 'Timeout 10 minut' : 'Nie udało się nadać timeoutu — sprawdź hierarchię roli bota') + '**'
  );
}

async function handleMessage(message) {
  if (!enabled || !message.guild || message.author.bot || message.system) return;
  if (isExempt(message.member)) return;

  const mentionCount =
    message.mentions.users.size +
    message.mentions.roles.size;

  if (message.mentions.everyone || mentionCount >= MASS_MENTION_LIMIT) {
    await punishSpam(message, 'Masowe pingowanie użytkowników/ról');
    return;
  }

  const key = message.guild.id + ':' + message.author.id;
  const now = Date.now();
  const timestamps = (messageBuckets.get(key) || []).filter(time => now - time <= MESSAGE_WINDOW_MS);
  timestamps.push(now);
  messageBuckets.set(key, timestamps);

  if (timestamps.length >= MESSAGE_LIMIT) {
    messageBuckets.delete(key);
    await punishSpam(message, 'Flood: ' + MESSAGE_LIMIT + ' wiadomości w ' + (MESSAGE_WINDOW_MS / 1000) + ' sekund');
  }
}

async function handleMemberAdd(member) {
  if (!enabled || member.user.bot) return;

  const now = Date.now();
  const timestamps = (joinBuckets.get(member.guild.id) || []).filter(time => now - time <= JOIN_WINDOW_MS);
  timestamps.push(now);
  joinBuckets.set(member.guild.id, timestamps);

  if (timestamps.length >= JOIN_LIMIT) {
    joinBuckets.set(member.guild.id, []);
    await enableLockdown(
      member.guild,
      'Wykryto masowe wejścia: ' + JOIN_LIMIT + ' osób w ' + (JOIN_WINDOW_MS / 1000) + ' sekund'
    );
  }
}

async function init(client, options = {}) {
  logChannelId = options.logChannelId || logChannelId;
  loadState();

  if (lockdownGuildId && lockdownUntil > Date.now()) {
    const guild =
      client.guilds.cache.get(lockdownGuildId) ||
      await client.guilds.fetch(lockdownGuildId).catch(() => null);

    if (guild) {
      const remaining = lockdownUntil - Date.now();
      if (lockdownTimer) clearTimeout(lockdownTimer);
      lockdownTimer = setTimeout(() => {
        disableLockdown(guild, 'Automatyczne zakończenie blokady Anti-Raid').catch(() => {});
      }, remaining);
    }
  } else if (lockdownUntil > 0) {
    lockdownUntil = 0;
    lockdownGuildId = null;
    savedOverwrites = {};
    saveState();
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antyraid')
    .setDescription('Zarządzanie systemem Anti-Raid.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Pokaż status systemu Anti-Raid.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('wlacz')
        .setDescription('Włącz system Anti-Raid.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('wylacz')
        .setDescription('Wyłącz system Anti-Raid.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('blokada')
        .setDescription('Zablokuj publiczne kanały tekstowe na 5 minut.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('odblokuj')
        .setDescription('Natychmiast odblokuj publiczne kanały tekstowe.')
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      const locked = lockdownUntil > Date.now();
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🛡️ Anti-Raid')
            .setDescription(
              '**System:** ' + (enabled ? '🟢 Włączony' : '🔴 Wyłączony') +
              '\n**Blokada czatów:** ' + (locked ? '🔒 Aktywna' : '🔓 Nieaktywna') +
              '\n**Anti-Flood:** ' + MESSAGE_LIMIT + ' wiadomości / ' + (MESSAGE_WINDOW_MS / 1000) + ' s' +
              '\n**Masowe wejścia:** ' + JOIN_LIMIT + ' osób / ' + (JOIN_WINDOW_MS / 1000) + ' s' +
              '\n**Timeout za spam:** 10 minut'
            )
            .setColor(0xed4245)
            .setFooter({ text: 'DreamLife RolePlay © 2026' }),
        ],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'wlacz') {
      enabled = true;
      saveState();
      await interaction.reply({ content: '✅ Anti-Raid został włączony.', ephemeral: true });
      return;
    }

    if (subcommand === 'wylacz') {
      enabled = false;
      saveState();
      await interaction.reply({ content: '✅ Anti-Raid został wyłączony.', ephemeral: true });
      return;
    }

    if (subcommand === 'blokada') {
      await interaction.deferReply({ ephemeral: true });
      const changed = await enableLockdown(interaction.guild, 'Ręczna blokada uruchomiona przez ' + interaction.user.tag);
      await interaction.editReply(changed ? '🔒 Kanały zablokowane na 5 minut.' : 'ℹ️ Blokada jest już aktywna.');
      return;
    }

    if (subcommand === 'odblokuj') {
      await interaction.deferReply({ ephemeral: true });
      await disableLockdown(interaction.guild, 'Ręczne odblokowanie przez ' + interaction.user.tag);
      await interaction.editReply('🔓 Kanały zostały odblokowane.');
    }
  },

  init,
  handleMessage,
  handleMemberAdd,
  enableLockdown,
  disableLockdown,
};
