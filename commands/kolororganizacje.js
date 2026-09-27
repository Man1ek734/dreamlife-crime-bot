const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const kolory = require('./kolory');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

function hasPermission(interaction) {
  return AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kolororganizacje')
    .setDescription('Przypisz kolor do organizacji.')
    .addRoleOption(option =>
      option.setName('organizacja').setDescription('Ranga organizacji').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nazwa_koloru').setDescription('Np. Pomarańczowy, Jasnoniebieski').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('hex').setDescription('Np. #FB8C00').setRequired(true)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do tej komendy.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('organizacja', true);
    const colorName = interaction.options.getString('nazwa_koloru', true).trim();
    const hex = kolory.normalizeHex(interaction.options.getString('hex', true));

    if (!hex) {
      await interaction.editReply('❌ Podaj poprawny HEX, np. #FB8C00.');
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles) || me.roles.highest.position <= role.position) {
      await interaction.editReply('❌ Bot nie może zmienić koloru tej roli.');
      return;
    }

    try {
      await role.setColor(hex, 'Kolor organizacji ustawiony przez ' + interaction.user.tag);
      await kolory.upsertColor(interaction.client, 'organization', role, colorName, hex);
      await interaction.editReply('✅ Ustawiono **' + colorName + '** (' + hex + ') dla ' + role + ' i zaktualizowano panel.');
    } catch (error) {
      console.error('Błąd /kolororganizacje:', error);
      await interaction.editReply('❌ Nie udało się ustawić koloru organizacji.');
    }
  },
};
