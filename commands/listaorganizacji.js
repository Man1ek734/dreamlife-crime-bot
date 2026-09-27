const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1437087479932129354';

const DEFAULT_ORGANIZATIONS = [
  { name: 'Rose Dominion', roleId: '1547700105325322380' },
  { name: 'Arizona', roleId: '1549125879454761012' },
];

const PANEL_TITLE = '🏢 Lista organizacji';

function extractRoleIdsFromPanels(panels) {
  const ids = new Set();

  for (const panel of panels) {
    const description = panel.embeds?.[0]?.description || '';

    for (const match of description.matchAll(/<@&(\d+)>/g)) {
      ids.add(match[1]);
    }
  }

  return ids;
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
    .setColor(0xed4245)
    .setFooter({ text: 'DreamLife RolePlay © 2026 • Lista aktualizuje się automatycznie' })
    .setTimestamp();
}

async function updateOrganizationList(client, extraRole = null, removedRoleId = null) {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased() || !channel.guild) {
    throw new Error('Nie znaleziono kanału listy organizacji: ' + CHANNEL_ID);
  }

  await channel.guild.roles.fetch();

  const messages = await channel.messages.fetch({ limit: 100 });

  const panels = [...messages.values()].filter(message =>
    message.author.id === client.user.id &&
    message.embeds.some(embed => embed.title === PANEL_TITLE)
  );

  const roleIds = new Set(DEFAULT_ORGANIZATIONS.map(org => org.roleId));

  for (const roleId of extractRoleIdsFromPanels(panels)) {
    roleIds.add(roleId);
  }

  if (extraRole) {
    roleIds.add(extraRole.id);
  }

  if (removedRoleId) {
    roleIds.delete(removedRoleId);
  }

  const organizations = [];

  for (const roleId of roleIds) {
    if (removedRoleId && roleId === removedRoleId) continue;

    if (extraRole && roleId === extraRole.id) {
      organizations.push(extraRole);
      continue;
    }

    const role = await channel.guild.roles.fetch(roleId).catch(() => null);
    if (role) {
      organizations.push(role);
    }
  }

  if (
    extraRole &&
    !removedRoleId &&
    !organizations.some(role => role.id === extraRole.id)
  ) {
    organizations.push(extraRole);
  }

  for (const panel of panels) {
    await panel.delete().catch(() => {});
  }

  const newPanel = await channel.send({
    embeds: [buildOrganizationEmbed(organizations)],
  });

  console.log(
    'Lista organizacji odświeżona na kanale ' +
    CHANNEL_ID +
    '. Liczba organizacji: ' +
    organizations.length
  );

  return newPanel;
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

    try {
      await updateOrganizationList(interaction.client);
      await interaction.editReply('✅ Lista organizacji została odświeżona.');
    } catch (error) {
      console.error('Błąd odświeżania listy organizacji:', error);
      await interaction.editReply('❌ Nie udało się odświeżyć listy organizacji.');
    }
  },

  async updateOrganizationList(client, removedRoleId = null) {
    return updateOrganizationList(client, null, removedRoleId);
  },

  async registerOrganization(client, role) {
    return updateOrganizationList(client, role, null);
  },
};
