/**
 * Zishi — Welcome System
 *
 * Slash commands:
 *   /welcome setup <channel> <message>  — Configure welcome messages
 *   /welcome disable                    — Disable welcome messages
 *   /welcome preview                    — Preview the current welcome message
 *   /welcome test                       — Send a test welcome to the configured channel
 *
 * Prefix commands:
 *   !welcome setup #channel <message>   — Configure welcome messages
 *   !welcome disable                    — Disable welcome messages
 *   !welcome preview                    — Preview the current welcome message
 *   !welcome test                       — Send a test welcome to the configured channel
 *
 * Placeholders: {user}, {guild}, {count}
 * Config stored in data/guildSettings.json via utils/settings.js
 */

const {
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    SlashCommandBuilder
} = require('discord.js');

const { getSettings, saveSettings } = require('../utils/settings');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Resolve welcome config for a guild, or null if not set up. */
function getWelcomeConfig(guildId) {
    const settings = getSettings(guildId);
    return settings.welcomeConfig || null;
}

/** Save welcome config for a guild. */
function saveWelcomeConfig(guildId, config) {
    const settings = getSettings(guildId);
    settings.welcomeConfig = config;
    saveSettings(guildId, settings);
}

/** Replace {user}, {guild}, {count} placeholders. */
function resolvePlaceholders(template, member) {
    return template
        .replace(/{user}/g,  member.toString())
        .replace(/{guild}/g, member.guild.name)
        .replace(/{count}/g, member.guild.memberCount.toString());
}

/** Build the welcome embed sent when a member joins. */
function buildWelcomeEmbed(member, messageText) {
    return new EmbedBuilder()
        .setTitle(`👋 Welcome to ${member.guild.name}!`)
        .setDescription(messageText)
        .setColor(0x5865F2)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields({
            name: '👥 Member Count',
            value: `You are member **#${member.guild.memberCount.toLocaleString()}**`,
            inline: true
        })
        .setFooter({ text: `${member.guild.name} • Welcome System` })
        .setTimestamp();
}

// ─────────────────────────────────────────────
// MEMBER JOIN HANDLER  (called from index.js)
// ─────────────────────────────────────────────
async function handleMemberJoin(member) {
    const config = getWelcomeConfig(member.guild.id);
    if (!config || !config.enabled || !config.channelId || !config.message) return;

    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;

    const messageText = resolvePlaceholders(config.message, member);
    const embed = buildWelcomeEmbed(member, messageText);

    await channel.send({
        content: `${member}`,
        embeds: [embed]
    }).catch(err => console.warn(`[Welcome] Could not send welcome message: ${err.message}`));
}

// ─────────────────────────────────────────────
// PREFIX COMMAND HANDLER  (called from index.js)
// Handles: !welcome setup / disable / preview / test
// ─────────────────────────────────────────────
async function handlePrefix(message, commandName, args) {
    if (!message.guild)             return false;
    if (commandName !== 'welcome')  return false;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply({ content: '❌ Administrator permission required.' });
        return true;
    }

    const sub = args?.[0]?.toLowerCase();

    // ── setup ──────────────────────────────────
    if (sub === 'setup') {
        // Args: !welcome setup #channel <message...>
        const channelMention = args[1];
        if (!channelMention) {
            await message.reply({
                content: '❌ Usage: `!welcome setup #channel <message>`\nPlaceholders: `{user}`, `{guild}`, `{count}`'
            });
            return true;
        }

        // Resolve channel from mention or ID
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);

        if (!channel || channel.type !== ChannelType.GuildText) {
            await message.reply({ content: '❌ Please mention a valid text channel.' });
            return true;
        }

        const welcomeMessage = args.slice(2).join(' ');
        if (!welcomeMessage) {
            await message.reply({
                content: '❌ Please provide a welcome message.\nExample: `!welcome setup #welcome Welcome {user} to {guild}! You are member #{count}.`'
            });
            return true;
        }

        saveWelcomeConfig(message.guild.id, {
            enabled:   true,
            channelId: channel.id,
            message:   welcomeMessage
        });

        const embed = new EmbedBuilder()
            .setTitle('👋 Welcome System Configured')
            .setColor(0x2ECC71)
            .addFields(
                { name: '📢 Channel',  value: `${channel}`,                                inline: true  },
                { name: '📄 Message',  value: `\`\`\`${welcomeMessage}\`\`\``,             inline: false },
                { name: '💡 Tip',      value: 'Use `{user}`, `{guild}`, `{count}` as placeholders.', inline: false }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ── disable ────────────────────────────────
    if (sub === 'disable') {
        const existing = getWelcomeConfig(message.guild.id);
        if (!existing) {
            await message.reply({ content: '⚠️ Welcome system is not configured yet.' });
            return true;
        }
        saveWelcomeConfig(message.guild.id, { ...existing, enabled: false });

        const embed = new EmbedBuilder()
            .setDescription('❌ Welcome messages have been **disabled**.')
            .setColor(0xE74C3C)
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ── preview ────────────────────────────────
    if (sub === 'preview') {
        const config = getWelcomeConfig(message.guild.id);
        if (!config || !config.message) {
            await message.reply({ content: '❌ No welcome message configured. Use `!welcome setup` first.' });
            return true;
        }

        const messageText = resolvePlaceholders(config.message, message.member);
        const embed = buildWelcomeEmbed(message.member, messageText);

        const statusEmbed = new EmbedBuilder()
            .setTitle('👁️ Welcome Message Preview')
            .setColor(0x3498DB)
            .addFields(
                { name: '⚡ Status',   value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '📢 Channel',  value: config.channelId ? `<#${config.channelId}>` : '*not set*', inline: true },
                { name: '📄 Template', value: `\`\`\`${config.message}\`\`\``, inline: false }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [statusEmbed, embed] });
        return true;
    }

    // ── test ───────────────────────────────────
    if (sub === 'test') {
        const config = getWelcomeConfig(message.guild.id);
        if (!config || !config.channelId || !config.message) {
            await message.reply({ content: '❌ No welcome message configured. Use `!welcome setup` first.' });
            return true;
        }

        const channel = message.guild.channels.cache.get(config.channelId);
        if (!channel) {
            await message.reply({ content: '❌ Configured welcome channel no longer exists. Please run `!welcome setup` again.' });
            return true;
        }

        const messageText = resolvePlaceholders(config.message, message.member);
        const embed = buildWelcomeEmbed(message.member, messageText);

        await channel.send({ content: `${message.member}`, embeds: [embed] });
        await message.reply({ content: `✅ Test welcome sent to ${channel}.` });
        return true;
    }

    // ── help ───────────────────────────────────
    await message.reply(
        '**Welcome System Commands:**\n' +
        '`!welcome setup #channel <message>` — Configure welcome messages\n' +
        '`!welcome disable` — Disable welcome messages\n' +
        '`!welcome preview` — Preview the current welcome message\n' +
        '`!welcome test` — Send a test welcome to the configured channel\n\n' +
        '**Placeholders:** `{user}`, `{guild}`, `{count}`\n' +
        '*Use `/welcome` for slash command version.*'
    );
    return true;
}

// ─────────────────────────────────────────────
// SLASH COMMAND DEFINITION
// ─────────────────────────────────────────────
const data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome message system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // setup
    .addSubcommand(sub =>
        sub.setName('setup')
            .setDescription('Set up the welcome message for this server')
            .addChannelOption(opt =>
                opt.setName('channel')
                    .setDescription('Channel to send welcome messages in')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('message')
                    .setDescription('Welcome message — use {user}, {guild}, {count} as placeholders')
                    .setRequired(true)
            )
    )

    // disable
    .addSubcommand(sub =>
        sub.setName('disable')
            .setDescription('Disable welcome messages for this server')
    )

    // preview
    .addSubcommand(sub =>
        sub.setName('preview')
            .setDescription('Preview the current welcome message')
    )

    // test
    .addSubcommand(sub =>
        sub.setName('test')
            .setDescription('Send a test welcome message to the configured channel')
    );

// ─────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────
async function execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ── setup ──────────────────────────────────
    if (sub === 'setup') {
        const channel        = interaction.options.getChannel('channel');
        const welcomeMessage = interaction.options.getString('message');

        if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: '❌ Please select a valid text channel.',
                ephemeral: true
            });
        }

        saveWelcomeConfig(guildId, {
            enabled:   true,
            channelId: channel.id,
            message:   welcomeMessage
        });

        const embed = new EmbedBuilder()
            .setTitle('👋 Welcome System Configured')
            .setColor(0x2ECC71)
            .addFields(
                { name: '📢 Channel',  value: `${channel}`,                                inline: true  },
                { name: '📄 Message',  value: `\`\`\`${welcomeMessage}\`\`\``,             inline: false },
                { name: '💡 Tip',      value: 'Use `{user}`, `{guild}`, `{count}` as placeholders.', inline: false }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ── disable ────────────────────────────────
    if (sub === 'disable') {
        const existing = getWelcomeConfig(guildId);
        if (!existing) {
            return interaction.reply({
                content: '⚠️ Welcome system is not configured yet.',
                ephemeral: true
            });
        }
        saveWelcomeConfig(guildId, { ...existing, enabled: false });

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription('❌ Welcome messages have been **disabled**.')
                    .setColor(0xE74C3C)
                    .setTimestamp()
            ]
        });
    }

    // ── preview ────────────────────────────────
    if (sub === 'preview') {
        const config = getWelcomeConfig(guildId);
        if (!config || !config.message) {
            return interaction.reply({
                content: '❌ No welcome message configured. Use `/welcome setup` first.',
                ephemeral: true
            });
        }

        const messageText = resolvePlaceholders(config.message, interaction.member);
        const embed = buildWelcomeEmbed(interaction.member, messageText);

        const statusEmbed = new EmbedBuilder()
            .setTitle('👁️ Welcome Message Preview')
            .setColor(0x3498DB)
            .addFields(
                { name: '⚡ Status',   value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '📢 Channel',  value: config.channelId ? `<#${config.channelId}>` : '*not set*', inline: true },
                { name: '📄 Template', value: `\`\`\`${config.message}\`\`\``, inline: false }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [statusEmbed, embed] });
    }

    // ── test ───────────────────────────────────
    if (sub === 'test') {
        const config = getWelcomeConfig(guildId);
        if (!config || !config.channelId || !config.message) {
            return interaction.reply({
                content: '❌ No welcome message configured. Use `/welcome setup` first.',
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (!channel) {
            return interaction.reply({
                content: '❌ Configured welcome channel no longer exists. Please run `/welcome setup` again.',
                ephemeral: true
            });
        }

        const messageText = resolvePlaceholders(config.message, interaction.member);
        const embed = buildWelcomeEmbed(interaction.member, messageText);

        await channel.send({ content: `${interaction.member}`, embeds: [embed] });

        return interaction.reply({
            content: `✅ Test welcome sent to ${channel}.`,
            ephemeral: true
        });
    }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
    data,
    execute,
    handleMemberJoin,
    handlePrefix
};
