const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const listagangow = require('./listagangow');
const kolory = require('./kolory');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];
const GANG_PARENT_ROLE_ID = '1437087475704266929';

function parseHex(input) {
  const value = input.trim().replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(value)) return null;
  return Number.parseInt(value, 16);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dodajgang')
    .setDescription('Utwórz rangę gangu.')
    .addStringOption(o => o.setName('nazwa_gangu').setDescription('Nazwa gangu').setRequired(true))
    .addStringOption(o => o.setName('kolor').setDescription('Hex, np. #FF0000').setRequired(true)),

  async execute(interaction) {
    if (!AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do tej komendy.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('nazwa_gangu', true).trim();
    const color = parseHex(interaction.options.getString('kolor', true));
    if (color === null) {
      await interaction.editReply('❌ Podaj poprawny HEX, np. #FF0000.');
      return;
    }

    const parentRole = await interaction.guild.roles.fetch(GANG_PARENT_ROLE_ID).catch(() => null);
    if (!parentRole) {
      await interaction.editReply('❌ Nie znalazłem rangi Gang.');
      return;
    }

    const me = interaction.guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('❌ Bot nie ma permisji Zarządzanie rolami.');
      return;
    }

    if (me.roles.highest.position <= parentRole.position) {
      await interaction.editReply('❌ Ranga bota musi być wyżej niż ranga Gang.');
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
        mentionable: false,
        permissions: [],
        reason: 'Utworzono przez ' + interaction.user.tag + ' komendą /dodajgang'
      });

      await role.setPosition(Math.max(parentRole.position - 1, 1));
      await listagangow.registerGang(interaction.client, role).catch(error => {
        console.error('Nie udało się dodać gangu do listy:', error);
      });

      const hex = '#' + color.toString(16).padStart(6, '0').toUpperCase();

      await kolory.upsertColor(
        interaction.client,
        'gang',
        role,
        kolory.inferColorName(hex),
        hex
      ).catch(error => {
        console.error('Nie udało się dodać koloru gangu do panelu:', error);
      });
      await interaction.editReply('✅ Utworzono rangę ' + role + '\n**Nazwa:** ' + name + '\n**Kolor:** ' + hex + '\n**Wyświetlanie osobno:** włączone');
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Nie udało się utworzyć rangi.');
    }
  }
};
