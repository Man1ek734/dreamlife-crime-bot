require('dotenv').config();
const { REST, Routes } = require('discord.js');
const ping = require('./commands/ping');
const warn = require('./commands/warn');
const dodajgang = require('./commands/dodajgang');
const dodajorganizacje = require('./commands/dodajorganizacje');
const usungang = require('./commands/usungang');
const usunorganizacje = require('./commands/usunorganizacje');
const zawieszenie = require('./commands/zawieszenie');
const nadajrange = require('./commands/nadajrange');
const changlog = require('./commands/changlog');
const listagangow = require('./commands/listagangow');
const listaorganizacji = require('./commands/listaorganizacji');
const dodajticket = require('./commands/dodajticket');

const commands = [ping.data.toJSON(), warn.data.toJSON(), dodajgang.data.toJSON(), dodajorganizacje.data.toJSON(), usungang.data.toJSON(), usunorganizacje.data.toJSON(), zawieszenie.data.toJSON(), nadajrange.data.toJSON(), changlog.data.toJSON(), listagangow.data.toJSON(), listaorganizacji.data.toJSON(), dodajticket.data.toJSON()];
const GUILD_ID = '1437087475704266928';
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Rejestruję komendy slash...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log('Komendy zostały zarejestrowane.');
  } catch (error) {
    console.error(error);
  }
})();
