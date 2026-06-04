/**
 * Ticket Setup Command — /tsetup & !tsetup
 * Allows admins to post a custom ticket panel with a configurable
 * title, description, and button label.
 *
 * Slash:  /tsetup title:<title> description:<description> buttonname:<name>
 * Prefix: !tsetup title | description | button name
 *
 * Config is persisted per-guild in guildSettings.json under ticketSetup.
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');

const { getSettings, saveSettings } = require('../utils/settings.js');

// =========================
// SLASH COMMAND DEFINITION
// =========================
const data = new SlashCommandBuilder()
    .setName('tsetup')
    .setDescription('Post a custom ticket panel in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option
            .setName('title')
            .setDescription('The embed title shown on the ticket panel.')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('description')
            .setDescription('The embed description shown on the ticket panel.')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('buttonname')
            .setDescription('Label for the button users click to open a ticket.')
            .setRequired(true)
    );

// =========================
// SHARED LOGIC
// =========================

/**
 * Saves the ticket config for a guild and posts the panel embed.
 *
 * @param {string}  guildId    - Discord guild ID
 * @param {string}  title      - Panel embed title
 * @param {string}  description - Panel embed description
 * @param {string}  buttonName - Button label
 * @param {object}  channel    - Discord TextChannel to post in
 * @param {Function} reply     - Async function to send the ephemeral confirmation
 */
async function postTicketPanel(guildId, title, description, buttonName, channel, reply) {

    // Persist config
    const settings = getSettings(guildId);
    settings.ticketSetup = { title, description, buttonName };
    saveSettings(guildId, settings);

    // Build panel embed
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x2ECC71)
        .setTimestamp();

    // Button customId encodes the guild so the handler can look up config
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tsetup_open_ticket')
            .setLabel(buttonName)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
    );

    await reply('✅ Ticket panel posted successfully.');

    await channel.send({
        embeds: [embed],
        components: [row]
    });
}

// =========================
// SLASH HANDLER
// =========================
async function run(interaction) {

    const title      = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const buttonName = interaction.options.getString('buttonname');

    await postTicketPanel(
        interaction.guild.id,
        title,
        description,
        buttonName,
        interaction.channel,
        async (msg) => interaction.reply({ content: msg, ephemeral: true })
    );
}

// =========================
// PREFIX HANDLER
// Called from index.js when commandName === 'tsetup'
// Usage: !tsetup title | description | button name
// =========================
async function handlePrefix(message, args) {

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({ content: '❌ Administrator permission required.' });
    }

    // Rejoin args (split by spaces) then split on ' | '
    const raw = args.join(' ');
    const parts = raw.split('|').map(p => p.trim());

    if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
        return message.reply({
            content: '❌ Usage: `!tsetup title | description | button name`'
        });
    }

    const [title, description, buttonName] = parts;

    await postTicketPanel(
        message.guild.id,
        title,
        description,
        buttonName,
        message.channel,
        async (msg) => message.reply({ content: msg })
    );
}

module.exports = {
    data,
    run,
    handlePrefix
};
