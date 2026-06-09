/**
 * Zishi — AutoMod System (Full Recreation)
 *
 * Slash commands:
 *   /automod enable                          — Enable AutoMod
 *   /automod disable                         — Disable AutoMod
 *   /automod status                          — Show current config
 *   /automod spam     <enabled>              — Toggle spam filter
 *   /automod caps     <enabled>              — Toggle caps filter
 *   /automod mentions <enabled>              — Toggle mention spam filter
 *   /automod links    <enabled>              — Toggle link filter
 *   /automod badwords <add|remove|list> ...  — Manage bad word list
 *   /automod logchannel <channel>            — Set log channel
 *   /automod whitelist <add|remove|list> ... — Whitelist users / roles
 *
 * Filters:
 *   Spam     — 5+ messages in 5 seconds
 *   Caps     — 70%+ uppercase letters in a message
 *   Mentions — 5+ user/role mentions in one message
 *   Links    — any URL (discord.gg links are whitelisted by default)
 *   Bad words — configurable per-guild list
 *
 * Bypasses:
 *   • Bot owner (OWNER_ID env var)
 *   • Members with ManageMessages permission
 *   • Whitelisted user IDs
 *   • Whitelisted role IDs
 *
 * Config stored in data/guildSettings.json via utils/settings.js
 */

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const { getSettings, saveSettings } = require('../utils/settings');

// ─────────────────────────────────────────────
// SPAM TRACKER  Map<"guildId_userId", { count, firstMsg }>
// ─────────────────────────────────────────────
const spamTracker = new Map();

// ─────────────────────────────────────────────
// DEFAULT CONFIG FACTORY
// ─────────────────────────────────────────────
function defaultConfig() {
    return {
        enabled:          false,
        spamFilter:       true,
        capsFilter:       true,
        mentionFilter:    true,
        linkFilter:       false,
        badwordFilter:    true,
        spamThreshold:    5,      // messages before action
        spamWindow:       5000,   // ms
        capsThreshold:    70,     // % uppercase to trigger
        mentionThreshold: 5,      // mentions per message
        logChannel:       null,
        whitelist: {
            users: [],            // user IDs that bypass AutoMod
            roles: []             // role IDs that bypass AutoMod
        }
    };
}

/** Ensure a guild's automod config is fully populated (handles old partial configs). */
function ensureConfig(settings) {
    if (!settings.automodConfig) {
        settings.automodConfig = defaultConfig();
    } else {
        // Back-fill any missing keys from the default
        const def = defaultConfig();
        for (const [k, v] of Object.entries(def)) {
            if (settings.automodConfig[k] === undefined) {
                settings.automodConfig[k] = v;
            }
        }
        if (!settings.automodConfig.whitelist) {
            settings.automodConfig.whitelist = { users: [], roles: [] };
        }
        if (!settings.automodConfig.whitelist.users) settings.automodConfig.whitelist.users = [];
        if (!settings.automodConfig.whitelist.roles) settings.automodConfig.whitelist.roles = [];
    }
    if (!settings.badwords)   settings.badwords   = [];
    if (!settings.autoreacts) settings.autoreacts = [];
    return settings;
}

// ─────────────────────────────────────────────
// AUTOMOD MESSAGE HANDLER  (called from index.js)
// ─────────────────────────────────────────────
async function handleAutoMod(message, ownerId) {
    if (!message.guild)      return;
    if (message.author.bot)  return;

    // Resolve member (may be partial)
    let member = message.member;
    if (!member) {
        try { member = await message.guild.members.fetch(message.author.id); }
        catch { return; }
    }
    if (!member) return;

    // ── Bypass: bot owner ──
    if (ownerId && message.author.id === ownerId) return;

    // ── Bypass: ManageMessages permission ──
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

    const settings = getSettings(message.guild.id);
    ensureConfig(settings);

    if (!settings.automodConfig.enabled) return;

    const cfg = settings.automodConfig;

    // ── Bypass: whitelisted user ──
    if (cfg.whitelist.users.includes(message.author.id)) return;

    // ── Bypass: whitelisted role ──
    if (member.roles.cache.some(r => cfg.whitelist.roles.includes(r.id))) return;

    // Ensure the bot can delete messages
    const botMember = message.guild.members.me;
    const canDelete = botMember?.permissions.has(PermissionFlagsBits.ManageMessages) ?? false;

    const content = message.content;
    let violated  = false;
    let reason    = '';

    // ── 1. SPAM DETECTION ──────────────────────
    if (cfg.spamFilter) {
        const key = `${message.guild.id}_${message.author.id}`;
        const now = Date.now();

        if (!spamTracker.has(key)) {
            spamTracker.set(key, { count: 1, firstMsg: now });
        } else {
            const tracker = spamTracker.get(key);
            if (now - tracker.firstMsg < cfg.spamWindow) {
                tracker.count++;
                if (tracker.count >= cfg.spamThreshold) {
                    violated = true;
                    reason   = `Spam detected (${tracker.count} messages in ${cfg.spamWindow / 1000}s)`;
                    spamTracker.delete(key);
                }
            } else {
                spamTracker.set(key, { count: 1, firstMsg: now });
            }
        }
    }

    // ── 2. CAPS FILTER ─────────────────────────
    if (!violated && cfg.capsFilter && content.length > 8) {
        const letters = content.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 5) {
            const capsPercent = (letters.replace(/[^A-Z]/g, '').length / letters.length) * 100;
            if (capsPercent >= cfg.capsThreshold) {
                violated = true;
                reason   = `Excessive caps (${Math.round(capsPercent)}%)`;
            }
        }
    }

    // ── 3. MENTION SPAM ────────────────────────
    if (!violated && cfg.mentionFilter) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount >= cfg.mentionThreshold) {
            violated = true;
            reason   = `Mention spam (${mentionCount} mentions)`;
        }
    }

    // ── 4. LINK FILTER ─────────────────────────
    if (!violated && cfg.linkFilter) {
        // Allow discord.gg invite links by default
        const stripped = content.replace(/discord\.gg\/\S+/gi, '');
        const linkRegex = /https?:\/\/\S+/gi;
        if (linkRegex.test(stripped)) {
            violated = true;
            reason   = 'Unauthorized link';
        }
    }

    // ── 5. BAD WORD FILTER ─────────────────────
    if (!violated && cfg.badwordFilter && settings.badwords.length > 0) {
        const lower = content.toLowerCase();
        const found = settings.badwords.find(w => lower.includes(w.toLowerCase()));
        if (found) {
            violated = true;
            reason   = 'Prohibited word detected';
        }
    }

    // ── ACTION ─────────────────────────────────
    if (!violated) return;

    console.log(`[AutoMod] Violation in ${message.guild.name} by ${message.author.tag}: ${reason}`);

    // Delete the offending message
    if (canDelete) {
        await message.delete().catch(err =>
            console.warn(`[AutoMod] Could not delete message: ${err.message}`)
        );
    }

    // Send a temporary warning in the channel
    try {
        const warning = await message.channel.send({
            content: `⚠️ ${message.author} — **AutoMod:** ${reason}`
        });
        setTimeout(() => warning.delete().catch(() => {}), 5000);
    } catch (err) {
        console.warn(`[AutoMod] Could not send warning: ${err.message}`);
    }

    // Log to log channel
    if (cfg.logChannel) {
        const logCh = message.guild.channels.cache.get(cfg.logChannel);
        if (logCh) {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ AutoMod Action')
                .setColor(0xE74C3C)
                .addFields(
                    { name: '👤 User',    value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                    { name: '📢 Channel', value: `${message.channel}`,                               inline: true },
                    { name: '⚠️ Reason',  value: reason,                                             inline: false },
                    { name: '💬 Message', value: content.slice(0, 500) || '*(empty)*',               inline: false }
                )
                .setTimestamp();

            logCh.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

// ─────────────────────────────────────────────
// SLASH COMMAND DEFINITION
// ─────────────────────────────────────────────
const data = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure the AutoMod system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // enable / disable / status
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable AutoMod'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable AutoMod'))
    .addSubcommand(sub => sub.setName('status').setDescription('Show current AutoMod configuration'))

    // spam
    .addSubcommand(sub =>
        sub.setName('spam')
            .setDescription('Toggle the spam filter (5+ messages in 5 seconds)')
            .addBooleanOption(opt =>
                opt.setName('enabled').setDescription('Enable spam filter').setRequired(true)
            )
    )

    // caps
    .addSubcommand(sub =>
        sub.setName('caps')
            .setDescription('Toggle the caps filter (70%+ uppercase)')
            .addBooleanOption(opt =>
                opt.setName('enabled').setDescription('Enable caps filter').setRequired(true)
            )
    )

    // mentions
    .addSubcommand(sub =>
        sub.setName('mentions')
            .setDescription('Toggle the mention spam filter (5+ mentions per message)')
            .addBooleanOption(opt =>
                opt.setName('enabled').setDescription('Enable mention filter').setRequired(true)
            )
    )

    // links
    .addSubcommand(sub =>
        sub.setName('links')
            .setDescription('Toggle the link filter (discord.gg links are always allowed)')
            .addBooleanOption(opt =>
                opt.setName('enabled').setDescription('Block links').setRequired(true)
            )
    )

    // badwords
    .addSubcommand(sub =>
        sub.setName('badwords')
            .setDescription('Manage the bad word list')
            .addStringOption(opt =>
                opt.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'add',    value: 'add'    },
                        { name: 'remove', value: 'remove' },
                        { name: 'list',   value: 'list'   }
                    )
            )
            .addStringOption(opt =>
                opt.setName('word')
                    .setDescription('Word to add or remove (not needed for list)')
                    .setRequired(false)
            )
    )

    // logchannel
    .addSubcommand(sub =>
        sub.setName('logchannel')
            .setDescription('Set the channel where AutoMod violations are logged')
            .addChannelOption(opt =>
                opt.setName('channel').setDescription('Log channel').setRequired(true)
            )
    )

    // whitelist
    .addSubcommand(sub =>
        sub.setName('whitelist')
            .setDescription('Whitelist a user or role so they bypass AutoMod')
            .addStringOption(opt =>
                opt.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'add',    value: 'add'    },
                        { name: 'remove', value: 'remove' },
                        { name: 'list',   value: 'list'   }
                    )
            )
            .addUserOption(opt =>
                opt.setName('user')
                    .setDescription('User to whitelist / un-whitelist')
                    .setRequired(false)
            )
            .addRoleOption(opt =>
                opt.setName('role')
                    .setDescription('Role to whitelist / un-whitelist')
                    .setRequired(false)
            )
    );

// ─────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────
async function execute(interaction) {
    const sub      = interaction.options.getSubcommand();
    const guildId  = interaction.guild.id;
    const settings = getSettings(guildId);
    ensureConfig(settings);

    const cfg = settings.automodConfig;

    // ── enable ──────────────────────────────────
    if (sub === 'enable') {
        cfg.enabled = true;
        saveSettings(guildId, settings);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription('✅ AutoMod has been **enabled**.')
                    .setColor(0x2ECC71)
            ]
        });
    }

    // ── disable ─────────────────────────────────
    if (sub === 'disable') {
        cfg.enabled = false;
        saveSettings(guildId, settings);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription('❌ AutoMod has been **disabled**.')
                    .setColor(0xE74C3C)
            ]
        });
    }

    // ── status ──────────────────────────────────
    if (sub === 'status') {
        const wlUsers = cfg.whitelist.users.map(id => `<@${id}>`).join(', ') || '*none*';
        const wlRoles = cfg.whitelist.roles.map(id => `<@&${id}>`).join(', ') || '*none*';

        const embed = new EmbedBuilder()
            .setTitle('🛡️ AutoMod Configuration')
            .setColor(cfg.enabled ? 0x2ECC71 : 0xE74C3C)
            .addFields(
                { name: '⚡ Status',          value: cfg.enabled ? '✅ Enabled' : '❌ Disabled',                                                    inline: true  },
                { name: '🔁 Spam Filter',     value: cfg.spamFilter    ? `✅ (${cfg.spamThreshold} msgs / ${cfg.spamWindow / 1000}s)` : '❌',       inline: true  },
                { name: '🔠 Caps Filter',     value: cfg.capsFilter    ? `✅ (>${cfg.capsThreshold}% caps)`                           : '❌',       inline: true  },
                { name: '📣 Mention Filter',  value: cfg.mentionFilter ? `✅ (>${cfg.mentionThreshold} mentions)`                     : '❌',       inline: true  },
                { name: '🔗 Link Filter',     value: cfg.linkFilter    ? '✅ (discord.gg allowed)'                                    : '❌',       inline: true  },
                { name: '🤬 Bad Word Filter', value: cfg.badwordFilter ? `✅ (${settings.badwords.length} word(s))`                   : '❌',       inline: true  },
                { name: '📋 Log Channel',     value: cfg.logChannel    ? `<#${cfg.logChannel}>`                                       : '*not set*', inline: true  },
                { name: '👤 Whitelisted Users', value: wlUsers,                                                                                     inline: false },
                { name: '🎭 Whitelisted Roles', value: wlRoles,                                                                                     inline: false }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ── spam ────────────────────────────────────
    if (sub === 'spam') {
        cfg.spamFilter = interaction.options.getBoolean('enabled');
        saveSettings(guildId, settings);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `🔁 Spam filter **${cfg.spamFilter ? 'enabled' : 'disabled'}**.\n` +
                        `Threshold: **${cfg.spamThreshold}** messages in **${cfg.spamWindow / 1000}s**.`
                    )
                    .setColor(cfg.spamFilter ? 0x2ECC71 : 0xE74C3C)
            ]
        });
    }

    // ── caps ────────────────────────────────────
    if (sub === 'caps') {
        cfg.capsFilter = interaction.options.getBoolean('enabled');
        saveSettings(guildId, settings);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `🔠 Caps filter **${cfg.capsFilter ? 'enabled' : 'disabled'}**.\n` +
                        `Triggers at **${cfg.capsThreshold}%** uppercase.`
                    )
                    .setColor(cfg.capsFilter ? 0x2ECC71 : 0xE74C3C)
            ]
        });
    }

    // ── mentions ────────────────────────────────
    if (sub === 'mentions') {
        cfg.mentionFilter = interaction.options.getBoolean('enabled');
        saveSettings(guildId, settings);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `📣 Mention filter **${cfg.mentionFilter ? 'enabled' : 'disabled'}**.\n` +
                        `Triggers at **${cfg.mentionThreshold}+** mentions per message.`
                    )
                    .setColor(cfg.mentionFilter ? 0x2ECC71 : 0xE74C3C)
            ]
        });
    }

    // ── links ───────────────────────────────────
    if (sub === 'links') {
        cfg.linkFilter = interaction.options.getBoolean('enabled');
        saveSettings(guildId, settings);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `🔗 Link filter **${cfg.linkFilter ? 'enabled' : 'disabled'}**.\n` +
                        (cfg.linkFilter ? 'discord.gg invite links are always permitted.' : '')
                    )
                    .setColor(cfg.linkFilter ? 0x2ECC71 : 0xE74C3C)
            ]
        });
    }

    // ── badwords ────────────────────────────────
    if (sub === 'badwords') {
        const action = interaction.options.getString('action');
        const word   = interaction.options.getString('word')?.toLowerCase();

        if (action === 'add') {
            if (!word) {
                return interaction.reply({ content: '❌ Please provide a word to add.', ephemeral: true });
            }
            if (!settings.badwords.includes(word)) {
                settings.badwords.push(word);
                saveSettings(guildId, settings);
            }
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`✅ Added \`${word}\` to the bad word list. (${settings.badwords.length} total)`)
                        .setColor(0x2ECC71)
                ]
            });
        }

        if (action === 'remove') {
            if (!word) {
                return interaction.reply({ content: '❌ Please provide a word to remove.', ephemeral: true });
            }
            const before = settings.badwords.length;
            settings.badwords = settings.badwords.filter(w => w !== word);
            saveSettings(guildId, settings);
            const removed = before !== settings.badwords.length;
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(removed
                            ? `✅ Removed \`${word}\` from the bad word list.`
                            : `⚠️ \`${word}\` was not in the bad word list.`
                        )
                        .setColor(removed ? 0x2ECC71 : 0xF39C12)
                ]
            });
        }

        if (action === 'list') {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🤬 Bad Word List')
                        .setDescription(
                            settings.badwords.length
                                ? settings.badwords.map(w => `\`${w}\``).join(', ')
                                : '*No words added yet.*'
                        )
                        .setColor(0xE74C3C)
                        .setFooter({ text: `${settings.badwords.length} word(s)` })
                ],
                ephemeral: true
            });
        }
    }

    // ── logchannel ──────────────────────────────
    if (sub === 'logchannel') {
        const channel = interaction.options.getChannel('channel');
        cfg.logChannel = channel.id;
        saveSettings(guildId, settings);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`📋 AutoMod violations will now be logged in ${channel}.`)
                    .setColor(0x2ECC71)
            ]
        });
    }

    // ── whitelist ───────────────────────────────
    if (sub === 'whitelist') {
        const action = interaction.options.getString('action');
        const user   = interaction.options.getUser('user');
        const role   = interaction.options.getRole('role');

        if (action === 'list') {
            const uList = cfg.whitelist.users.map(id => `<@${id}>`).join('\n')  || '*none*';
            const rList = cfg.whitelist.roles.map(id => `<@&${id}>`).join('\n') || '*none*';
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📋 AutoMod Whitelist')
                        .setColor(0x5865F2)
                        .addFields(
                            { name: '👤 Whitelisted Users', value: uList, inline: true },
                            { name: '🎭 Whitelisted Roles', value: rList, inline: true }
                        )
                ],
                ephemeral: true
            });
        }

        if (!user && !role) {
            return interaction.reply({
                content: '❌ Please provide a **user** or **role** to whitelist.',
                ephemeral: true
            });
        }

        if (action === 'add') {
            let added = [];
            if (user && !cfg.whitelist.users.includes(user.id)) {
                cfg.whitelist.users.push(user.id);
                added.push(`<@${user.id}>`);
            }
            if (role && !cfg.whitelist.roles.includes(role.id)) {
                cfg.whitelist.roles.push(role.id);
                added.push(`<@&${role.id}>`);
            }
            saveSettings(guildId, settings);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            added.length
                                ? `✅ Added to AutoMod whitelist: ${added.join(', ')}`
                                : '⚠️ Already whitelisted.'
                        )
                        .setColor(added.length ? 0x2ECC71 : 0xF39C12)
                ]
            });
        }

        if (action === 'remove') {
            let removed = [];
            if (user && cfg.whitelist.users.includes(user.id)) {
                cfg.whitelist.users = cfg.whitelist.users.filter(id => id !== user.id);
                removed.push(`<@${user.id}>`);
            }
            if (role && cfg.whitelist.roles.includes(role.id)) {
                cfg.whitelist.roles = cfg.whitelist.roles.filter(id => id !== role.id);
                removed.push(`<@&${role.id}>`);
            }
            saveSettings(guildId, settings);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            removed.length
                                ? `✅ Removed from AutoMod whitelist: ${removed.join(', ')}`
                                : '⚠️ Not found in whitelist.'
                        )
                        .setColor(removed.length ? 0x2ECC71 : 0xF39C12)
                ]
            });
        }
    }
}

// ─────────────────────────────────────────────
// PREFIX COMMAND HANDLER  (called from index.js)
// Handles: !automod enable/disable/status/etc.
// ─────────────────────────────────────────────
async function handlePrefix(message, commandName, args) {
    if (!message.guild)          return false;
    if (commandName !== 'automod') return false;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({ content: '❌ Administrator permission required.' });
    }

    const settings = getSettings(message.guild.id);
    ensureConfig(settings);

    const sub = args?.[0]?.toLowerCase();

    if (sub === 'enable') {
        settings.automodConfig.enabled = true;
        saveSettings(message.guild.id, settings);
        return message.reply('✅ AutoMod **enabled**.');
    }

    if (sub === 'disable') {
        settings.automodConfig.enabled = false;
        saveSettings(message.guild.id, settings);
        return message.reply('❌ AutoMod **disabled**.');
    }

    if (sub === 'status') {
        const cfg = settings.automodConfig;
        const embed = new EmbedBuilder()
            .setTitle('🛡️ AutoMod Configuration')
            .setColor(cfg.enabled ? 0x2ECC71 : 0xE74C3C)
            .addFields(
                { name: '⚡ Status',         value: cfg.enabled       ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '🔁 Spam Filter',    value: cfg.spamFilter    ? '✅' : '❌',                  inline: true },
                { name: '🔠 Caps Filter',    value: cfg.capsFilter    ? '✅' : '❌',                  inline: true },
                { name: '📣 Mention Filter', value: cfg.mentionFilter ? '✅' : '❌',                  inline: true },
                { name: '🔗 Link Filter',    value: cfg.linkFilter    ? '✅' : '❌',                  inline: true },
                { name: '🤬 Bad Words',      value: `${settings.badwords.length} word(s)`,            inline: true }
            );
        return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'badword-add' && args[1]) {
        const word = args[1].toLowerCase();
        if (!settings.badwords.includes(word)) settings.badwords.push(word);
        saveSettings(message.guild.id, settings);
        return message.reply(`✅ Added \`${word}\` to bad word list.`);
    }

    if (sub === 'badword-remove' && args[1]) {
        settings.badwords = settings.badwords.filter(w => w !== args[1].toLowerCase());
        saveSettings(message.guild.id, settings);
        return message.reply(`✅ Removed \`${args[1]}\` from bad word list.`);
    }

    // Help
    return message.reply(
        '**AutoMod Prefix Commands:**\n' +
        '`!automod enable` — Enable AutoMod\n' +
        '`!automod disable` — Disable AutoMod\n' +
        '`!automod status` — View config\n' +
        '`!automod badword-add <word>` — Add bad word\n' +
        '`!automod badword-remove <word>` — Remove bad word\n\n' +
        '*Use `/automod` for full slash command configuration.*'
    );
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
    data,
    execute,
    handleAutoMod,
    handlePrefix
};
