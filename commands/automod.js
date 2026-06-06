/**
 * Zishi — Full AutoMod System
 * Features:
 *  - Spam detection (message flood)
 *  - Caps lock filter
 *  - Mention spam filter
 *  - Link filter
 *  - Bad word filter
 *  - Autoreact to keywords
 *  - Configurable per guild via slash commands
 *  - Prefix command support for config
 */

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const {
    getSettings,
    saveSettings
} = require('../utils/settings');

// ==========================================
// SPAM TRACKER
// Map<guildId_userId, { count, timer }>
// ==========================================
const spamTracker = new Map();

// ==========================================
// AUTOMOD MESSAGE HANDLER
// Called from index.js on every messageCreate
// ==========================================
async function handleAutoMod(message, ownerId) {
    if (!message.guild) return;
    if (message.author.bot) return;

    // Fetch member if not cached (required for permission checks)
    let member = message.member;
    if (!member) {
        try {
            member = await message.guild.members.fetch(message.author.id);
        } catch {
            return; // Can't resolve member — skip
        }
    }

    if (!member) return;

    // Owner always bypasses AutoMod entirely
    if (ownerId && message.author.id === ownerId) return;

    // Skip admins and moderators
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

    // Ensure the bot itself has ManageMessages before attempting deletes
    const botMember = message.guild.members.me;
    const canDelete = botMember?.permissions.has(PermissionFlagsBits.ManageMessages) ?? false;

    const settings = getSettings(message.guild.id);

    // Ensure automod config exists
    if (!settings.automodConfig) {
        settings.automodConfig = {
            enabled: false,
            spamFilter: true,
            capsFilter: true,
            mentionFilter: true,
            linkFilter: false,
            badwordFilter: true,
            spamThreshold: 5,       // messages per window
            spamWindow: 5000,       // ms
            capsThreshold: 70,      // % caps to trigger
            mentionThreshold: 5,    // mentions per message
            logChannel: null
        };
    }

    if (!settings.automodConfig.enabled) return;

    const cfg = settings.automodConfig;
    const content = message.content;
    let violated = false;
    let reason = '';

    // ==========================================
    // 1. SPAM DETECTION
    // ==========================================
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
                    reason = `Spam detected (${tracker.count} messages in ${cfg.spamWindow / 1000}s)`;
                    spamTracker.delete(key);
                }
            } else {
                spamTracker.set(key, { count: 1, firstMsg: now });
            }
        }
    }

    // ==========================================
    // 2. CAPS LOCK FILTER
    // ==========================================
    if (!violated && cfg.capsFilter && content.length > 8) {
        const letters = content.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 5) {
            const capsPercent = (letters.replace(/[^A-Z]/g, '').length / letters.length) * 100;
            if (capsPercent >= cfg.capsThreshold) {
                violated = true;
                reason = `Excessive caps (${Math.round(capsPercent)}%)`;
            }
        }
    }

    // ==========================================
    // 3. MENTION SPAM
    // ==========================================
    if (!violated && cfg.mentionFilter) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount >= cfg.mentionThreshold) {
            violated = true;
            reason = `Mention spam (${mentionCount} mentions)`;
        }
    }

    // ==========================================
    // 4. LINK FILTER
    // ==========================================
    if (!violated && cfg.linkFilter) {
        const linkRegex = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+/gi;
        if (linkRegex.test(content)) {
            violated = true;
            reason = 'Unauthorized link';
        }
    }

    // ==========================================
    // 5. BAD WORD FILTER
    // ==========================================
    if (!violated && cfg.badwordFilter && settings.badwords?.length > 0) {
        const lower = content.toLowerCase();
        const found = settings.badwords.find(w => lower.includes(w.toLowerCase()));
        if (found) {
            violated = true;
            reason = `Prohibited word detected`;
        }
    }

    // ==========================================
    // ACTION: DELETE + WARN
    // ==========================================
    if (violated) {
        // Only attempt deletion if the bot has ManageMessages
        if (canDelete) {
            await message.delete().catch(() => {});
        }

        const warning = await message.channel.send({
            content: `⚠️ ${message.author} — **AutoMod:** ${reason}`
        }).catch(() => null);

        if (warning) {
            setTimeout(() => warning.delete().catch(() => {}), 5000);
        }

        // Log to log channel if configured
        if (cfg.logChannel) {
            const logCh = message.guild.channels.cache.get(cfg.logChannel);
            if (logCh) {
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ AutoMod Action')
                    .setColor(0xE74C3C)
                    .addFields(
                        { name: '👤 User', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                        { name: '📢 Channel', value: `${message.channel}`, inline: true },
                        { name: '⚠️ Reason', value: reason, inline: false },
                        { name: '💬 Message', value: content.slice(0, 500) || '*(empty)*', inline: false }
                    )
                    .setTimestamp();

                logCh.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }

}

// ==========================================
// SLASH COMMAND: /automod
// ==========================================
module.exports = {

    handleAutoMod,

    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure the AutoMod system')

        .addSubcommand(sub =>
            sub.setName('enable').setDescription('Enable AutoMod')
        )
        .addSubcommand(sub =>
            sub.setName('disable').setDescription('Disable AutoMod')
        )
        .addSubcommand(sub =>
            sub.setName('status').setDescription('View current AutoMod configuration')
        )
        .addSubcommand(sub =>
            sub.setName('spam')
                .setDescription('Configure spam filter')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable spam filter').setRequired(true))
                .addIntegerOption(opt => opt.setName('threshold').setDescription('Messages before action (default: 5)').setRequired(false))
                .addIntegerOption(opt => opt.setName('window').setDescription('Time window in seconds (default: 5)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('caps')
                .setDescription('Configure caps filter')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable caps filter').setRequired(true))
                .addIntegerOption(opt => opt.setName('threshold').setDescription('Caps % to trigger (default: 70)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('mentions')
                .setDescription('Configure mention spam filter')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable mention filter').setRequired(true))
                .addIntegerOption(opt => opt.setName('threshold').setDescription('Mentions before action (default: 5)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('links')
                .setDescription('Toggle link filter')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Block links').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('badwords-add')
                .setDescription('Add a word to the bad word filter')
                .addStringOption(opt => opt.setName('word').setDescription('Word to block').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('badwords-remove')
                .setDescription('Remove a word from the bad word filter')
                .addStringOption(opt => opt.setName('word').setDescription('Word to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('badwords-list')
                .setDescription('List all blocked words')
        )
        .addSubcommand(sub =>
            sub.setName('logchannel')
                .setDescription('Set the channel for AutoMod logs')
                .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('autoreact-add')
                .setDescription('Add an autoreact trigger')
                .addStringOption(opt => opt.setName('trigger').setDescription('Keyword to react to').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji to react with').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('autoreact-remove')
                .setDescription('Remove an autoreact trigger')
                .addStringOption(opt => opt.setName('trigger').setDescription('Trigger to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('autoreact-list')
                .setDescription('List all autoreact triggers')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const settings = getSettings(interaction.guild.id);
        const sub = interaction.options.getSubcommand();

        // Ensure automodConfig exists
        if (!settings.automodConfig) {
            settings.automodConfig = {
                enabled: false,
                spamFilter: true,
                capsFilter: true,
                mentionFilter: true,
                linkFilter: false,
                badwordFilter: true,
                spamThreshold: 5,
                spamWindow: 5000,
                capsThreshold: 70,
                mentionThreshold: 5,
                logChannel: null
            };
        }

        if (!settings.badwords) settings.badwords = [];
        if (!settings.autoreacts) settings.autoreacts = [];

        // ==========================================
        // ENABLE / DISABLE
        // ==========================================
        if (sub === 'enable') {
            settings.automodConfig.enabled = true;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply('✅ AutoMod **enabled**.');
        }

        if (sub === 'disable') {
            settings.automodConfig.enabled = false;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply('❌ AutoMod **disabled**.');
        }

        // ==========================================
        // STATUS
        // ==========================================
        if (sub === 'status') {
            const cfg = settings.automodConfig;
            const embed = new EmbedBuilder()
                .setTitle('🛡️ AutoMod Configuration')
                .setColor(cfg.enabled ? 0x2ECC71 : 0xE74C3C)
                .addFields(
                    { name: '⚡ Status', value: cfg.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '🔁 Spam Filter', value: cfg.spamFilter ? `✅ (${cfg.spamThreshold} msgs / ${cfg.spamWindow / 1000}s)` : '❌', inline: true },
                    { name: '🔠 Caps Filter', value: cfg.capsFilter ? `✅ (>${cfg.capsThreshold}%)` : '❌', inline: true },
                    { name: '📣 Mention Filter', value: cfg.mentionFilter ? `✅ (>${cfg.mentionThreshold} mentions)` : '❌', inline: true },
                    { name: '🔗 Link Filter', value: cfg.linkFilter ? '✅' : '❌', inline: true },
                    { name: '🤬 Bad Word Filter', value: cfg.badwordFilter ? `✅ (${settings.badwords.length} words)` : '❌', inline: true },
                    { name: '😄 Autoreacts', value: `${settings.autoreacts.length} trigger(s)`, inline: true },
                    { name: '📋 Log Channel', value: cfg.logChannel ? `<#${cfg.logChannel}>` : 'Not set', inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        // ==========================================
        // SPAM CONFIG
        // ==========================================
        if (sub === 'spam') {
            settings.automodConfig.spamFilter = interaction.options.getBoolean('enabled');
            const threshold = interaction.options.getInteger('threshold');
            const window = interaction.options.getInteger('window');
            if (threshold) settings.automodConfig.spamThreshold = threshold;
            if (window) settings.automodConfig.spamWindow = window * 1000;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Spam filter **${settings.automodConfig.spamFilter ? 'enabled' : 'disabled'}** (threshold: ${settings.automodConfig.spamThreshold}, window: ${settings.automodConfig.spamWindow / 1000}s).`);
        }

        // ==========================================
        // CAPS CONFIG
        // ==========================================
        if (sub === 'caps') {
            settings.automodConfig.capsFilter = interaction.options.getBoolean('enabled');
            const threshold = interaction.options.getInteger('threshold');
            if (threshold) settings.automodConfig.capsThreshold = threshold;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Caps filter **${settings.automodConfig.capsFilter ? 'enabled' : 'disabled'}** (threshold: ${settings.automodConfig.capsThreshold}%).`);
        }

        // ==========================================
        // MENTION CONFIG
        // ==========================================
        if (sub === 'mentions') {
            settings.automodConfig.mentionFilter = interaction.options.getBoolean('enabled');
            const threshold = interaction.options.getInteger('threshold');
            if (threshold) settings.automodConfig.mentionThreshold = threshold;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Mention filter **${settings.automodConfig.mentionFilter ? 'enabled' : 'disabled'}** (threshold: ${settings.automodConfig.mentionThreshold}).`);
        }

        // ==========================================
        // LINK FILTER
        // ==========================================
        if (sub === 'links') {
            settings.automodConfig.linkFilter = interaction.options.getBoolean('enabled');
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Link filter **${settings.automodConfig.linkFilter ? 'enabled' : 'disabled'}**.`);
        }

        // ==========================================
        // BAD WORDS
        // ==========================================
        if (sub === 'badwords-add') {
            const word = interaction.options.getString('word').toLowerCase();
            if (!settings.badwords.includes(word)) {
                settings.badwords.push(word);
                saveSettings(interaction.guild.id, settings);
            }
            return interaction.reply(`✅ Added \`${word}\` to bad word list.`);
        }

        if (sub === 'badwords-remove') {
            const word = interaction.options.getString('word').toLowerCase();
            settings.badwords = settings.badwords.filter(w => w !== word);
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Removed \`${word}\` from bad word list.`);
        }

        if (sub === 'badwords-list') {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🤬 Bad Word List')
                        .setDescription(settings.badwords.length ? settings.badwords.map(w => `\`${w}\``).join(', ') : 'No words added.')
                        .setColor(0xE74C3C)
                ]
            });
        }

        // ==========================================
        // LOG CHANNEL
        // ==========================================
        if (sub === 'logchannel') {
            const channel = interaction.options.getChannel('channel');
            settings.automodConfig.logChannel = channel.id;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ AutoMod logs will be sent to ${channel}.`);
        }

        // ==========================================
        // AUTOREACT
        // ==========================================
        if (sub === 'autoreact-add') {
            const trigger = interaction.options.getString('trigger').toLowerCase();
            const emoji = interaction.options.getString('emoji');

            const existing = settings.autoreacts.findIndex(r => r.trigger === trigger);
            if (existing >= 0) {
                settings.autoreacts[existing].emoji = emoji;
            } else {
                settings.autoreacts.push({ trigger, emoji });
            }

            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Autoreact added: \`${trigger}\` → ${emoji}`);
        }

        if (sub === 'autoreact-remove') {
            const trigger = interaction.options.getString('trigger').toLowerCase();
            settings.autoreacts = settings.autoreacts.filter(r => r.trigger !== trigger);
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Removed autoreact trigger: \`${trigger}\``);
        }

        if (sub === 'autoreact-list') {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('😄 Autoreact Triggers')
                        .setDescription(
                            settings.autoreacts.length
                                ? settings.autoreacts.map(r => `\`${r.trigger}\` → ${r.emoji}`).join('\n')
                                : 'No autoreacts configured.'
                        )
                        .setColor(0x00FFCC)
                ]
            });
        }
    },

    // ==========================================
    // PREFIX COMMAND HANDLER
    // Handles: !automod enable/disable/status/etc.
    // ==========================================
    async handlePrefix(message, commandName, args) {
        if (!message.guild) return false;
        if (commandName !== 'automod') return false;

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: '❌ Administrator permission required.' });
        }

        const settings = getSettings(message.guild.id);
        if (!settings.automodConfig) {
            settings.automodConfig = {
                enabled: false,
                spamFilter: true,
                capsFilter: true,
                mentionFilter: true,
                linkFilter: false,
                badwordFilter: true,
                spamThreshold: 5,
                spamWindow: 5000,
                capsThreshold: 70,
                mentionThreshold: 5,
                logChannel: null
            };
        }
        if (!settings.badwords) settings.badwords = [];
        if (!settings.autoreacts) settings.autoreacts = [];

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
                    { name: '⚡ Status', value: cfg.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '🔁 Spam Filter', value: cfg.spamFilter ? `✅` : '❌', inline: true },
                    { name: '🔠 Caps Filter', value: cfg.capsFilter ? `✅` : '❌', inline: true },
                    { name: '📣 Mention Filter', value: cfg.mentionFilter ? `✅` : '❌', inline: true },
                    { name: '🔗 Link Filter', value: cfg.linkFilter ? '✅' : '❌', inline: true },
                    { name: '🤬 Bad Words', value: `${settings.badwords.length} word(s)`, inline: true },
                    { name: '😄 Autoreacts', value: `${settings.autoreacts.length} trigger(s)`, inline: true }
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

        if (sub === 'autoreact-add' && args[1] && args[2]) {
            const trigger = args[1].toLowerCase();
            const emoji = args[2];
            const existing = settings.autoreacts.findIndex(r => r.trigger === trigger);
            if (existing >= 0) {
                settings.autoreacts[existing].emoji = emoji;
            } else {
                settings.autoreacts.push({ trigger, emoji });
            }
            saveSettings(message.guild.id, settings);
            return message.reply(`✅ Autoreact: \`${trigger}\` → ${emoji}`);
        }

        // Help
        return message.reply(
            '**AutoMod Prefix Commands:**\n' +
            '`!automod enable` — Enable AutoMod\n' +
            '`!automod disable` — Disable AutoMod\n' +
            '`!automod status` — View config\n' +
            '`!automod badword-add <word>` — Add bad word\n' +
            '`!automod badword-remove <word>` — Remove bad word\n' +
            '`!automod autoreact-add <trigger> <emoji>` — Add autoreact\n\n' +
            '*Use `/automod` for full slash command configuration.*'
        );
    }
};
