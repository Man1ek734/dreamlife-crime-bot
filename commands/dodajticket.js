const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

function canManageTicket(interaction, ownerId) {
  return (
    interaction.user.id === ownerId ||
    AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId)) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dodaj')
    .setDescription('Dodaj osobę do aktualnego ticketa.')
    .addUserOption(option =>
      option
        .setName('osoba')
        .setDescription('Osoba, którą chcesz dodać do ticketa')
        .setRequired(true)
    ),

  async execute(interaction) {
    const ownerMatch = interaction.channel?.topic?.match(/ticketOwner:(\d+)/);
    const ownerId = ownerMatch?.[1];

    if (!ownerId) {
      await interaction.reply({
        content: '❌ Tej komendy możesz użyć tylko na kanale ticketa.',
        ephemeral: true,
      });
      return;
    }

    if (!canManageTicket(interaction, ownerId)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do dodawania osób do tego ticketa.',
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser('osoba', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: '❌ Nie udało się znaleźć tej osoby na serwerze.',
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      });

      await interaction.reply({
        content: '✅ Dodano ' + member.toString() + ' do ticketa.',
        allowedMentions: { users: [member.id] },
      });
    } catch (error) {
      console.error('Nie udało się dodać osoby do ticketa:', error);
      await interaction.reply({
        content: '❌ Nie udało się dodać tej osoby do ticketa.',
        ephemeral: true,
      });
    }
  },
};
