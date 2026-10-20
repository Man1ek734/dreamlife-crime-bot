const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

function hasPermission(interaction) {
  return (
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Usuń wybraną liczbę wiadomości z kanału.')
    .addIntegerOption(option =>
      option
        .setName('ilosc')
        .setDescription('Ile wiadomości usunąć?')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({
        content: '❌ Tej komendy można użyć tylko na kanale tekstowym.',
        ephemeral: true,
      });
      return;
    }

    const amount = interaction.options.getInteger('ilosc', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);

      await interaction.editReply(
        `✅ Usunięto **${deleted.size}** wiadomości.`
      );
    } catch (error) {
      console.error('Błąd komendy /clear:', error);
      await interaction.editReply(
        '❌ Nie udało się usunąć wiadomości. Sprawdź uprawnienia bota.'
      );
    }
  },
};
