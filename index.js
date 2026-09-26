require('dotenv').config();
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageType,
  EmbedBuilder,
} = require('discord.js');
const ping = require('./commands/ping');

const WELCOME_CHANNEL_ID = '1437087479089074303';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
client.commands.set(ping.data.name, ping);

client.once(Events.ClientReady, readyClient => {
  console.log(`Zalogowano jako ${readyClient.user.tag}`);
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

// Usuwa domyślne discordowe wiadomości typu „X dołączył(a) do drużyny”
// z kanału powitalnego.
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
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const message = 'Wystąpił błąd podczas wykonywania tej komendy.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
