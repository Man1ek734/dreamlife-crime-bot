const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');

const AUTHORIZED_ROLE_IDS = ['1517965039670132796', '1465810885489725533'];

function hasPermission(interaction) {
  return AUTHORIZED_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));
}

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
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('kto', true);
    const organization = interaction.options.getRole('organizacja', true);

    const modal = new ModalBuilder()
      .setCustomId(`warn_modal:${target.id}:${organization.id}`)
      .setTitle('Wystawienie warna');

    const targetInput = new TextInputBuilder()
      .setCustomId('warn_target')
      .setLabel('Kto')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(target.username)
      .setPlaceholder('Nick osoby');

    const organizationInput = new TextInputBuilder()
      .setCustomId('warn_organization')
      .setLabel('Jakiej organizacji/gangowi')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(organization.name)
      .setPlaceholder('Nazwa organizacji lub gangu');

    const reasonInput = new TextInputBuilder()
      .setCustomId('warn_reason')
      .setLabel('Za co')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Podaj powód warna');

    modal.addComponents(
      new ActionRowBuilder().addComponents(targetInput),
      new ActionRowBuilder().addComponents(organizationInput),
      new ActionRowBuilder().addComponents(reasonInput),
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do wystawienia warna.',
        ephemeral: true,
      });
      return;
    }

    const [, targetId, organizationId] = interaction.customId.split(':');

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    const organization = await interaction.guild.roles.fetch(organizationId).catch(() => null);

    if (!target || !organization) {
      await interaction.reply({
        content: '❌ Nie udało się znaleźć użytkownika albo organizacji/gangu.',
        ephemeral: true,
      });
      return;
    }

    const targetText = interaction.fields.getTextInputValue('warn_target').trim();
    const organizationText = interaction.fields.getTextInputValue('warn_organization').trim();
    const reason = interaction.fields.getTextInputValue('warn_reason').trim();

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('⚠️ WARN')
      .setDescription(
        [
          '**Kto:**',
          `${target}`,
          '',
          '**Jakiej organizacji/gangowi:**',
          `${organization}`,
          '',
          '**Za co:**',
          reason,
        ].join('\n')
      )
      .setFooter({ text: 'DreamLife RolePlay © 2026' })
      .setTimestamp();

    await interaction.reply({
      content: `${target} ・ ${organization}`,
      embeds: [embed],
      allowedMentions: {
        users: [target.id],
        roles: [organization.id],
      },
    });
  },
};
