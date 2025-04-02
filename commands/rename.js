const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the current ticket channel.')
    .addStringOption(option =>
      option.setName('newname')
        .setDescription('New channel name')
        .setRequired(true)
    ),
  async execute(interaction) {
    // Example staff roles
    const requiredRoleIds = [
      '1091047498157658184',
      '1090989865010737186',
    ];
    const hasRequiredRole = requiredRoleIds.some((roleId) =>
      interaction.member.roles.cache.has(roleId)
    );

    if (!hasRequiredRole) {
      return interaction.reply({
        content: 'You do not have permission to rename this ticket.',
        ephemeral: true,
      });
    }

    const channel = interaction.channel;
    const newName = interaction.options.getString('newname');

    // Check the channel topic to ensure it's a valid ticket
    if (!channel.topic || !channel.topic.startsWith('ticket|')) {
      return interaction.reply({
        content: 'This does not appear to be a valid ticket channel.',
        ephemeral: true,
      });
    }

    try {
      await channel.setName(newName);
      await interaction.reply(`Channel has been renamed to: \`${newName}\``);
    } catch (error) {
      console.error('Error renaming channel:', error);
      await interaction.reply({
        content: 'An error occurred while renaming the channel.',
        ephemeral: true,
      });
    }
  },
};
