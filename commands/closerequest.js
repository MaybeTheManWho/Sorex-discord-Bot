const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('closerequest')
    .setDescription('Request to close the ticket'),
  async execute(interaction) {
    // Staff role IDs that can initiate close
    const requiredRoleIds = [
      '1090998098756644904',
      '907215463312924683',
      '1090989865010737186',
      '1091047498157658184',
      '513710756706123778',
    ];

    // Check if the user has at least one of the required roles
    const hasRequiredRole = requiredRoleIds.some((roleId) =>
      interaction.member.roles.cache.has(roleId)
    );

    if (!hasRequiredRole) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    const channel = interaction.channel;

    // Must have "ticket|" in topic
    if (!channel.topic || !channel.topic.startsWith('ticket|')) {
      return interaction.reply({
        content: 'This command can only be used in valid ticket channels.',
        ephemeral: true,
      });
    }

    // Retrieve the ticket creator's ID from the channel topic
    const creatorId = channel.topic.replace('ticket|', '');
    const creatorMention = creatorId ? `<@${creatorId}>` : 'Unknown User';

    // Prompt to confirm closure
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Confirm Ticket Closure')
      .setDescription(
        `${interaction.user} has requested this ticket be closed.\n\nAre you sure you want to close this ticket?`
      )
      .setColor(0xff0000);

    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_close')
      .setLabel('Yes, close the ticket')
      .setStyle(ButtonStyle.Danger);

    const denyButton = new ButtonBuilder()
      .setCustomId('deny_close')
      .setLabel('No, keep the ticket open')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, denyButton);

    await interaction.reply({
      content: `${creatorMention}, your ticket is being reviewed for closure.`,
      embeds: [confirmEmbed],
      components: [row],
    });
  },
};
