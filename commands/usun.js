const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];
const ORGANIZACJA_PARENT_ROLE_ID = '1437206381856948334';
const GANG_PARENT_ROLE_ID = '1437087475704266929';

function hasPermission(interaction) {
  return AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));
}

async function removeRole(interaction, type) {
  if (!hasPermission(interaction)) {
    await interaction.reply({
      content: '❌ Nie masz uprawnień do tej komendy.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const role = interaction.options.getRole('ranga', true);
  const protectedRoleId = type === 'org' ? ORGANIZACJA_PARENT_ROLE_ID : GANG_PARENT_ROLE_ID;
  const label = type === 'org' ? 'organizacji' : 'gangu';

  if (role.id === interaction.guild.roles.everyone.id) {
    await interaction.editReply('❌ Nie można usunąć roli @everyone.');
    return;
  }

  if (role.id === protectedRoleId) {
    await interaction.editReply('❌ Nie można usunąć głównej rangi działu.');
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
    await role.delete(
      'Usunięto rangę ' + label + ' przez ' + interaction.user.tag + ' komendą /usun ' + type
    );

    await interaction.editReply('✅ Usunięto rangę **' + roleName + '**.');
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Nie udało się usunąć tej rangi.');
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('usun')
    .setDescription('Usuń rangę organizacji lub gangu.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('org')
        .setDescription('Usuń rangę organizacji.')
        .addRoleOption(option =>
          option
            .setName('ranga')
            .setDescription('Wybierz rangę organizacji do usunięcia')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('gang')
        .setDescription('Usuń rangę gangu.')
        .addRoleOption(option =>
          option
            .setName('ranga')
            .setDescription('Wybierz rangę gangu do usunięcia')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'org') {
      await removeRole(interaction, 'org');
      return;
    }

    if (subcommand === 'gang') {
      await removeRole(interaction, 'gang');
    }
  },
};
