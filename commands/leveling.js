/**
 * Zishi — Leveling System
 * Supports BOTH Slash Commands AND Prefix Commands (!)
 * XP tracking, level-up messages, leaderboard, rank, reset
 */

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// Use the shared settings utility so all modules stay in sync
const {
    getSettings: _getSettings,
    saveSettings
} = require('../utils/settings');

const LEVEL_DB =
    path.join(__dirname, '../data/levels.json');

if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify({}, null, 4));
}

// ==========================================
// SETTINGS HELPER
// Ensures leveling is always an object, not a legacy boolean
// ==========================================
function getSettings(guildId) {
    const settings = _getSettings(guildId);

    // Migrate legacy boolean value to proper object
    if (!settings.leveling || typeof settings.leveling !== 'object') {
        settings.leveling = {
            enabled: false,
            channels: [],
            multiplier: 1
        };
        saveSettings(guildId, settings);
    }

    if (!Array.isArray(settings.leveling.channels)) {
        settings.leveling.channels = [];
    }

    return settings;
}

// ==========================================
// LEVEL DB FUNCTIONS
// ==========================================

function getLevels() {
    return JSON.parse(fs.readFileSync(LEVEL_DB, 'utf8'));
}

function saveLevels(data) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify(data, null, 4));
}

const cooldowns = new Set();

// ==========================================
// COMMAND
// ==========================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('leveling')
        .setDescription('Manage leveling system')

        // =========================
        // ENABLE
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('enable')
                .setDescription('Enable leveling')
        )

        // =========================
        // DISABLE
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('disable')
                .setDescription('Disable leveling')
        )

        // =========================
        // SETUP CHANNEL
        // Where level-up messages are sent
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('setup-channel')
                .setDescription('Set the channel where level-up messages are sent')

                .addChannelOption(opt =>
                    opt
                        .setName('channel')
                        .setDescription('Level-up announcement channel')
                        .setRequired(true)
                )
        )

        // =========================
        // CHANNEL ADD
        // Channels where XP is earned (empty = all channels)
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('channel-add')
                .setDescription('Restrict XP gain to a specific channel')

                .addChannelOption(opt =>
                    opt
                        .setName('channel')
                        .setDescription('Channel where XP is earned')
                        .setRequired(true)
                )
        )

        // =========================
        // CHANNEL REMOVE
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('channel-remove')
                .setDescription('Remove an XP channel restriction')

                .addChannelOption(opt =>
                    opt
                        .setName('channel')
                        .setDescription('Channel to remove')
                        .setRequired(true)
                )
        )

        // =========================
        // RANK
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('rank')
                .setDescription('View your level')
        )

        // =========================
        // LEADERBOARD
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('leaderboard')
                .setDescription('View top levels')
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        const sub =
            interaction.options.getSubcommand();

        const settings =
            getSettings(interaction.guild.id);

        // ==========================================
        // ENABLE
        // ==========================================

        if (sub === 'enable') {

            settings.leveling.enabled = true;

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                '✅ Leveling enabled.'
            );
        }

        // ==========================================
        // DISABLE
        // ==========================================

        if (sub === 'disable') {

            settings.leveling.enabled = false;

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                '❌ Leveling disabled.'
            );
        }

        // ==========================================
        // SETUP CHANNEL
        // Sets where level-up announcements are posted
        // ==========================================

        if (sub === 'setup-channel') {

            const channel =
                interaction.options.getChannel('channel');

            settings.leveling.setupChannel = channel.id;

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                `✅ Level-up messages will now be sent to ${channel}.`
            );
        }

        // ==========================================
        // CHANNEL ADD
        // ==========================================

        if (sub === 'channel-add') {

            const channel =
                interaction.options.getChannel(
                    'channel'
                );

            if (
                settings.leveling.channels.includes(
                    channel.id
                )
            ) {

                return interaction.reply(
                    '❌ Channel already added.'
                );
            }

            settings.leveling.channels.push(
                channel.id
            );

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                `✅ Added ${channel} to leveling channels.`
            );
        }

        // ==========================================
        // CHANNEL REMOVE
        // ==========================================

        if (sub === 'channel-remove') {

            const channel =
                interaction.options.getChannel(
                    'channel'
                );

            settings.leveling.channels =
                settings.leveling.channels.filter(
                    c => c !== channel.id
                );

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                `✅ Removed ${channel} from leveling channels.`
            );
        }

        // ==========================================
        // RANK
        // ==========================================

        if (sub === 'rank') {

            const levels = getLevels();

            const key =
                `${interaction.guild.id}_${interaction.user.id}`;

            if (!levels[key]) {

                levels[key] = {
                    xp: 0,
                    level: 1
                };

                saveLevels(levels);
            }

            const profile = levels[key];

            const neededXP =
                profile.level * 100;

            const embed = new EmbedBuilder()

                .setTitle(
                    `${interaction.user.username}'s Rank`
                )

                .setColor(0x00FFCC)

                .addFields(
                    {
                        name: '📈 Level',
                        value:
                            `\`${profile.level}\``,
                        inline: true
                    },
                    {
                        name: '⚡ XP',
                        value:
                            `\`${profile.xp}/${neededXP}\``,
                        inline: true
                    }
                );

            return interaction.reply({
                embeds: [embed]
            });
        }

        // ==========================================
        // LEADERBOARD
        // ==========================================

        if (sub === 'leaderboard') {

            const levels = getLevels();

            const filtered =
                Object.entries(levels)

                .filter(([key]) =>
                    key.startsWith(
                        interaction.guild.id
                    )
                )

                .sort(
                    (a, b) =>
                        b[1].level - a[1].level
                )

                .slice(0, 10);

            let desc = '';

            for (let i = 0; i < filtered.length; i++) {

                const userId =
                    filtered[i][0].split('_')[1];

                const user =
                    await interaction.client.users
                        .fetch(userId)
                        .catch(() => null);

                desc +=
                    `**#${i + 1}** ${
                        user
                            ? user.username
                            : 'Unknown'
                    } — Level ${
                        filtered[i][1].level
                    }\n`;
            }

            const embed = new EmbedBuilder()

                .setTitle('🏆 Level Leaderboard')

                .setDescription(
                    desc || 'No data.'
                )

                .setColor(0xFFD700);

            return interaction.reply({
                embeds: [embed]
            });
        }
    },

    // ==========================================
    // LEVEL ENGINE
    // ==========================================

    async handleMessage(message) {

        if (!message.guild) return;
        if (message.author.bot) return;

        const settings =
            getSettings(message.guild.id);

        if (
            !settings.leveling.enabled
        ) return;

        // =========================
        // CHANNEL FILTER (XP gain restriction)
        // If specific channels are configured, only earn XP there.
        // If no channels are configured, XP is earned in ALL channels.
        // =========================

        if (
            settings.leveling.channels.length > 0 &&
            !settings.leveling.channels.includes(
                message.channel.id
            )
        ) return;

        // =========================
        // COOLDOWN
        // =========================

        const cooldownKey =
            `${message.guild.id}_${message.author.id}`;

        if (
            cooldowns.has(cooldownKey)
        ) return;

        cooldowns.add(cooldownKey);

        setTimeout(() => {

            cooldowns.delete(
                cooldownKey
            );

        }, 10000);

        // =========================
        // LEVELS
        // =========================

        const levels =
            getLevels();

        const key =
            `${message.guild.id}_${message.author.id}`;

        if (!levels[key]) {

            levels[key] = {
                xp: 0,
                level: 1
            };
        }

        const profile =
            levels[key];

        const xpGain =
            Math.floor(
                Math.random() * 15
            ) + 10;

        profile.xp += xpGain;

        const neededXP =
            profile.level * 100;

        // =========================
        // LEVEL UP
        // Send announcement to the configured setup channel only.
        // Falls back to the current channel if none is set.
        // =========================

        if (
            profile.xp >= neededXP
        ) {

            profile.level += 1;
            profile.xp = 0;

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        '🎉 Level Up!'
                    )

                    .setDescription(
                        `${message.author} reached level **${profile.level}**! 🚀`
                    )

                    .setColor(0x2ECC71)

                    .setThumbnail(
                        message.author.displayAvatarURL({ size: 128 })
                    )

                    .setTimestamp();

            // Resolve the announcement channel
            const setupChannelId =
                settings.leveling.setupChannel;

            const announceChannel =
                setupChannelId
                    ? (message.guild.channels.cache.get(setupChannelId) || message.channel)
                    : message.channel;

            announceChannel.send({
                embeds: [embed]
            }).catch(() => {});
        }

        saveLevels(levels);
    },

    // ==========================================
    // PREFIX COMMAND HANDLER
    // Called from index.js messageCreate event
    // Handles: !rank, !leaderboard, !resetlevels
    // ==========================================
    async handlePrefix(message, commandName, args) {
        if (!message.guild) return false;

        const levels = getLevels();
        const settings = getSettings(message.guild.id);

        // RANK
        if (commandName === 'rank') {
            let target = message.mentions.users.first() || message.author;

            const key = `${message.guild.id}_${target.id}`;
            const profile = levels[key] || { xp: 0, level: 1 };
            const neededXP = profile.level * 100;

            const embed = new EmbedBuilder()
                .setTitle(`${target.username}'s Rank`)
                .setColor(0x00FFCC)
                .setThumbnail(target.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: '📈 Level', value: `\`${profile.level}\``, inline: true },
                    { name: '⚡ XP', value: `\`${profile.xp}/${neededXP}\``, inline: true }
                );

            await message.channel.send({ embeds: [embed] });
            return true;
        }

        // LEADERBOARD
        if (commandName === 'leaderboard' || commandName === 'lvllb') {
            const filtered = Object.entries(levels)
                .filter(([key]) => key.startsWith(message.guild.id))
                .sort((a, b) => b[1].level !== a[1].level ? b[1].level - a[1].level : b[1].xp - a[1].xp)
                .slice(0, 10);

            let desc = '';
            for (let i = 0; i < filtered.length; i++) {
                const userId = filtered[i][0].split('_')[1];
                const user = await message.client.users.fetch(userId).catch(() => null);
                desc += `**#${i + 1}** ${user ? user.username : 'Unknown'} — Level \`${filtered[i][1].level}\` (${filtered[i][1].xp} XP)\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Level Leaderboard')
                .setDescription(desc || 'No data yet.')
                .setColor(0xFFD700);

            await message.channel.send({ embeds: [embed] });
            return true;
        }

        // RESETLEVELS (admin only)
        if (commandName === 'resetlevels') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply({ content: '❌ Administrator permission required.' });
            }

            const target = message.mentions.users.first();

            if (target) {
                const key = `${message.guild.id}_${target.id}`;
                delete levels[key];
                saveLevels(levels);
                await message.reply(`✅ Reset levels for **${target.username}**.`);
            } else {
                // Reset all for this guild
                for (const key of Object.keys(levels)) {
                    if (key.startsWith(message.guild.id)) delete levels[key];
                }
                saveLevels(levels);
                await message.reply('✅ Reset all levels for this server.');
            }
            return true;
        }

        return false;
    }
};
