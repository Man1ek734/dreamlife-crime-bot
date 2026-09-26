const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Nadaj ostrzeżenie organizacji lub gangowi.')
    .addUserOption(option =>
      option
        .setName('kto')
        .setDescription('Kto otrzymuje warna?')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('organizacja')
        .setDescription('Jakiej organizacji/gangowi?')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('kto', true);
    const organization = interaction.options.getRole('organizacja', true);

    const modal = new ModalBuilder()
      .setCustomId('warn_modal:' + target.id + ':' + organization.id)
      .setTitle('Wystawienie warna');

    const reason = new TextInputBuilder()
      .setCustomId('warn_reason')
      .setLabel('Powód')
      .setPlaceholder('Podaj powód warna')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const description = new TextInputBuilder()
      .setCustomId('warn_description')
      .setLabel('Opis sytuacji')
      .setPlaceholder('Opisz dokładnie, za co został nadany warn')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    const evidence = new TextInputBuilder()
      .setCustomId('warn_evidence')
      .setLabel('Dowody / dodatkowe informacje')
      .setPlaceholder('Link do dowodu lub dodatkowe informacje (opcjonalnie)')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(700)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(reason),
      new ActionRowBuilder().addComponents(description),
      new ActionRowBuilder().addComponents(evidence)
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (!AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do wystawienia warna.',
        ephemeral: true,
      });
      return;
    }

    const parts = interaction.customId.split(':');
    const targetId = parts[1];
    const organizationId = parts[2];

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    const organization = await interaction.guild.roles.fetch(organizationId).catch(() => null);

    if (!target || !organization) {
      await interaction.reply({
        content: '❌ Nie udało się znaleźć użytkownika albo organizacji.',
        ephemeral: true,
      });
      return;
    }

    const reason = interaction.fields.getTextInputValue('warn_reason');
    const description = interaction.fields.getTextInputValue('warn_description');
    const evidence = interaction.fields.getTextInputValue('warn_evidence') || 'Brak';

    const embed = new EmbedBuilder()
      .setTitle('⚠️ WARN — Crime DreamLifeRP')
      .setDescription('Ostrzeżenie zostało wystawione organizacji / gangowi.')
      .addFields(
        { name: '👤 Kto', value: String(target), inline: true },
        { name: '🏷️ Organizacja / Gang', value: String(organization), inline: true },
        { name: '⚠️ Powód', value: reason },
        { name: '📝 Opis sytuacji', value: description },
        { name: '🔗 Dowody / dodatkowe informacje', value: evidence }
      )
      .setColor(0xed4245)
      .setFooter({ text: 'Wystawił: ' + interaction.user.tag })
      .setTimestamp();

    await interaction.reply({
      content: String(target) + ' ・ ' + String(organization),
      embeds: [embed],
      allowedMentions: { users: [target.id], roles: [organization.id] },
    });
  },
};
