const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dodajrange')
    .setDescription('Nadaj użytkownikowi kilka rang naraz.')
    .addUserOption(option =>
      option
        .setName('osoba')
        .setDescription('Komu nadać rangi?')
        .setRequired(true)
    )
    .addRoleOption(option => option.setName('ranga1').setDescription('Pierwsza ranga').setRequired(true))
    .addRoleOption(option => option.setName('ranga2').setDescription('Druga ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga3').setDescription('Trzecia ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga4').setDescription('Czwarta ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga5').setDescription('Piąta ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga6').setDescription('Szósta ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga7').setDescription('Siódma ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga8').setDescription('Ósma ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga9').setDescription('Dziewiąta ranga').setRequired(false))
    .addRoleOption(option => option.setName('ranga10').setDescription('Dziesiąta ranga').setRequired(false)),

  async execute(interaction) {
    if (!AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('osoba', true);
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.editReply('❌ Nie udało się znaleźć tego użytkownika na serwerze.');
      return;
    }

    const roles = [];
    for (let i = 1; i <= 10; i++) {
      const role = interaction.options.getRole('ranga' + i, false);
      if (role && !roles.some(existing => existing.id === role.id)) roles.push(role);
    }

    const me = interaction.guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('❌ Bot nie ma permisji Zarządzanie rolami.');
      return;
    }

    const invalidRole = roles.find(role =>
      role.id === interaction.guild.roles.everyone.id ||
      role.managed ||
      me.roles.highest.position <= role.position
    );

    if (invalidRole) {
      await interaction.editReply('❌ Nie mogę nadać rangi **' + invalidRole.name + '**. Sprawdź hierarchię rang lub czy ranga nie jest zarządzana przez integrację.');
      return;
    }

    const rolesToAdd = roles.filter(role => !member.roles.cache.has(role.id));

    if (rolesToAdd.length === 0) {
      await interaction.editReply('ℹ️ Ta osoba ma już wszystkie wybrane rangi.');
      return;
    }

    try {
      await member.roles.add(
        rolesToAdd,
        'Rangi nadane przez ' + interaction.user.tag + ' komendą /dodajrange'
      );

      await interaction.editReply(
        '✅ Nadano rangi użytkownikowi ' + targetUser + ':\n' +
        rolesToAdd.map(role => '• ' + role.toString()).join('\n')
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Nie udało się nadać wybranych rang.');
    }
  },
};
