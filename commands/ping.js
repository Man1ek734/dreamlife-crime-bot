const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Sprawdza, czy bot działa.'),

  async execute(interaction) {
    await interaction.reply('🏓 Pong! Bot Dream Life RP Crime działa.');
  },
};
