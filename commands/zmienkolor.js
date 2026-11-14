const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const kolory = require('./kolory');
const listagangow = require('./listagangow');

const AUTHORIZED_ROLE_IDS = [
  '1537461404032958474',
  '1542655009626390729',
  '1517965039670132796',
  '1465810885489725533',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zmienkolor')
    .setDescription('Zmień kolor wybranego gangu lub organizacji.')
    .addStringOption(option =>
      option
        .setName('nazwa')
        .setDescription('Nazwa gangu lub organizacji, np. Ballas')
        .setRequired(true)
    )
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

    const hasPermission = AUTHORIZED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      await interaction.editReply('❌ Nie masz uprawnień do tej komendy.');
      return;
    }

    const teamInput = interaction.options.getString('nazwa', true).trim();
    const roleMentionMatch = teamInput.match(/^<@&(\d{17,22})>$/);

    let role = null;

    if (roleMentionMatch) {
      role = interaction.guild.roles.cache.get(roleMentionMatch[1])
        || await interaction.guild.roles.fetch(roleMentionMatch[1]).catch(() => null);
    } else {
      const wantedName = teamInput
        .replace(/^@/, '')
        .trim()
        .toLocaleLowerCase('pl-PL');

      const matchingRoles = interaction.guild.roles.cache.filter(candidate =>
        candidate.id !== interaction.guild.roles.everyone.id &&
        candidate.name.trim().toLocaleLowerCase('pl-PL') === wantedName
      );

      if (matchingRoles.size > 1) {
        await interaction.editReply('❌ Znalazłem więcej niż jedną rolę o tej nazwie. Użyj oznaczenia roli.');
        return;
      }

      role = matchingRoles.first() || null;
    }

    if (!role) {
      await interaction.editReply('❌ Nie znalazłem gangu ani organizacji dla **' + teamInput + '**.');
      return;
    }
    const isGang = listagangow.isTrackedRole(role.id);
    const isOrganization = await kolory
      .hasEntry(interaction.client, 'organization', role.name)
      .catch(() => false);

    if (!isGang && !isOrganization) {
      await interaction.editReply('❌ Ta rola nie jest przypisana do żadnego gangu ani organizacji.');
      return;
    }

    const team = {
      type: isGang ? 'gang' : 'organization',
      role,
    };

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
