const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const SETTINGS_DB =
path.join(__dirname, '../data/guildSettings.json');

const LEVEL_DB =
path.join(__dirname, '../data/levels.json');

if (!fs.existsSync(SETTINGS_DB)) {
    fs.writeFileSync(
        SETTINGS_DB,
        JSON.stringify({}, null, 4)
    );
}

if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(
        LEVEL_DB,
        JSON.stringify({}, null, 4)
    );
}

// ==========================================
// SETTINGS FUNCTIONS
// ==========================================

function getSettings(guildId) {

    const data =
        JSON.parse(
            fs.readFileSync(SETTINGS_DB, 'utf8')
        );

    if (!data[guildId]) {

        data[guildId] = {
            leveling: {
                enabled: false,
                channels: [],
                multiplier: 1
            }
        };

        fs.writeFileSync(
            SETTINGS_DB,
            JSON.stringify(data, null, 4)
        );
    }

    return data[guildId];
}

function saveSettings(guildId, settings) {

    const data =
        JSON.parse(
            fs.readFileSync(SETTINGS_DB, 'utf8')
        );

    data[guildId] = settings;

    fs.writeFileSync(
        SETTINGS_DB,
        JSON.stringify(data, null, 4)
    );
}

// ==========================================
// LEVEL FUNCTIONS
// ==========================================

function getLevels() {

    return JSON.parse(
        fs.readFileSync(LEVEL_DB, 'utf8')
    );
}

function saveLevels(data) {

    fs.writeFileSync(
        LEVEL_DB,
        JSON.stringify(data, null, 4)
    );
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
        // CHANNEL ADD
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('channel-add')
                .setDescription('Add leveling channel')

                .addChannelOption(opt =>
                    opt
                        .setName('channel')
                        .setDescription('Channel')
                        .setRequired(true)
                )
        )

        // =========================
        // CHANNEL REMOVE
        // =========================

        .addSubcommand(sub =>
            sub
                .setName('channel-remove')
                .setDescription('Remove leveling channel')

                .addChannelOption(opt =>
                    opt
                        .setName('channel')
                        .setDescription('Channel')
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
        // CHANNEL FILTER
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
                        `${message.author} reached level **${profile.level}**`
                    )

                    .setColor(0x2ECC71);

            message.channel.send({
                embeds: [embed]
            });
        }

        saveLevels(levels);
    }
};
