const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const AUTHORIZED_ROLE_ID = '1517965039670132796';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Nadaj ostrzeżenie organizacji lub gangowi.')
    .addUserOption(option =>
      option
        .setName('kto')
        .setDescription('Kto otrzymuje warna?')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('organizacja')
        .setDescription('Jakiej organizacji/gangowi?')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('za_co')
        .setDescription('Za co jest warn?')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(AUTHORIZED_ROLE_ID)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('kto', true);
    const organization = interaction.options.getString('organizacja', true);
    const reason = interaction.options.getString('za_co', true);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ WARN')
      .addFields(
        { name: 'Kto', value: String(target), inline: true },
        { name: 'Jakiej organizacji/gangowi', value: organization, inline: true },
        { name: 'Za co', value: reason }
      )
      .setColor(0xed4245)
      .setFooter({ text: 'Nadane przez: ' + interaction.user.tag })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
