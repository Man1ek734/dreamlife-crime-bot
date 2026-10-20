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
    .setName('ogloszenia')
    .setDescription('Wyślij nowe ogłoszenie.'),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do użycia tej komendy.', ephemeral: true });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('ogloszenia_modal')
      .setTitle('Nowe ogłoszenie');

    const input = new TextInputBuilder()
      .setCustomId('ogloszenia_tresc')
      .setLabel('Treść ogłoszenia')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Wpisz treść ogłoszenia...');

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do użycia tej komendy.', ephemeral: true });
      return;
    }

    const tresc = interaction.fields.getTextInputValue('ogloszenia_tresc').trim();

    const embed = new EmbedBuilder()
      .setDescription('# OGŁOSZENIE\n\n' + tresc)
      .setColor(0xed4245)
      .setFooter({ text: 'DreamLife RolePlay © 2026' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
