const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from the ticket')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove from the ticket')
        .setRequired(true)
    ),
  async execute(interaction) {
    // Example staff role required
    const requiredRoleId = '907215463312924683';

    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser('user');
    const channel = interaction.channel;

    // Check if channel is a valid ticket (topic starts with 'ticket|')
    if (!channel.topic || !channel.topic.startsWith('ticket|')) {
      return interaction.reply({
        content: 'This command can only be used in valid ticket channels.',
        ephemeral: true,
      });
    }

    try {
      // Remove that user's permission overwrite
      await channel.permissionOverwrites.delete(user);

      const embed = new EmbedBuilder()
        .setTitle('User Removed from Ticket')
        .setDescription(`${user.tag} has been removed from this ticket.`)
        .setColor(0xFF0000);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error removing user:', error);
      return interaction.reply({
        content: 'An error occurred removing the user from this ticket.',
        ephemeral: true,
      });
    }
  },
};
