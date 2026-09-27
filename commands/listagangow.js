const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1526702978009137282';

const GANGS = [
  { name: 'Ballas', roleId: '1437114621214593024' },
  { name: 'Rollin 20s Bloods', roleId: '1437092676703879178' },
  { name: 'Varrios Los Aztecas', roleId: '1528923960689823876' },
  { name: 'MS-13', roleId: '1553471165262209065' },
  { name: 'The Famillies', roleId: '1437116924902506728' },
  { name: 'The Lost MC', roleId: '1535749163537661963' },
];

const PANEL_TITLE = '📋 Lista gangów';

function buildGangListEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle(PANEL_TITLE)
    .setColor(0xed4245)
    .setDescription('Status miejsc w gangach aktualizuje się automatycznie.')
    .setTimestamp();

  for (const gang of GANGS) {
    const role = guild.roles.cache.get(gang.roleId);
    const count = role ? role.members.size : 0;
    const status = count === 0 ? '🟢 WOLNE' : '🔴 ZAJĘTE';

    embed.addFields({
      name: gang.name,
      value: status,
      inline: false,
    });
  }

  return embed;
}

async function updateGangList(client) {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || !channel.guild) return;

  await channel.guild.members.fetch().catch(() => {});

  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return;

  let panel = messages.find(message =>
    message.author.id === client.user.id &&
    message.embeds.some(embed => embed.title === PANEL_TITLE)
  );

  const payload = { embeds: [buildGangListEmbed(channel.guild)] };

  if (panel) {
    await panel.edit(payload);
  } else {
    panel = await channel.send(payload);
  }

  return panel;
}

module.exports = {
  CHANNEL_ID,
  GANGS,
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

  isTrackedRole(roleId) {
    return GANGS.some(gang => gang.roleId === roleId);
  },
};
