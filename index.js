require('dotenv').config();
const {
  ActionRowBuilder,
  AuditLogEvent,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageType,
  Partials,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');

const ping = require('./commands/ping');

const WELCOME_CHANNEL_ID = '1437087479089074303';
const TICKET_PANEL_CHANNEL_ID = '1519136441563611346';
const BOT_LOG_CHANNEL_ID = '1437087481542479904';

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
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember,
    Partials.User,
  ],
});

client.commands = new Collection();
client.commands.set(ping.data.name, ping);

async function sendBotLog(guild, embed) {
  try {
    const logChannel =
      guild.channels.cache.get(BOT_LOG_CHANNEL_ID) ||
      await guild.channels.fetch(BOT_LOG_CHANNEL_ID).catch(() => null);

    if (!logChannel || !logChannel.isTextBased()) return;
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Błąd wysyłania logu:', error);
  }
}

async function getAuditExecutor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const now = Date.now();

    const entry = logs.entries.find(item => {
      const sameTarget = !targetId || item.target?.id === targetId;
      const recent = now - item.createdTimestamp < 8000;
      return sameTarget && recent;
    });

    return entry?.executor ?? null;
  } catch {
    return null;
  }
}

function trimLogText(text, fallback = '*brak treści*') {
  if (!text) return fallback;
  return text.length > 900 ? `${text.slice(0, 897)}...` : text;
}


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


client.on(Events.MessageDelete, async message => {
  if (!message.guild || message.channelId === BOT_LOG_CHANNEL_ID) return;
  if (message.author?.bot || message.system) return;

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Wiadomość usunięta')
    .addFields(
      { name: 'Autor', value: message.author ? `${message.author} (\`${message.author.tag}\`)` : 'Nieznany', inline: true },
      { name: 'Kanał', value: `<#${message.channelId}>`, inline: true },
      { name: 'Treść', value: trimLogText(message.content, '*treść niedostępna*') }
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendBotLog(message.guild, embed);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.channelId === BOT_LOG_CHANNEL_ID) return;
  if (newMessage.author?.bot || newMessage.system) return;

  if (newMessage.partial) {
    await newMessage.fetch().catch(() => {});
  }

  const oldContent = oldMessage.content;
  const newContent = newMessage.content;

  if (oldContent === newContent) return;

  const embed = new EmbedBuilder()
    .setTitle('✏️ Wiadomość edytowana')
    .addFields(
      { name: 'Autor', value: newMessage.author ? `${newMessage.author} (\`${newMessage.author.tag}\`)` : 'Nieznany', inline: true },
      { name: 'Kanał', value: `<#${newMessage.channelId}>`, inline: true },
      { name: 'Przed', value: trimLogText(oldContent, '*treść niedostępna*') },
      { name: 'Po', value: trimLogText(newContent, '*treść niedostępna*') }
    )
    .setColor(0xfee75c)
    .setTimestamp();

  await sendBotLog(newMessage.guild, embed);
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

  for (const role of addedRoles.values()) {
    const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
    const embed = new EmbedBuilder()
      .setTitle('➕ Nadano rolę')
      .addFields(
        { name: 'Użytkownik', value: `${newMember}`, inline: true },
        { name: 'Rola', value: `${role}`, inline: true },
        { name: 'Nadał', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
      )
      .setColor(0x57f287)
      .setTimestamp();
    await sendBotLog(newMember.guild, embed);
  }

  for (const role of removedRoles.values()) {
    const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
    const embed = new EmbedBuilder()
      .setTitle('➖ Zabrano rolę')
      .addFields(
        { name: 'Użytkownik', value: `${newMember}`, inline: true },
        { name: 'Rola', value: `@${role.name}`, inline: true },
        { name: 'Zabrał', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
      )
      .setColor(0xed4245)
      .setTimestamp();
    await sendBotLog(newMember.guild, embed);
  }

  const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? 0;
  const newTimeout = newMember.communicationDisabledUntilTimestamp ?? 0;

  if (oldTimeout !== newTimeout) {
    const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
    const muted = newTimeout > Date.now();

    const embed = new EmbedBuilder()
      .setTitle(muted ? '🔇 Nadano mute / timeout' : '🔊 Zdjęto mute / timeout')
      .addFields(
        { name: 'Użytkownik', value: `${newMember}`, inline: true },
        { name: muted ? 'Do' : 'Status', value: muted ? `<t:${Math.floor(newTimeout / 1000)}:F>` : 'Timeout zakończony/usunięty', inline: true },
        { name: muted ? 'Nadał' : 'Zmienił', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
      )
      .setColor(muted ? 0xfaa61a : 0x57f287)
      .setTimestamp();

    await sendBotLog(newMember.guild, embed);
  }
});

client.on(Events.GuildBanAdd, async ban => {
  const executor = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  const embed = new EmbedBuilder()
    .setTitle('🔨 Ban')
    .addFields(
      { name: 'Użytkownik', value: `${ban.user} (\`${ban.user.tag}\`)`, inline: true },
      { name: 'Zbanował', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(0xed4245)
    .setTimestamp();
  await sendBotLog(ban.guild, embed);
});

client.on(Events.GuildMemberRemove, async member => {
  const executor = await getAuditExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
  if (!executor) return;

  const embed = new EmbedBuilder()
    .setTitle('👢 Kick')
    .addFields(
      { name: 'Użytkownik', value: `${member.user} (\`${member.user.tag}\`)`, inline: true },
      { name: 'Wyrzucił', value: `${executor}`, inline: true }
    )
    .setColor(0xed4245)
    .setTimestamp();
  await sendBotLog(member.guild, embed);
});

client.on(Events.ChannelCreate, async channel => {
  if (!channel.guild || channel.id === BOT_LOG_CHANNEL_ID) return;
  const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

  const embed = new EmbedBuilder()
    .setTitle('📁 Utworzono kanał')
    .addFields(
      { name: 'Kanał', value: `${channel}`, inline: true },
      { name: 'Nazwa', value: `\`${channel.name}\``, inline: true },
      { name: 'Utworzył', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(0x57f287)
    .setTimestamp();

  await sendBotLog(channel.guild, embed);
});

client.on(Events.ChannelDelete, async channel => {
  if (!channel.guild || channel.id === BOT_LOG_CHANNEL_ID) return;
  const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Usunięto kanał')
    .addFields(
      { name: 'Nazwa', value: `\`${channel.name}\``, inline: true },
      { name: 'Usunął', value: executor ? `${executor}` : 'Nie udało się ustalić', inline: true }
    )
    .setColor(0xed4245)
    .setTimestamp();

  await sendBotLog(channel.guild, embed);
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

      const przyszlyGangsterRole = interaction.guild.roles.cache.find(
        role => role.name.trim().toLocaleLowerCase('pl-PL').includes('przyszły gangster')
      );

      await ticketChannel.send({
        content: przyszlyGangsterRole
          ? `${interaction.user} ・<@&${przyszlyGangsterRole.id}>`
          : `${interaction.user} ・@Przyszły Gangster`,
        embeds: [ticketEmbed],
        components: [new ActionRowBuilder().addComponents(closeButton)],
        allowedMentions: przyszlyGangsterRole
          ? { users: [interaction.user.id], roles: [przyszlyGangsterRole.id] }
          : { users: [interaction.user.id] },
      });

      await interaction.editReply({
        content: `✅ Ticket został utworzony: ${ticketChannel}`,
      });

      await sendBotLog(
        interaction.guild,
        new EmbedBuilder()
          .setTitle('🎟️ Utworzono ticket')
          .addFields(
            { name: 'Autor', value: `${interaction.user}`, inline: true },
            { name: 'Kategoria', value: ticketType.label, inline: true },
            { name: 'Kanał', value: `${ticketChannel}`, inline: true }
          )
          .setColor(0x5865f2)
          .setTimestamp()
      );

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
        const ticketName = interaction.channel.name;

        await sendBotLog(
          interaction.guild,
          new EmbedBuilder()
            .setTitle('🔒 Zamknięto ticket')
            .addFields(
              { name: 'Ticket', value: `\`${ticketName}\``, inline: true },
              { name: 'Zamknął', value: `${interaction.user}`, inline: true },
              { name: 'Autor ticketu', value: ownerId ? `<@${ownerId}>` : 'Nieznany', inline: true }
            )
            .setColor(0xed4245)
            .setTimestamp()
        );

        await interaction.editReply('✅ Ticket zostanie usunięty.');
        setTimeout(async () => {
          try {
            await interaction.channel.delete('Ticket zamknięty');
          } catch (error) {
            console.error('Nie udało się usunąć ticketu:', error);
          }
        }, 1500);
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
