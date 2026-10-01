const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

function hasPermission(interaction) {
  return AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changlog')
    .setDescription('Dodaj nowy changelog.'),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do użycia tej komendy.', ephemeral: true });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('changlog_modal')
      .setTitle('Nowy changelog');

    const input = new TextInputBuilder()
      .setCustomId('changlog_tresc')
      .setLabel('Jaki jest wprowadzony changelog?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Opisz wprowadzone zmiany...');

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do użycia tej komendy.', ephemeral: true });
      return;
    }

    const changelog = interaction.fields.getTextInputValue('changlog_tresc').trim();

    let nextNumber = 1;

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });

      for (const message of messages.values()) {
        if (message.author.id !== interaction.client.user.id) continue;

        for (const messageEmbed of message.embeds) {
          const title = messageEmbed.title || '';
          const match = title.match(/CHANGELOG\s*#(\d+)/i);

          if (match) {
            const number = Number.parseInt(match[1], 10);
            if (Number.isFinite(number) && number >= nextNumber) {
              nextNumber = number + 1;
            }
          }
        }
      }
    } catch (error) {
      console.error('Nie udało się odczytać numeru changeloga:', error);
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 CHANGELOG')
      .setDescription('# CHANGELOG #' + nextNumber + '\n\n' + changelog)
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
