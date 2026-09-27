const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1437087479932129354';

const DEFAULT_ORGANIZATIONS = [
  { name: 'Rose Dominion', roleId: '1547700105325322380' },
  { name: 'Arizona', roleId: '1549125879454761012' },
];

const PANEL_TITLE = '🏢 Lista organizacji';

function extractRoleIdsFromPanel(panel) {
  const ids = new Set();

  const description = panel?.embeds?.[0]?.description || '';
  for (const match of description.matchAll(/<@&(\d+)>/g)) {
    ids.add(match[1]);
  }

  return ids;
}

async function findPanel(channel, client) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return null;

  return messages.find(message =>
    message.author.id === client.user.id &&
    message.embeds.some(embed => embed.title === PANEL_TITLE)
  ) || null;
}

function getOrganizations(guild, panel, extraRole = null) {
  const roleIds = new Set(DEFAULT_ORGANIZATIONS.map(org => org.roleId));

  for (const roleId of extractRoleIdsFromPanel(panel)) {
    roleIds.add(roleId);
  }

  if (extraRole) {
    roleIds.add(extraRole.id);
  }

  return [...roleIds]
    .map(roleId => guild.roles.cache.get(roleId))
    .filter(Boolean);
}

function buildOrganizationEmbed(roles) {
  const list = roles.length
    ? roles.map((role, index) => '**' + (index + 1) + '.** ' + role.toString()).join('\n')
    : '*Brak organizacji na liście.*';

  return new EmbedBuilder()
    .setTitle(PANEL_TITLE)
    .setDescription(
      '**Aktualna lista organizacji na DreamLifeRP Crime**\n\n' +
      list
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Lista aktualizuje się automatycznie' })
    .setTimestamp();
}

async function updateOrganizationList(client, extraRole = null) {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || !channel.guild) return;

  await channel.guild.roles.fetch().catch(() => {});

  let panel = await findPanel(channel, client);
  const organizations = getOrganizations(channel.guild, panel, extraRole);
  const payload = { embeds: [buildOrganizationEmbed(organizations)] };

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
    .setName('listaorganizacji')
    .setDescription('Wyświetl i odśwież listę organizacji.'),

  async execute(interaction) {
    if (interaction.channelId !== CHANNEL_ID) {
      await interaction.reply({
        content: '❌ Tej komendy używaj na kanale <#' + CHANNEL_ID + '>.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    await updateOrganizationList(interaction.client);
    await interaction.editReply('✅ Lista organizacji została odświeżona.');
  },

  async updateOrganizationList(client) {
    return updateOrganizationList(client);
  },

  async registerOrganization(client, role) {
    return updateOrganizationList(client, role);
  },
};
