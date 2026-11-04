const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1437087479932129354';

const DEFAULT_ORGANIZATIONS = [
  { name: 'T6', roleId: '1567621318642368673' },
];
const REMOVED_ORGANIZATION_ROLE_IDS = new Set([
  '1547700105325322380',
  '1549125879454761012',
]);

const PANEL_TITLE = '📋 Lista organizacji';
const OLD_PANEL_TITLE = '🏢 Lista organizacji';

function extractOrganizationNamesFromPanels(panels) {
  const names = new Set();

  for (const panel of panels) {
    const embed = panel.embeds?.[0];
    if (!embed) continue;

    const description = embed.description || '';
    const lines = description.split('\n');

    for (const line of lines) {
      const match = line.trim().match(/^\*\*(.+)\*\*$/);
      if (!match) continue;

      const name = match[1].trim();
      if (!name || name === 'Aktualna lista organizacji DreamLifeRP Crime') continue;

      names.add(name);
    }
  }

  return names;
}

function buildOrganizationEmbed(roles) {
  const list = roles.length
    ? roles.map(role => '**' + role.name + '**').join('\n')
    : '*Brak organizacji na liście.*';

  return new EmbedBuilder()
    .setTitle(PANEL_TITLE)
    .setColor(0xed4245)
    .setDescription(
      '**Aktualna lista organizacji DreamLifeRP Crime**\n' +
      list
    )
    .setFooter({ text: 'DreamLife RolePlay © 2026' })
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
    message.embeds.some(embed =>
      embed.title === PANEL_TITLE || embed.title === OLD_PANEL_TITLE
    )
  );

  const roleIds = new Set(DEFAULT_ORGANIZATIONS.map(org => org.roleId));

  for (const name of extractOrganizationNamesFromPanels(panels)) {
    const role = channel.guild.roles.cache.find(
      guildRole => guildRole.name.toLowerCase() === name.toLowerCase()
    );

    if (role && !REMOVED_ORGANIZATION_ROLE_IDS.has(role.id)) {
      roleIds.add(role.id);
    }
  }

  if (extraRole && !REMOVED_ORGANIZATION_ROLE_IDS.has(extraRole.id)) {
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

  const payload = {
    embeds: [buildOrganizationEmbed(organizations)],
  };

  let mainPanel = panels[0] || null;

  for (const duplicate of panels.slice(1)) {
    await duplicate.delete().catch(() => {});
  }

  if (mainPanel) {
    await mainPanel.edit(payload);
  } else {
    mainPanel = await channel.send(payload);
  }

  console.log(
    'Lista organizacji odświeżona na kanale ' +
    CHANNEL_ID +
    '. Liczba organizacji: ' +
    organizations.length
  );

  return mainPanel;
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
