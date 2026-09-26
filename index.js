require('dotenv').config();
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const ping = require('./commands/ping');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
client.commands.set(ping.data.name, ping);

client.once(Events.ClientReady, readyClient => {
  console.log(`Zalogowano jako ${readyClient.user.tag}`);
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
