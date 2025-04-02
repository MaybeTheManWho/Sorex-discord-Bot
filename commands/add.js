const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the ticket')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to add to the ticket')
        .setRequired(true)
    ),
  async execute(interaction) {
    // Example staff role required
    const requiredRoleId = '907215463312924683';

    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');
    const channel = interaction.channel;

    // Check if channel is a valid ticket (topic starts with 'ticket|')
    if (!channel.topic || !channel.topic.startsWith('ticket|')) {
      return interaction.reply({
        content: 'This command can only be used in valid ticket channels.',
        ephemeral: true
      });
    }

    // Grant the user permission to see & send messages (and attach files, if you want)
    await channel.permissionOverwrites.create(user, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true, // allow them to upload
      EmbedLinks: true
    });

    const embed = new EmbedBuilder()
      .setTitle('User Added to Ticket')
      .setDescription(`${user.tag} has been added to this ticket.`)
      .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed] });
  },
};
