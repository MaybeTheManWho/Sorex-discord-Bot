const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sendembed')
        .setDescription('SE'),
    async execute(interaction) {
        const requiredRoleId = '907215463312924683';

        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        // Banner image URL
        const bannerImageURL = 'https://media.discordapp.net/attachments/1236773390136770592/1311013874346098809/support.png?ex=674bed91&is=674a9c11&hm=b9373e1a9b3378b15fabffe3a8338e5e2af9f88d317bff75e656cd0b90e6ae80&=&format=webp&quality=lossless&width=1440&height=275'; // Replace with your desired image URL

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('support').setLabel('Support').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('purchase').setLabel('Purchase').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('report').setLabel('Report').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('staffreport').setLabel('Staff report').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('other').setLabel('Other').setStyle(ButtonStyle.Primary)
        );

        const embed = new EmbedBuilder()
            .setThumbnail('https://media.discordapp.net/attachments/1173719333340454962/1311210375349538836/efca06dd9f7edb841f639744216fc4e0.jpg?ex=67480752&is=6746b5d2&hm=72721b51b44232a39fbe8aca5c91b53bab06d096c6631256389f77e283c6e002&=&format=webp&width=980&height=980') // Replace with a valid URL
            .setDescription(
                `Hello! Welcome to the ticket system! To streamline your requests and ensure faster assistance, we've categorized the available ticket options below. Please select the one that best suits your needs:\n\n` +
                `📜 **Support**\nNeed help or have questions about the server, features, or policies? Open a support ticket, and our team will assist you promptly.\n\n` +
                `📕 **Purchase**\nInterested in purchasing an advertisement? Open a purchase ticket for further assistance.\n\n` +
                `❗ **Report**\nEncountered a rule violation, or issue that needs to be addressed? Open a report ticket to notify our team.\n\n` +
                `👤 **Staff Report**\nHave feedback or concerns about a staff member's behavior or actions? Open a staff report ticket to share your concerns confidentially.\n\n` +
                `📂 **Other**\nHave a query or request that doesn't fit into the categories above? Open an "Other" ticket, and we'll help you out.\n\n`
            )
            .setColor(0x00FFFF)
            .setFooter({
                text: 'Powered by SwordTL | Tickets',
                iconURL: 'https://media.discordapp.net/attachments/1173719333340454962/1310983019632267324/81670e9267558aa393bc9409f4da32e9.png?ex=6747dc54&is=67468ad4&hm=30d3442874a51ef061822a3f7508dca27a1c18585950a176fb21797c968db022&=&format=webp&quality=lossless&width=700&height=700', // Replace with a valid URL
            });

        // Send the banner image
        await interaction.channel.send({ files: [bannerImageURL] });

        // Send the ticket embed with buttons
        await interaction.channel.send({ embeds: [embed], components: [buttons] });

        await interaction.deferReply({ ephemeral: true });
        await interaction.deleteReply();
    },
};
