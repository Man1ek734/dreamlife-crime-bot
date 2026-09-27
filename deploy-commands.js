require('dotenv').config();
const { REST, Routes } = require('discord.js');
const ping = require('./commands/ping');
const warn = require('./commands/warn');
const dodaj = require('./commands/dodaj');
const dodajgang = require('./commands/dodajgang');
const usunorg = require('./commands/usunorg');
const usungang = require('./commands/usungang');
const zawieszenie = require('./commands/zawieszenie');
const nadajrange = require('./commands/nadajrange');
const changlog = require('./commands/changlog');
const listagangow = require('./commands/listagangow');

const commands = [ping.data.toJSON(), warn.data.toJSON(), dodaj.data.toJSON(), dodajgang.data.toJSON(), usunorg.data.toJSON(), usungang.data.toJSON(), zawieszenie.data.toJSON(), nadajrange.data.toJSON(), changlog.data.toJSON(), listagangow.data.toJSON()];
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
