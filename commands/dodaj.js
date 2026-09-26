const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];
const ORGANIZACJA_PARENT_ROLE_ID = '1437206381856948334';

function parseHex(input) {
  const value = input.trim().replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(value)) return null;
  return Number.parseInt(value, 16);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dodaj')
    .setDescription('Dodawanie elementów Crime.')
    .addSubcommand(sub =>
      sub.setName('org')
        .setDescription('Utwórz rangę organizacji.')
        .addStringOption(o => o.setName('nazwa').setDescription('Nazwa organizacji').setRequired(true))
        .addStringOption(o => o.setName('kolor').setDescription('Kolor HEX, np. #FF0000').setRequired(true))
    ),

  async execute(interaction) {
    if (!AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do tej komendy.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('nazwa', true).trim();
    const color = parseHex(interaction.options.getString('kolor', true));
    if (color === null) {
      await interaction.editReply('❌ Podaj poprawny HEX, np. #FF0000.');
      return;
    }

    const parentRole = await interaction.guild.roles.fetch(ORGANIZACJA_PARENT_ROLE_ID).catch(() => null);
    if (!parentRole) {
      await interaction.editReply('❌ Nie znalazłem rangi Organizacja.');
      return;
    }

    const me = interaction.guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('❌ Bot nie ma permisji Zarządzanie rolami.');
      return;
    }

    if (me.roles.highest.position <= parentRole.position) {
      await interaction.editReply('❌ Ranga bota musi być wyżej niż ranga Organizacja.');
      return;
    }

    const exists = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      await interaction.editReply('❌ Taka ranga już istnieje.');
      return;
    }

    try {
      const role = await interaction.guild.roles.create({
        name: name,
        color: color,
        hoist: true,
        mentionable: true,
        reason: 'Utworzono przez ' + interaction.user.tag + ' komendą /dodaj org'
      });

      await role.setPosition(Math.max(parentRole.position - 1, 1));
      const hex = '#' + color.toString(16).padStart(6, '0').toUpperCase();
      await interaction.editReply('✅ Utworzono rangę ' + role + '\n**Nazwa:** ' + name + '\n**Kolor:** ' + hex + '\n**Wyświetlanie osobno:** włączone');
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Nie udało się utworzyć rangi.');
    }
  }
};
