/**
 * Zishi — NoPrefix System
 *
 * Allows the bot owner to grant users the ability to run commands
 * without a prefix. Supports optional time-limited grants.
 *
 * Slash Commands:
 *   /noprefix add @user [minutes]  — Add user to no-prefix list
 *   /noprefix remove @user         — Remove user from no-prefix list
 *   /noprefix list                 — Show all no-prefix users
 *
 * Prefix Commands:
 *   !noprefix add @user [minutes]
 *   !noprefix remove @user
 *   !noprefix list
 *
 * Only the bot owner (OWNER_ID) can manage this list.
 * Data is stored in data/guildSettings.json under settings.noprefix
 */

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const { getSettings, saveSettings } = require('../utils/settings');

const OWNER_ID = '1063765297321816064';

// ==========================================
// HELPERS
// ==========================================

/**
 * Returns the noprefix config for a guild, initialising it if missing.
 * Structure: { users: { [userId]: { expiresAt: number|null } } }
 */
function getNoPrefixConfig(guildId) {
    const settings = getSettings(guildId);
    if (!settings.noprefix || typeof settings.noprefix !== 'object') {
        settings.noprefix = { users: {} };
        saveSettings(guildId, settings);
    }
    if (!settings.noprefix.users) {
        settings.noprefix.users = {};
        saveSettings(guildId, settings);
    }
    return settings;
}

/**
 * Check whether a user currently has no-prefix access.
 * Automatically removes expired entries.
 */
function hasNoPrefix(guildId, userId) {
    const settings = getNoPrefixConfig(guildId);
    const entry = settings.noprefix.users[userId];
    if (!entry) return false;

    // Check expiry
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        delete settings.noprefix.users[userId];
        saveSettings(guildId, settings);
        return false;
    }

    return true;
}

/**
 * Purge all expired no-prefix entries for a guild.
 */
function purgeExpired(guildId) {
    const settings = getNoPrefixConfig(guildId);
    const now = Date.now();
    let changed = false;

    for (const [uid, entry] of Object.entries(settings.noprefix.users)) {
        if (entry.expiresAt !== null && now > entry.expiresAt) {
            delete settings.noprefix.users[uid];
            changed = true;
        }
    }

    if (changed) saveSettings(guildId, settings);
}

// ==========================================
// SLASH COMMAND
// ==========================================
const data = new SlashCommandBuilder()
    .setName('noprefix')
    .setDescription('Manage the no-prefix user list (owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ADD
    .addSubcommand(sub =>
        sub
            .setName('add')
            .setDescription('Grant a user no-prefix access')
            .addUserOption(opt =>
                opt.setName('user').setDescription('User to grant').setRequired(true)
            )
            .addIntegerOption(opt =>
                opt.setName('minutes').setDescription('Duration in minutes (omit for permanent)').setRequired(false)
            )
    )

    // REMOVE
    .addSubcommand(sub =>
        sub
            .setName('remove')
            .setDescription('Revoke a user\'s no-prefix access')
            .addUserOption(opt =>
                opt.setName('user').setDescription('User to revoke').setRequired(true)
            )
    )

    // LIST
    .addSubcommand(sub =>
        sub
            .setName('list')
            .setDescription('Show all users with no-prefix access')
    );

// ==========================================
// EXECUTE (slash)
// ==========================================
async function execute(interaction) {
    // Owner-only guard
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
            content: '❌ Only the bot owner can manage the no-prefix list.',
            ephemeral: true
        });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ── ADD ──────────────────────────────────────
    if (sub === 'add') {
        const user = interaction.options.getUser('user');
        const minutes = interaction.options.getInteger('minutes') || null;

        const settings = getNoPrefixConfig(guildId);
        const expiresAt = minutes ? Date.now() + minutes * 60000 : null;

        settings.noprefix.users[user.id] = { expiresAt };
        saveSettings(guildId, settings);

        const expStr = expiresAt
            ? `<t:${Math.floor(expiresAt / 1000)}:R>`
            : '**permanent**';

        const embed = new EmbedBuilder()
            .setTitle('✅ No-Prefix Granted')
            .setColor(0x2ECC71)
            .addFields(
                { name: '👤 User', value: `${user} (\`${user.id}\`)`, inline: true },
                { name: '⏳ Expires', value: expStr, inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ── REMOVE ───────────────────────────────────
    if (sub === 'remove') {
        const user = interaction.options.getUser('user');
        const settings = getNoPrefixConfig(guildId);

        if (!settings.noprefix.users[user.id]) {
            return interaction.reply({
                content: `❌ ${user} does not have no-prefix access.`,
                ephemeral: true
            });
        }

        delete settings.noprefix.users[user.id];
        saveSettings(guildId, settings);

        const embed = new EmbedBuilder()
            .setTitle('🗑️ No-Prefix Revoked')
            .setColor(0xE74C3C)
            .addFields({ name: '👤 User', value: `${user} (\`${user.id}\`)` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ── LIST ─────────────────────────────────────
    if (sub === 'list') {
        return sendNoPrefixList(interaction, guildId, true);
    }
}

// ==========================================
// LIST BUILDER (shared between slash + prefix)
// ==========================================
async function sendNoPrefixList(ctx, guildId, isSlash = false) {
    const settings = getNoPrefixConfig(guildId);
    purgeExpired(guildId);

    const entries = Object.entries(settings.noprefix.users);

    let description = '';

    // Pin owner at top if they have no-prefix
    const ownerEntry = entries.find(([uid]) => uid === OWNER_ID);
    const otherEntries = entries.filter(([uid]) => uid !== OWNER_ID);

    const buildLine = ([uid, entry]) => {
        const expStr = entry.expiresAt
            ? `expires <t:${Math.floor(entry.expiresAt / 1000)}:R>`
            : 'permanent';
        return `<@${uid}> — ${expStr}`;
    };

    if (ownerEntry) {
        description += `👑 **Owner** — ${buildLine(ownerEntry)}\n`;
    }

    for (const entry of otherEntries) {
        description += `• ${buildLine(entry)}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 No-Prefix Users')
        .setColor(0x5865F2)
        .setDescription(description.trim() || '*No users have no-prefix access.*')
        .setFooter({ text: `${entries.length} user(s) total` })
        .setTimestamp();

    if (isSlash) {
        return ctx.reply({ embeds: [embed] });
    } else {
        return ctx.channel.send({ embeds: [embed] });
    }
}

// ==========================================
// PREFIX HANDLER
// Called from index.js messageCreate
// ==========================================
async function handlePrefix(message, commandName, args) {
    if (commandName !== 'noprefix') return false;

    // Owner-only guard
    if (message.author.id !== OWNER_ID) {
        await message.reply({ content: '❌ Only the bot owner can manage the no-prefix list.' });
        return true;
    }

    const sub = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    // ── ADD ──────────────────────────────────────
    if (sub === 'add') {
        const user = message.mentions.users.first();
        if (!user) {
            await message.reply({ content: '❌ Usage: `!noprefix add @user [minutes]`' });
            return true;
        }

        const minutes = parseInt(args[2]) || null;
        const settings = getNoPrefixConfig(guildId);
        const expiresAt = minutes ? Date.now() + minutes * 60000 : null;

        settings.noprefix.users[user.id] = { expiresAt };
        saveSettings(guildId, settings);

        const expStr = expiresAt
            ? `<t:${Math.floor(expiresAt / 1000)}:R>`
            : '**permanent**';

        const embed = new EmbedBuilder()
            .setTitle('✅ No-Prefix Granted')
            .setColor(0x2ECC71)
            .addFields(
                { name: '👤 User', value: `${user} (\`${user.id}\`)`, inline: true },
                { name: '⏳ Expires', value: expStr, inline: true }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ── REMOVE ───────────────────────────────────
    if (sub === 'remove') {
        const user = message.mentions.users.first();
        if (!user) {
            await message.reply({ content: '❌ Usage: `!noprefix remove @user`' });
            return true;
        }

        const settings = getNoPrefixConfig(guildId);

        if (!settings.noprefix.users[user.id]) {
            await message.reply({ content: `❌ ${user} does not have no-prefix access.` });
            return true;
        }

        delete settings.noprefix.users[user.id];
        saveSettings(guildId, settings);

        const embed = new EmbedBuilder()
            .setTitle('🗑️ No-Prefix Revoked')
            .setColor(0xE74C3C)
            .addFields({ name: '👤 User', value: `${user} (\`${user.id}\`)` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ── LIST ─────────────────────────────────────
    if (sub === 'list') {
        await sendNoPrefixList(message, guildId, false);
        return true;
    }

    // Help
    await message.reply({
        content:
            '**NoPrefix Commands:**\n' +
            '`!noprefix add @user [minutes]` — Grant no-prefix access\n' +
            '`!noprefix remove @user` — Revoke no-prefix access\n' +
            '`!noprefix list` — Show all no-prefix users\n\n' +
            '*Use `/noprefix` for slash command version.*'
    });
    return true;
}

// ==========================================
// EXPIRY TIMER
// Call this from index.js on ready to auto-purge expired entries
// ==========================================
function startExpiryTimer(client) {
    setInterval(() => {
        for (const guild of client.guilds.cache.values()) {
            try {
                purgeExpired(guild.id);
            } catch {
                // Ignore per-guild errors
            }
        }
    }, 60000); // Check every minute
}

module.exports = {
    data,
    execute,
    handlePrefix,
    hasNoPrefix,
    startExpiryTimer
};
