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
    .setName('zawieszenie')
    .setDescription('Nadaj zawieszenie organizacji lub gangowi.')
    .addUserOption(option =>
      option
        .setName('kto')
        .setDescription('Kto wystawia zawieszenie?')
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

    const guardian = interaction.options.getUser('kto', true);
    const organization = interaction.options.getRole('organizacja', true);

    const modal = new ModalBuilder()
      .setCustomId(`zawieszenie_modal:${guardian.id}:${organization.id}`)
      .setTitle('Wystawienie zawieszenia');

    const guardianInput = new TextInputBuilder()
      .setCustomId('zawieszenie_opiekun')
      .setLabel('Opiekun')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(guardian.username);

    const organizationInput = new TextInputBuilder()
      .setCustomId('zawieszenie_organizacja')
      .setLabel('Organizacja / Gang')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(organization.name);

    const reasonInput = new TextInputBuilder()
      .setCustomId('zawieszenie_powod')
      .setLabel('Za co')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Podaj powód zawieszenia');

    const fromInput = new TextInputBuilder()
      .setCustomId('zawieszenie_od')
      .setLabel('Od kiedy')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Np. 27.09.2026');

    const toInput = new TextInputBuilder()
      .setCustomId('zawieszenie_do')
      .setLabel('Do kiedy')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Np. 04.10.2026');

    modal.addComponents(
      new ActionRowBuilder().addComponents(guardianInput),
      new ActionRowBuilder().addComponents(organizationInput),
      new ActionRowBuilder().addComponents(reasonInput),
      new ActionRowBuilder().addComponents(fromInput),
      new ActionRowBuilder().addComponents(toInput),
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: '❌ Nie masz uprawnień do użycia tej komendy.',
        ephemeral: true,
      });
      return;
    }

    const [, guardianId, organizationId] = interaction.customId.split(':');

    const guardian = await interaction.client.users.fetch(guardianId).catch(() => null);
    const organization = await interaction.guild.roles.fetch(organizationId).catch(() => null);

    if (!guardian || !organization) {
      await interaction.reply({
        content: '❌ Nie udało się znaleźć osoby albo organizacji/gangu.',
        ephemeral: true,
      });
      return;
    }

    const reason = interaction.fields.getTextInputValue('zawieszenie_powod').trim();
    const from = interaction.fields.getTextInputValue('zawieszenie_od').trim();
    const to = interaction.fields.getTextInputValue('zawieszenie_do').trim();

    const embed = new EmbedBuilder()
      .setTitle('⛔ ZAWIESZENIE')
      .setColor(0xed4245)
      .addFields(
        { name: 'Opiekun:', value: String(guardian), inline: false },
        { name: 'Organizacja/Gang:', value: String(organization), inline: false },
        { name: 'Za co:', value: reason, inline: false },
        { name: 'Od kiedy:', value: from, inline: true },
        { name: 'Do kiedy:', value: to, inline: true }
      )
      .setFooter({ text: 'DreamLife RolePlay © 2026' })
      .setTimestamp();

    await interaction.reply({
      content: String(guardian) + ' ・ ' + String(organization),
      embeds: [embed],
      allowedMentions: {
        users: [guardian.id],
        roles: [organization.id],
      },
    });
  },
};
