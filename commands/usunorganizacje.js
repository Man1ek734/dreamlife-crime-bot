const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const listaorganizacji = require('./listaorganizacji');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];
const ORGANIZACJA_PARENT_ROLE_ID = '1437206381856948334';

function hasPermission(interaction) {
  return AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('usunorganizacje')
    .setDescription('Usuń rangę organizacji i usuń ją z listy.')
    .addRoleOption(option =>
      option
        .setName('ranga')
        .setDescription('Wybierz rangę organizacji do usunięcia')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({ content: '❌ Nie masz uprawnień do tej komendy.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('ranga', true);

    if (role.id === interaction.guild.roles.everyone.id || role.id === ORGANIZACJA_PARENT_ROLE_ID) {
      await interaction.editReply('❌ Tej roli nie można usunąć.');
      return;
    }

    if (role.managed) {
      await interaction.editReply('❌ Tej roli nie można usunąć, ponieważ jest zarządzana przez Discorda lub integrację.');
      return;
    }

    const me = interaction.guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('❌ Bot nie ma permisji Zarządzanie rolami.');
      return;
    }

    if (me.roles.highest.position <= role.position) {
      await interaction.editReply('❌ Ranga bota musi być wyżej niż usuwana rola.');
      return;
    }

    const roleName = role.name;

    try {
      await role.delete('Usunięto rangę organizacji przez ' + interaction.user.tag + ' komendą /usunorganizacje');

      await listaorganizacji.updateOrganizationList(interaction.client, role.id).catch(error => {
        console.error('Nie udało się odświeżyć listy organizacji po usunięciu:', error);
      });

      await interaction.editReply('✅ Usunięto rangę **' + roleName + '** i usunięto ją z listy organizacji.');
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Nie udało się usunąć tej rangi.');
    }
  },
};
