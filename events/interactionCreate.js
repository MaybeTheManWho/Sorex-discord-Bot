const {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');

// --------------------
// Global Constants
// --------------------

// The main guild ID (for checking user roles & logging)
const mainGuildId = '513709294844117013'; // REPLACE WITH YOUR SERVER ID

// Channel ID where transcript request logs are sent
const transcriptHistoryChannelId = '1343452414065377370'; // REPLACE WITH YOUR HISTORY CHANNEL ID

// Transcript channel ID (where the transcript embed + download button is posted)
const transcriptChannelId = '1343461417948287049'; // REPLACE WITH YOUR TRANSCRIPT CHANNEL ID

// Claim roles (only these roles can "Claim" a ticket)
const claimAllowedRoles = [
  '1091047498157658184',
  '1090989865010737186',
  '907215463312924683',
  '1090998098756644904',
  '513710756706123778',
];

// Role permissions and category IDs for each ticket type
const categoryRoles = {
  support: ['1090998098756644904', '907215463312924683', '1090989865010737186', '1091047498157658184', '1090775609036251186'],
  purchase: ['907215463312924683'],
  report: ['907215463312924683', '1090989865010737186', '1091047498157658184'],
  staffreport: ['907215463312924683'],
  other: ['907215463312924683', '1090989865010737186'],
};

const categoryMap = {
  support: '1312415006477910128',
  purchase: '1312415099503513640',
  report: '1312415171351806003',
  staffreport: '1312415219535843380',
  other: '1312415261197996042',
};

// Per-ticket-type roles that may download transcripts
const transcriptRoleRequirements = {
  purchase: ['907215463312924683'], // REPLACE with actual roles for purchase transcripts
  support: ['1091047498157658184', '1090989865010737186'], // REPLACE with actual roles
  report: ['1091047498157658184', '1090989865010737186'],  // REPLACE with actual roles
  staffreport: ['1090998098756644904'], // REPLACE
  other: ['1090989865010737186', '907215463312924683'], // REPLACE
};

// Sword TL / Ticket images
const swordTLIcon = 'https://media.discordapp.net/attachments/1300811634238951427/1343836226716696659/sword_logo.png'; // REPLACE
const ticketThumbnail = 'https://media.discordapp.net/attachments/1300811634238951427/1343836226716696659/sword_logo.png'; // REPLACE

// --------------------
// Caches
// --------------------
const ticketInfo = {};     // Stores ticket data by channel ID
const transcriptCache = {}; // Stores transcript data by channel ID

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // --------------------
    // 1. Handle Modal Submissions
    // --------------------
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'close_with_reason_modal') {
        const reason = interaction.fields.getTextInputValue('reason_input') || 'no reason specified';
        await processTicketClosure(interaction.channel, interaction.client, interaction.user, reason);
        return interaction.reply({ content: 'Ticket is now closing with your provided reason.', ephemeral: true });
      }
    }

    // --------------------
    // 2. Handle Button Interactions
    // --------------------
    if (interaction.isButton()) {
      const { customId, channel, user, client } = interaction;

      // a) Ticket Creation (support, purchase, etc.)
      if (['support', 'purchase', 'report', 'staffreport', 'other'].includes(customId)) {
        const ticketType = customId.charAt(0).toUpperCase() + customId.slice(1);
        const categoryId = categoryMap[customId];
        const rolePermissions = categoryRoles[customId];
        const guild = interaction.guild;

        if (!guild) {
          return interaction.reply({ content: 'Unable to create a ticket in DMs.', ephemeral: true });
        }
        if (!categoryId || !rolePermissions) {
          return interaction.reply({
            content: `Configuration missing for ${ticketType}. Please contact an admin.`,
            ephemeral: true,
          });
        }

        const permissionOverwrites = [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          },
          ...rolePermissions.map(roleId => ({
            id: roleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          })),
        ];

        try {
          const ticketChannel = await guild.channels.create({
            name: `${customId}-${user.username}`,
            type: 0, // text channel
            parent: categoryId,
            permissionOverwrites,
          });

          await ticketChannel.setTopic(`ticket|${user.id}`);

          ticketInfo[ticketChannel.id] = {
            creatorTag: user.tag,
            creatorId: user.id,
            createdAt: new Date().toLocaleString(),
            type: ticketType.toLowerCase(),
            claimedBy: null,
          };

          const embed = new EmbedBuilder()
            .setTitle(`Sword TL | ${ticketType}`)
            .setDescription('Provide as much information as possible. A staff member will respond shortly.')
            .setColor(0x00FFFF);

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Close')
            .setStyle(ButtonStyle.Danger);

          const closeWithReasonButton = new ButtonBuilder()
            .setCustomId('close_with_reason')
            .setLabel('🔒 Close w/ Reason')
            .setStyle(ButtonStyle.Danger);

          const claimButton = new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('🔒 Claim')
            .setStyle(ButtonStyle.Secondary);

          const actionRow = new ActionRowBuilder().addComponents(closeButton, closeWithReasonButton, claimButton);

          await ticketChannel.send({
            content: `<@${user.id}>`,
            embeds: [embed],
            components: [actionRow],
          });

          return interaction.reply({
            content: `Your **${ticketType}** ticket has been created: <#${ticketChannel.id}>`,
            ephemeral: true,
          });
        } catch (err) {
          console.error('Error creating ticket channel:', err);
          return interaction.reply({
            content: 'An error occurred while creating the ticket. Please contact an administrator.',
            ephemeral: true,
          });
        }
      }

      // b) Close Ticket (no reason)
      if (customId === 'close_ticket') {
        if (!channel.topic || !channel.topic.startsWith('ticket|')) {
          return interaction.reply({ content: 'Not a valid ticket channel.', ephemeral: true });
        }
        await processTicketClosure(channel, interaction.client, user, 'no reason specified');
        return interaction.update({ content: 'Closing ticket...', components: [], embeds: [] });
      }

      // c) Close with Reason (show modal)
      if (customId === 'close_with_reason') {
        if (!channel.topic || !channel.topic.startsWith('ticket|')) {
          return interaction.reply({ content: 'Not a valid ticket channel.', ephemeral: true });
        }
        const modal = new ModalBuilder()
          .setCustomId('close_with_reason_modal')
          .setTitle('Close Ticket with Reason');

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason_input')
          .setLabel('Enter a reason for closing the ticket')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false);

        const modalRow = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(modalRow);
        return interaction.showModal(modal);
      }

      // d) Claim Ticket
      if (customId === 'claim_ticket') {
        const guild = interaction.guild;
        if (!guild) {
          return interaction.reply({ content: 'Cannot claim a ticket in DMs.', ephemeral: true });
        }
        const memberRoleIds = interaction.member.roles.cache.map(r => r.id);
        const canClaim = claimAllowedRoles.some(role => memberRoleIds.includes(role));
        if (!canClaim) {
          return interaction.reply({ content: 'You are not authorized to claim this ticket.', ephemeral: true });
        }

        if (ticketInfo[channel.id] && ticketInfo[channel.id].claimedBy) {
          return interaction.reply({ content: 'This ticket has already been claimed.', ephemeral: true });
        }
        if (!ticketInfo[channel.id]) {
          ticketInfo[channel.id] = {};
        }
        ticketInfo[channel.id].claimedBy = user.id;

        const claimEmbed = new EmbedBuilder()
          .setTitle('Ticket Claimed')
          .setDescription(`This ticket will be handled by <@${user.id}>.`)
          .setColor(0x00AAFF)
          .setTimestamp();

        await channel.send({ embeds: [claimEmbed] });
        return interaction.reply({ content: 'You have claimed this ticket.', ephemeral: true });
      }

      // e) Deny Close
      if (customId === 'deny_close') {
        await interaction.update({
          content: 'Ticket closure request cancelled. The ticket remains open.',
          embeds: [],
          components: [],
        });
        await channel.send(`${interaction.user} decided to keep the ticket open.`);
      }

      // f) Download Transcript
      if (customId.startsWith('download_transcript_')) {
        const ticketId = customId.split('download_transcript_')[1];
        const transcriptData = transcriptCache[ticketId];

        // We'll define variables to keep track of success or not
        let dmSent = false;
        let failReason = '';

        if (!transcriptData) {
          await interaction.reply({ content: 'Transcript data not found.', ephemeral: true });
          dmSent = false;
          failReason = 'No transcript data';
          await logTranscriptRequest(interaction, transcriptData, dmSent, failReason);
          return;
        }

        // 1) Attempt to fetch main guild
        const client = interaction.client;
        let mainGuild;
        try {
          mainGuild = await client.guilds.fetch(mainGuildId);
        } catch (err) {
          console.error('Error fetching main guild:', err);
          await interaction.reply({ content: 'Could not fetch the main server.', ephemeral: true });
          dmSent = false;
          failReason = 'Guild fetch error';
          await logTranscriptRequest(interaction, transcriptData, dmSent, failReason);
          return;
        }

        // 2) Attempt to fetch user as guild member
        let guildMember;
        try {
          guildMember = await mainGuild.members.fetch(interaction.user.id);
        } catch (err) {
          console.error('Error fetching member in main guild:', err);
          await interaction.reply({ content: 'You do not appear to be in the main server.', ephemeral: true });
          dmSent = false;
          failReason = 'Not in main server';
          await logTranscriptRequest(interaction, transcriptData, dmSent, failReason);
          return;
        }

        // 3) Role check
        const neededRoles = transcriptRoleRequirements[transcriptData.type] || [];
        if (!neededRoles.some(roleId => guildMember.roles.cache.has(roleId))) {
          failReason = 'Unauthorized';
          dmSent = false;
          await interaction.reply({
            content: 'You are not authorized to download this transcript.',
            ephemeral: true,
          });
          await logTranscriptRequest(interaction, transcriptData, dmSent, failReason);
          return;
        }

        // 4) Attempt to DM the user the transcript
        try {
          await interaction.user.send({
            content: 'Here is your transcript:',
            files: [transcriptData.attachment],
          });
          dmSent = true;
          await interaction.reply({ content: 'Check your DMs for the transcript.', ephemeral: true });
        } catch (err) {
          console.error('Error sending DM transcript:', err);
          dmSent = false;
          failReason = 'DM failure';
          await interaction.reply({
            content: 'Failed to DM you the transcript. Check your DM settings.',
            ephemeral: true,
          });
        }

        // 5) Finally, log the request
        await logTranscriptRequest(interaction, transcriptData, dmSent, failReason);
      }
    }
  },
};

// --------------------
// processTicketClosure
// --------------------
async function processTicketClosure(channel, client, closer, closeReason) {
  if (!channel.topic || !channel.topic.startsWith('ticket|')) return;
  const creatorId = channel.topic.replace('ticket|', '');
  const data = ticketInfo[channel.id] || {};
  const createdAt = data.createdAt || 'Unknown';
  const claimedBy = data.claimedBy ? `<@${data.claimedBy}>` : 'Not claimed';
  const closedAt = new Date().toLocaleString();

  // DM the opener
  const dmEmbed = new EmbedBuilder()
    .setTitle('Ticket Closed')
    .setAuthor({ name: 'Sword TL', iconURL: swordTLIcon })
    .setThumbnail(ticketThumbnail)
    .setColor(0x00FF00)
    .addFields(
      { name: 'Closed by', value: `<@${closer.id}>`, inline: true },
      { name: 'Claimed by', value: claimedBy, inline: true },
      { name: 'Open Time', value: createdAt, inline: true },
      { name: 'Reason', value: closeReason || 'no reason specified', inline: false }
    )
    .setFooter({ text: `Closed on: ${closedAt}` });

  try {
    const mainGuild = await client.guilds.fetch(mainGuildId);
    const openerMember = await mainGuild.members.fetch(creatorId);
    await openerMember.send({
      embeds: [dmEmbed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`download_transcript_${channel.id}`)
            .setLabel('Download Transcript')
            .setStyle(ButtonStyle.Primary)
        ),
      ],
    });
  } catch (err) {
    console.error('Error DMing ticket opener:', err);
  }

  // Post a message in the ticket channel
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setDescription('This ticket has been closed.')
        .setColor(0x00FFFF),
    ],
  });

  // Generate the transcript
  await generateTranscript(channel, client, closer);

  // Remove view perms & delete after a few seconds
  await channel.permissionOverwrites.set([
    { id: channel.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
  ]);
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

// --------------------
// generateTranscript
// --------------------
async function generateTranscript(channel, client, closer) {
  const mainGuild = await client.guilds.fetch(mainGuildId).catch(() => null);
  if (!mainGuild) return;

  const transcriptChannel = await mainGuild.channels.fetch(transcriptChannelId).catch(() => null);
  if (!transcriptChannel || !transcriptChannel.isTextBased()) return;

  const attachment = await discordTranscripts.createTranscript(channel, {
    poweredBy: false,
  });

  const data = ticketInfo[channel.id] || {};
  const openerId = data.creatorId || 'Unknown';
  const closedAt = new Date().toLocaleString();
  const createdAt = data.createdAt || 'Unknown';

  // Build the embed for the transcripts channel
  const transcriptEmbed = new EmbedBuilder()
    .setTitle('Ticket Closed')
    .setColor(0x00FF00)
    .setThumbnail(ticketThumbnail)
    .addFields(
      {
        name: 'Closer',
        value: `<@${closer.id}> (${closer.id})`,
        inline: true,
      },
      {
        name: 'Opener',
        value: `<@${openerId}> (${openerId})`,
        inline: true,
      },
      {
        name: 'Ticket Channel',
        value: channel.name,
        inline: false,
      },
      {
        name: 'Open Date',
        value: createdAt,
        inline: true,
      },
      {
        name: 'Close Date',
        value: closedAt,
        inline: true,
      }
    );

  // Send the embed + Download button
  const downloadButton = new ButtonBuilder()
    .setCustomId(`download_transcript_${channel.id}`)
    .setLabel('Download Transcript')
    .setStyle(ButtonStyle.Primary);

  const sentMsg = await transcriptChannel.send({
    embeds: [transcriptEmbed],
    components: [new ActionRowBuilder().addComponents(downloadButton)],
  });

  // Save transcript data
  transcriptCache[channel.id] = {
    attachment,
    type: data.type || 'other', // e.g. "support"
    transcriptMessageLink: sentMsg ? sentMsg.url : null,
    ticketOwnerId: openerId,
    ticketName: channel.name,
  };

  // Clean up ticket info
  delete ticketInfo[channel.id];
}

// --------------------
// logTranscriptRequest
// --------------------
async function logTranscriptRequest(interaction, transcriptData, dmSent, failReason) {
  // Always logs the request
  const client = interaction.client;

  let mainGuild;
  try {
    mainGuild = await client.guilds.fetch(mainGuildId);
  } catch (err) {
    console.error('Error fetching main guild in logTranscriptRequest:', err);
    return;
  }
  if (!mainGuild) return;

  let historyChannel;
  try {
    historyChannel = await mainGuild.channels.fetch(transcriptHistoryChannelId);
  } catch (err) {
    console.error('Error fetching transcript history channel:', err);
    return;
  }
  if (!historyChannel || !historyChannel.isTextBased()) return;

  const color = dmSent ? 0x00FF00 : 0xFF0000;
  const userPing = `<@${interaction.user.id}>`;
  const ticketChannelName = transcriptData?.ticketName || 'Unknown';
  const ticketOwner = transcriptData?.ticketOwnerId ? `<@${transcriptData.ticketOwnerId}>` : 'Unknown';
  const transcriptLink = transcriptData?.transcriptMessageLink || 'N/A';
  const timeOfRequest = new Date().toLocaleString();

  // If failReason is present, show it in the embed description; otherwise, omit
  let description = '';
  if (failReason) {
    description = `**Reason of Failure:** ${failReason}`;
  }

  const logEmbed = new EmbedBuilder()
    .setTitle('Transcript Request Logged')
    .setColor(color)
    .setThumbnail(ticketThumbnail)
    // setDescription only if description is non-empty
    .setDescription(description || null)
    .addFields(
      { name: 'User Requesting', value: userPing, inline: true },
      { name: 'Ticket Channel', value: ticketChannelName, inline: true },
      { name: 'Ticket Owner', value: ticketOwner, inline: true },
      { name: 'Time of Request', value: timeOfRequest, inline: false },
      { name: 'Transcript Message Link', value: transcriptLink, inline: false }
    );

  await historyChannel.send({ embeds: [logEmbed] });
}
