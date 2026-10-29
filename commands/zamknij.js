const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('zamknij_yes_' + interaction.user.id).setLabel('Tak').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('zamknij_no_' + interaction.user.id).setLabel('Nie').setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ content: 'Czy na pewno chcesz zamknąć ticket? Kanał zostanie usunięty.', components: [row], ephemeral: true });
  },

  async handleButton(interaction) {
    const match = interaction.customId.match(/^zamknij_(yes|no)_(\d{17,22})$/);
    if (!match) return;
    if (interaction.user.id !== match[2]) {
      await interaction.reply({ content: 'To potwierdzenie nie jest dla Ciebie.', ephemeral: true });
      return;
    }
    if (match[1] === 'no') {
      await interaction.update({ content: 'Anulowano zamknięcie ticketa.', components: [] });
      return;
    }
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText || !/^ticketOwner:\d{17,22}(?:\s*\|\s*type:.+)?$/.test(channel.topic || '')) {
      await interaction.update({ content: 'Ten kanał nie jest ticketem.', components: [] });
      return;
    }
    const ownerId = channel.topic.match(/^ticketOwner:(\d{17,22})/)[1];
    if (interaction.user.id !== ownerId &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.update({ content: 'Nie masz uprawnień do zamknięcia tego ticketa.', components: [] });
      return;
    }
    await interaction.update({ content: 'Zamykam ticket...', components: [] });
    try {
      await channel.delete('Ticket zamknięty przez /zamknij — ' + interaction.user.tag);
    } catch (error) {
      console.error('Błąd /zamknij:', error);
      await interaction.followUp({ content: 'Nie udało się usunąć kanału ticketa.', ephemeral: true }).catch(() => {});
    }
  },
};
