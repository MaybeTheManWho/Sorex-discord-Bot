const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Pong!?'),
    async execute(interaction) {
        return await interaction.reply({ content: 'Pong!', ephemeral: true });
    },
};
