const {
  SlashCommandBuilder,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

function hasPermission(interaction) {
  return AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nadajrange')
    .setDescription('Nadaj użytkownikowi kilka rang naraz.')
    .addUserOption(option =>
      option
        .setName('osoba')
        .setDescription('Wybierz osobę')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getMember('osoba');

    if (!target) {
      await interaction.reply({
        content: '❌ Nie udało się znaleźć tej osoby na serwerze.',
        ephemeral: true,
      });
      return;
    }

    const menu = new RoleSelectMenuBuilder()
      .setCustomId(`nadajrange_select:${target.id}`)
      .setPlaceholder('Wybierz rangi do nadania')
      .setMinValues(1)
      .setMaxValues(10);

    await interaction.reply({
      content: `Wybierz rangi, które chcesz nadać użytkownikowi ${target}:`,
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },

  async handleSelect(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const targetId = interaction.customId.split(':')[1];
    const target = await interaction.guild.members.fetch(targetId).catch(() => null);

    if (!target) {
      await interaction.update({
        content: '❌ Nie udało się znaleźć tej osoby.',
        components: [],
      });
      return;
    }

    const me = interaction.guild.members.me;

    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.update({
        content: '❌ Bot nie ma permisji Zarządzanie rolami.',
        components: [],
      });
      return;
    }

    const selectedRoles = [];
    const skippedRoles = [];

    for (const roleId of interaction.values) {
      const role = interaction.guild.roles.cache.get(roleId)
        || await interaction.guild.roles.fetch(roleId).catch(() => null);

      if (!role) continue;

      if (
        role.id === interaction.guild.roles.everyone.id ||
        role.managed ||
        me.roles.highest.position <= role.position
      ) {
        skippedRoles.push(role.name);
        continue;
      }

      selectedRoles.push(role);
    }

    if (!selectedRoles.length) {
      await interaction.update({
        content: '❌ Nie mogę nadać żadnej z wybranych rang. Sprawdź hierarchię rang bota.',
        components: [],
      });
      return;
    }

    try {
      await target.roles.add(
        selectedRoles.map(role => role.id),
        'Nadano komendą /nadajrange przez ' + interaction.user.tag
      );

      let message =
        '✅ Nadano użytkownikowi ' + target + ' rangi:\n' +
        selectedRoles.map(role => '• ' + role.toString()).join('\n');

      if (skippedRoles.length) {
        message +=
          '\n\n⚠️ Pominięto rangi, których bot nie może nadać:\n' +
          skippedRoles.map(name => '• ' + name).join('\n');
      }

      await interaction.update({
        content: message,
        components: [],
        allowedMentions: { users: [target.id], roles: [] },
      });
    } catch (error) {
      console.error(error);
      await interaction.update({
        content: '❌ Nie udało się nadać wybranych rang.',
        components: [],
      });
    }
  },
};
