const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const kolory = require('./kolory');
const listagangow = require('./listagangow');

const STAFF_ROLE_IDS = ['1517965039670132796', '1465810885489725533', '1542655009626390729', '1537461404032958474'];
const GANG_MANAGEMENT_ROLE_IDS = ['1437113897671720961', '1437092776675377303'];
const ORGANIZATION_MANAGEMENT_ROLE_IDS = ['1517920258390757407', '1517920073011036212'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zmienkolor')
    .setDescription('Zmień kolor swojego gangu lub organizacji.')
    .addStringOption(option =>
      option
        .setName('hex')
        .setDescription('Kolor HEX, np. #E53935')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('nazwa_koloru')
        .setDescription('Opcjonalna nazwa koloru, np. Czerwony')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const hex = kolory.normalizeHex(interaction.options.getString('hex', true));

    if (!hex) {
      await interaction.editReply('❌ Podaj poprawny HEX, np. #E53935.');
      return;
    }

    await interaction.guild.roles.fetch().catch(() => {});

    const gangRoles = member.roles.cache.filter(role =>
      role.id !== interaction.guild.roles.everyone.id &&
      listagangow.isTrackedRole(role.id)
    );

    const organizationRoles = [];
    for (const role of member.roles.cache.values()) {
      if (role.id === interaction.guild.roles.everyone.id) continue;

      const isOrganization = await kolory
        .hasEntry(interaction.client, 'organization', role.name)
        .catch(() => false);

      if (isOrganization) {
        organizationRoles.push(role);
      }
    }

    const ownedTeams = [
      ...gangRoles.map(role => ({ type: 'gang', role })),
      ...organizationRoles.map(role => ({ type: 'organization', role })),
    ];

    if (ownedTeams.length !== 1) {
      await interaction.editReply(
        ownedTeams.length === 0
          ? '❌ Nie udało mi się ustalić Twojego gangu lub organizacji.'
          : '❌ Masz przypisaną więcej niż jedną ekipę. Nie mogę automatycznie wybrać właściwej.'
      );
      return;
    }

    const team = ownedTeams[0];
    const isStaff = STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
    const hasTeamPermission = team.type === 'gang'
      ? GANG_MANAGEMENT_ROLE_IDS.some(roleId => member.roles.cache.has(roleId))
      : ORGANIZATION_MANAGEMENT_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));

    if (!isStaff && !hasTeamPermission) {
      await interaction.editReply(
        team.type === 'gang'
          ? '❌ Kolor gangu może zmienić tylko Zarząd Gangu lub OG Gangu.'
          : '❌ Kolor organizacji może zmienić tylko Zarząd Organizacji lub Założyciel Organizacji.'
      );
      return;
    }

    const me = interaction.guild.members.me;
    if (
      !me?.permissions.has(PermissionFlagsBits.ManageRoles) ||
      team.role.managed ||
      me.roles.highest.position <= team.role.position
    ) {
      await interaction.editReply('❌ Bot nie może zmienić koloru roli tej ekipy. Sprawdź hierarchię roli bota.');
      return;
    }

    const providedColorName = interaction.options.getString('nazwa_koloru')?.trim();
    const colorName = providedColorName || kolory.inferColorName(hex);

    try {
      await team.role.setColor(hex, 'Kolor ekipy zmieniony przez ' + interaction.user.tag);
      await kolory.upsertColor(interaction.client, team.type, team.role, colorName, hex);

      await interaction.editReply(
        '✅ Zmieniono kolor **' + team.role.name + '** na **' + colorName + '** (' + hex + '). Panel kolorów został zaktualizowany.'
      );
    } catch (error) {
      console.error('Błąd /zmienkolor:', error);
      await interaction.editReply('❌ Nie udało się zmienić koloru ekipy.');
    }
  },
};
