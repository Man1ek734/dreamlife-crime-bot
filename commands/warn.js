const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

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
    .addRoleOption(option =>
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
    if (!AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('kto', true);
    const organization = interaction.options.getRole('organizacja', true);
    const reason = interaction.options.getString('za_co', true);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ WARN')
      .addFields(
        { name: 'Kto:', value: String(target), inline: false },
        { name: 'Jakiej organizacji/gangowi:', value: String(organization), inline: false },
        { name: 'Za co:', value: reason, inline: false }
      )
      .setColor(0xed4245)
      .setFooter({ text: 'Wystawił: ' + interaction.user.tag })
      .setTimestamp();

    await interaction.reply({
      content: String(target) + ' ・ ' + String(organization),
      embeds: [embed],
      allowedMentions: { users: [target.id], roles: [organization.id] },
    });
  },
};
