require('dotenv').config();
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');

const ping = require('./commands/ping');

const WELCOME_CHANNEL_ID = '1437087479089074303';
const TICKET_PANEL_CHANNEL_ID = '1519136441563611346';

const TICKET_OPTIONS = {
  zarzad: {
    label: 'Sprawa do zarządu',
    description: 'Masz problem lub sprawę, pisz',
    emoji: '🌐',
  },
  opiekunowie: {
    label: 'Sprawa do opiekunów Crime',
    description: 'Opiekunowie Crime',
    emoji: '📩',
  },
  pytanie: {
    label: 'Pytanie',
    description: 'Zadaj pytanie',
    emoji: '📜',
  },
  warn: {
    label: 'Odwołania od warna',
    description: 'Odwołania od warna',
    emoji: '📞',
  },
  zamowienia: {
    label: 'Zamówienia (IC)',
    description: 'Zamów sprzęt',
    emoji: '💼',
  },
  fckck: {
    label: 'Podanie na FCK/CK',
    description: 'Podanie na FCK/CK',
    emoji: '☠️',
  },
  mafia: {
    label: 'Kontakt z Mafia (IC)',
    description: 'Kontakt z Mafia (IC)',
    emoji: '✉️',
  },
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
client.commands.set(ping.data.name, ping);

function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle('Tickety — DreamLifeRP Crime')
    .setDescription(
      'Wybierz kategorię poniżej, aby utworzyć prywatny ticket.\n' +
      'Po wybraniu odpowiedniej opcji bot utworzy dla Ciebie osobny kanał.'
    )
    .setColor(0x2b2d31);

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('Wybierz opcję')
    .addOptions(
      Object.entries(TICKET_OPTIONS).map(([value, option]) => ({
        label: option.label,
        description: option.description,
        value,
        emoji: option.emoji,
      }))
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

async function ensureTicketPanel() {
  try {
    const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const existingPanel = messages.find(
      message =>
        message.author.id === client.user.id &&
        message.components.some(row =>
          row.components.some(component => component.customId === 'ticket_select')
        )
    );

    if (existingPanel) {
      await existingPanel.edit(buildTicketPanel());
      console.log('Panel ticketów został zaktualizowany.');
    } else {
      await channel.send(buildTicketPanel());
      console.log('Panel ticketów został wysłany.');
    }
  } catch (error) {
    console.error('Błąd podczas tworzenia panelu ticketów:', error);
  }
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`Zalogowano jako ${readyClient.user.tag}`);
  await ensureTicketPanel();
});

client.on(Events.GuildMemberAdd, async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('👋 Witamy na DreamLifeRP Crime!')
    .setDescription(
      `Siema ${member}! Witamy na serwerze **DreamLifeRP Crime**.\n\nMiłej gry i powodzenia w crime! 🔥`
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setColor(0x7b2cff)
    .setFooter({ text: `Jesteś ${member.guild.memberCount}. osobą na serwerze.` })
    .setTimestamp();

  try {
    await channel.send({ content: `${member}`, embeds: [embed] });
  } catch (error) {
    console.error('Błąd wysyłania powitania:', error);
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.channelId !== WELCOME_CHANNEL_ID) return;
  if (message.type !== MessageType.UserJoin) return;

  try {
    await message.delete();
  } catch (error) {
    console.error('Nie udało się usunąć domyślnej wiadomości powitalnej:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
      const selected = interaction.values[0];
      const ticketType = TICKET_OPTIONS[selected];
      if (!ticketType) return;

      const existingTicket = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildText &&
          channel.topic?.includes(`ticketOwner:${interaction.user.id}`)
      );

      if (existingTicket) {
        await interaction.reply({
          content: `Masz już otwarty ticket: ${existingTicket}`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const safeName = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .slice(0, 20) || 'uzytkownik';

      const parentId = interaction.channel.parentId ?? undefined;

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${safeName}`,
        type: ChannelType.GuildText,
        parent: parentId,
        topic: `ticketOwner:${interaction.user.id} | type:${selected}`,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
            ],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`${ticketType.emoji} ${ticketType.label}`)
        .setDescription(
          `Witaj ${interaction.user}!\n\nOpisz dokładnie swoją sprawę. Administracja odpowie, gdy będzie dostępna.`
        )
        .addFields(
          { name: 'Kategoria', value: ticketType.label, inline: true },
          { name: 'Autor', value: `${interaction.user}`, inline: true }
        )
        .setColor(0x2b2d31)
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Zamknij ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      await ticketChannel.send({
        content: `${interaction.user} ・Przyszły Gangster`,
        embeds: [ticketEmbed],
        components: [new ActionRowBuilder().addComponents(closeButton)],
      });

      await interaction.editReply({
        content: `✅ Ticket został utworzony: ${ticketChannel}`,
      });

      return;
    }

    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      const ownerMatch = interaction.channel.topic?.match(/ticketOwner:(\d+)/);
      const ownerId = ownerMatch?.[1];

      const canClose =
        interaction.user.id === ownerId ||
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

      if (!canClose) {
        await interaction.reply({
          content: 'Nie masz uprawnień do zamknięcia tego ticketu.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const closedCategory = interaction.guild.channels.cache.find(
          channel =>
            channel.type === ChannelType.GuildCategory &&
            channel.name.toLowerCase() === 'tickety zamknięte'
        );

        if (!closedCategory) {
          await interaction.editReply(
            'Nie znaleziono kategorii **Tickety zamknięte**. Utwórz kategorię o dokładnie takiej nazwie.'
          );
          return;
        }

        const closedTickets = interaction.guild.channels.cache.filter(
          channel =>
            channel.parentId === closedCategory.id &&
            channel.type === ChannelType.GuildText &&
            /^zamkniety-\\d{4}$/.test(channel.name)
        );

        let maxNumber = 0;
        for (const channel of closedTickets.values()) {
          const match = channel.name.match(/^zamkniety-(\\d{4})$/);
          if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
        }

        const nextNumber = String(maxNumber + 1).padStart(4, '0');

        if (ownerId) {
          await interaction.channel.permissionOverwrites.edit(ownerId, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false,
          });
        }

        await interaction.channel.setParent(closedCategory.id, { lockPermissions: false });
        await interaction.channel.setName(`zamkniety-${nextNumber}`);

        const closedEmbed = new EmbedBuilder()
          .setTitle('🔒 Ticket zamknięty')
          .setDescription(
            `Ticket został zamknięty przez ${interaction.user}.\nUżytkownik, który go utworzył, nie ma już do niego dostępu.`
          )
          .setColor(0xed4245)
          .setTimestamp();

        await interaction.channel.send({ embeds: [closedEmbed] });
        await interaction.editReply('✅ Ticket został przeniesiony do **Tickety zamknięte**.');
      } catch (error) {
        console.error('Nie udało się zamknąć ticketu:', error);
        await interaction.editReply('Nie udało się zamknąć ticketu.');
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction);
  } catch (error) {
    console.error('Błąd interakcji:', error);

    const message = 'Wystąpił błąd podczas wykonywania tej akcji.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
