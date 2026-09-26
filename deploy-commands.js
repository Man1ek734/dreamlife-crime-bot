require('dotenv').config();
const { REST, Routes } = require('discord.js');
const ping = require('./commands/ping');
const warn = require('./commands/warn');
const dodaj = require('./commands/dodaj');

const commands = [ping.data.toJSON(), warn.data.toJSON(), dodaj.data.toJSON()];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Rejestruję komendy slash...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log('Komendy zostały zarejestrowane.');
  } catch (error) {
    console.error(error);
  }
})();
