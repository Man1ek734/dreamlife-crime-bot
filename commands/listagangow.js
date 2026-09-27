const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1526702978009137282';

const DEFAULT_GANGS = [
  { name: 'Ballas', roleId: '1437114621214593024' },
  { name: 'Rollin 20s Bloods', roleId: '1437092676703879178' },
  { name: 'Varrios Los Aztecas', roleId: '1528923960689823876' },
  { name: 'MS-13', roleId: '1553471165262209065' },
  { name: 'The Famillies', roleId: '1437116924902506728' },
  { name: 'The Lost MC', roleId: '1535749163537661963' },
];

const PANEL_TITLE = '📋 Lista gangów';
const trackedRoleIds = new Set(DEFAULT_GANGS.map(gang => gang.roleId));

function getGangMap(guild, panel, extraRole = null) {
  const gangs = new Map();

  for (const gang of DEFAULT_GANGS) {
    const role = guild.roles.cache.get(gang.roleId);
    if (role) {
      gangs.set(role.id, { name: gang.name, roleId: role.id });
      trackedRoleIds.add(role.id);
    }
  }

  if (panel?.embeds?.[0]?.fields) {
    for (const field of panel.embeds[0].fields) {
      const role = guild.roles.cache.find(r => r.name === field.name);
      if (role) {
        gangs.set(role.id, { name: role.name, roleId: role.id });
        trackedRoleIds.add(role.id);
      }
    }
  }

  if (extraRole) {
    gangs.set(extraRole.id, { name: extraRole.name, roleId: extraRole.id });
    trackedRoleIds.add(extraRole.id);
  }

  return [...gangs.values()];
}

function buildGangListEmbed(guild, gangs) {
  const embed = new EmbedBuilder()
    .setTitle(PANEL_TITLE)
    .setColor(0xed4245)
    .setDescription('Status miejsc w gangach aktualizuje się automatycznie.')
    .setFooter({ text: 'DreamLife RolePlay © 2026' })
    .setTimestamp();

  for (const gang of gangs) {
    const role = guild.roles.cache.get(gang.roleId);
    if (!role) continue;

    const count = role.members.size;
    const status = count === 0 ? '🟢 WOLNE' : '🔴 ZAJĘTE';

    embed.addFields({
      name: role.name,
      value: status,
      inline: false,
    });
  }

  return embed;
}

async function findPanel(channel, client) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return null;

  return messages.find(message =>
    message.author.id === client.user.id &&
    message.embeds.some(embed => embed.title === PANEL_TITLE)
  ) || null;
}

async function updateGangList(client, extraRole = null) {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || !channel.guild) return;

  await channel.guild.members.fetch().catch(() => {});
  await channel.guild.roles.fetch().catch(() => {});

  let panel = await findPanel(channel, client);
  const gangs = getGangMap(channel.guild, panel, extraRole);
  const payload = { embeds: [buildGangListEmbed(channel.guild, gangs)] };

  if (panel) {
    await panel.edit(payload);
  } else {
    panel = await channel.send(payload);
  }

  return panel;
}

module.exports = {
  CHANNEL_ID,
  data: new SlashCommandBuilder()
    .setName('listagangow')
    .setDescription('Wyświetl i odśwież listę gangów.'),

  async execute(interaction) {
    if (interaction.channelId !== CHANNEL_ID) {
      await interaction.reply({
        content: '❌ Tej komendy używaj na kanale <#' + CHANNEL_ID + '>.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    await updateGangList(interaction.client);
    await interaction.editReply('✅ Lista gangów została odświeżona.');
  },

  async updateGangList(client) {
    return updateGangList(client);
  },

  async registerGang(client, role) {
    return updateGangList(client, role);
  },

  isTrackedRole(roleId) {
    return trackedRoleIds.has(roleId);
  },
};
