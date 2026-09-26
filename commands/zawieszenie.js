const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zawieszenie')
    .setDescription('Nadaj zawieszenie opiekunowi.')
    .addUserOption(option =>
      option
        .setName('opiekun')
        .setDescription('Wybierz opiekuna')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('za_co')
        .setDescription('Podaj powód zawieszenia')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const guardian = interaction.options.getUser('opiekun', true);
    const reason = interaction.options.getString('za_co', true);

    const embed = new EmbedBuilder()
      .setTitle('⛔ ZAWIESZENIE')
      .setColor(0xed4245)
      .addFields(
        { name: 'Opiekun:', value: String(guardian), inline: false },
        { name: 'Za co:', value: reason, inline: false }
      )
      .setFooter({ text: 'Wystawił: ' + interaction.user.tag })
      .setTimestamp();

    await interaction.reply({
      content: String(guardian),
      embeds: [embed],
      allowedMentions: { users: [guardian.id] },
    });
  },
};
