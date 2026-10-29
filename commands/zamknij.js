const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zamknij')
    .setDescription('Zamknij i usuń bieżący kanał ticketa.'),
  async execute(interaction) {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText || !/^ticketOwner:\d{17,22}(?:\s*\|\s*type:.+)?$/.test(channel.topic || '')) {
      await interaction.reply({ content: 'Tej komendy można użyć tylko na kanale ticketa utworzonym przez bota.', ephemeral: true });
      return;
    }

    const ownerId = channel.topic.match(/^ticketOwner:(\d{17,22})/)[1];
    const allowed = interaction.user.id === ownerId ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!allowed) {
      await interaction.reply({ content: 'Nie masz uprawnień do zamknięcia tego ticketa.', ephemeral: true });
      return;
    }

    const me = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);
    if (!me?.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'Bot nie ma uprawnienia Zarządzanie kanałami.', ephemeral: true });
      return;
    }

    await interaction.reply({ content: 'Zamykam ticket i usuwam kanał.', ephemeral: true });

    try {
      await channel.delete('Ticket zamknięty przez /zamknij — ' + interaction.user.tag);
    } catch (error) {
      console.error('Błąd /zamknij:', error);
      await interaction.followUp({ content: 'Nie udało się usunąć kanału ticketa.', ephemeral: true }).catch(() => {});
    }
  },
};
