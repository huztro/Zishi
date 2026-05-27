/**
 * Nexora Premium-Tier Distributed Giveaway Subsystem
 * Storage Framework: Local Flat-File Persistent JSON Database
 * Architecture Support: FULL SLASH COMMAND SYSTEM
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(
    __dirname,
    '../giveaways.json'
);

// Initialize DB
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
        DB_PATH,
        JSON.stringify({}, null, 4)
    );
}

function getGiveaways() {
    return JSON.parse(
        fs.readFileSync(DB_PATH, 'utf8')
    );
}

function saveGiveaways(data) {
    fs.writeFileSync(
        DB_PATH,
        JSON.stringify(data, null, 4)
    );
}

// =========================
// PARSE TIME
// =========================
function parseDuration(str) {

    if (!str) return null;

    const match =
        str.match(/^(\d+)([mhds])$/i);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {

        case 'm':
            return value * 60000;

        case 'h':
            return value * 3600000;

        case 'd':
            return value * 86400000;

        case 's':
            return value * 1000;

        default:
            return null;
    }
}

module.exports = {

    // ==========================================
    // GIVEAWAY TRACKER
    // ==========================================
    initializeGiveawayTrackers: (client) => {

        setInterval(async () => {

            const db = getGiveaways();

            const now = Date.now();

            let stateChanged = false;

            for (const [msgId, gw] of Object.entries(db)) {

                if (gw.ended) continue;

                if (now >= gw.endTimestamp) {

                    gw.ended = true;

                    stateChanged = true;

                    try {

                        const channel =
                            await client.channels.fetch(
                                gw.channelId
                            ).catch(() => null);

                        if (!channel) continue;

                        const msg =
                            await channel.messages.fetch(
                                msgId
                            ).catch(() => null);

                        if (!msg) continue;

                        const pool =
                            gw.participants || [];

                        const winners = [];

                        const count = Math.min(
                            pool.length,
                            gw.winnersCount
                        );

                        const poolCopy = [...pool];

                        while (
                            winners.length < count &&
                            poolCopy.length > 0
                        ) {

                            const index =
                                Math.floor(
                                    Math.random() *
                                    poolCopy.length
                                );

                            winners.push(
                                poolCopy.splice(index, 1)[0]
                            );
                        }

                        const winnerMentions =
                            winners
                                .map(id => `<@${id}>`)
                                .join(', ');

                        const endEmbed =
                            EmbedBuilder.from(
                                msg.embeds[0]
                            )
                                .setTitle(
                                    '🎉 GIVEAWAY ENDED 🎉'
                                )
                                .setColor(0x7289DA)
                                .setDescription(
                                    `🎁 **Prize Pool:** \`${gw.prize}\`\n👑 **Winners:** ${
                                        winners.length > 0
                                            ? winnerMentions
                                            : '*No valid entries.*'
                                    }`
                                )
                                .setFields([])
                                .setTimestamp();

                        await msg.edit({
                            embeds: [endEmbed],
                            components: []
                        });

                        if (winners.length > 0) {

                            await channel.send(
                                `🎉 Congratulations ${winnerMentions}! You won **${gw.prize}**!`
                            );

                        } else {

                            await channel.send(
                                `⚠️ Giveaway ended with no valid participants for **${gw.prize}**.`
                            );
                        }

                    } catch (err) {

                        console.error(
                            'Giveaway automation error:',
                            err
                        );
                    }
                }
            }

            if (stateChanged)
                saveGiveaways(db);

        }, 10000);
    },

    // ==========================================
    // COMMANDS
    // ==========================================
    commands: [

        // ======================================
        // START GIVEAWAY
        // ======================================
        {
            data: new SlashCommandBuilder()
                .setName('gstart')
                .setDescription(
                    'Launch a giveaway.'
                )
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ManageMessages
                )
                .addStringOption(option =>
                    option
                        .setName('duration')
                        .setDescription(
                            'Example: 10m, 2h, 1d'
                        )
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('winners')
                        .setDescription(
                            'Number of winners'
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('prize')
                        .setDescription(
                            'Prize name'
                        )
                        .setRequired(true)
                ),

            async run(interaction) {

                const durationStr =
                    interaction.options.getString(
                        'duration'
                    );

                const winnersInput =
                    interaction.options.getInteger(
                        'winners'
                    );

                const prizeStr =
                    interaction.options.getString(
                        'prize'
                    );

                const durationMs =
                    parseDuration(durationStr);

                if (!durationMs) {

                    return interaction.reply({
                        content:
                            '❌ Invalid duration format. Use `10m`, `2h`, or `1d`.',
                        ephemeral: true
                    });
                }

                if (
                    isNaN(winnersInput) ||
                    winnersInput <= 0
                ) {

                    return interaction.reply({
                        content:
                            '❌ Winners must be a positive number.',
                        ephemeral: true
                    });
                }

                const endTimestamp =
                    Date.now() + durationMs;

                const embed = new EmbedBuilder()
                    .setTitle(
                        '🎁 ACTIVE PREMIUM GIVEAWAY 🎁'
                    )
                    .setDescription(
                        `Click the button below to join!\n\n🏆 **Prize:** \`${prizeStr}\`\n👑 **Winners:** \`${winnersInput}\`\n⏳ **Ends:** <t:${Math.floor(
                            endTimestamp / 1000
                        )}:R>`
                    )
                    .setColor(0x00FFCC)
                    .setFooter({
                        text:
                            'Entries Counter: 0 Users Registered'
                    })
                    .setTimestamp();

                const row =
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    'join_giveaway_pool'
                                )
                                .setLabel(
                                    'Join Entry Slot'
                                )
                                .setStyle(
                                    ButtonStyle.Success
                                )
                                .setEmoji('🎟️')
                        );

                const responseMsg =
                    await interaction.reply({
                        embeds: [embed],
                        components: [row],
                        fetchReply: true
                    });

                const msgId =
                    responseMsg.id;

                const db =
                    getGiveaways();

                db[msgId] = {
                    guildId:
                        interaction.guild.id,
                    channelId:
                        interaction.channel.id,
                    prize: prizeStr,
                    winnersCount:
                        winnersInput,
                    endTimestamp,
                    ended: false,
                    participants: []
                };

                saveGiveaways(db);
            }
        },

        // ======================================
        // REROLL
        // ======================================
        {
            data: new SlashCommandBuilder()
                .setName('greroll')
                .setDescription(
                    'Reroll a giveaway.'
                )
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ManageMessages
                )
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription(
                            'Giveaway message ID'
                        )
                        .setRequired(true)
                ),

            async run(interaction) {

                const targetMsgId =
                    interaction.options.getString(
                        'message_id'
                    );

                const db =
                    getGiveaways();

                const gw =
                    db[targetMsgId];

                if (!gw) {

                    return interaction.reply({
                        content:
                            '❌ Giveaway not found.',
                        ephemeral: true
                    });
                }

                if (!gw.ended) {

                    return interaction.reply({
                        content:
                            '❌ Giveaway has not ended yet.',
                        ephemeral: true
                    });
                }

                const pool =
                    gw.participants || [];

                if (pool.length === 0) {

                    return interaction.reply({
                        content:
                            '❌ No participants found.',
                        ephemeral: true
                    });
                }

                const randomWinner =
                    pool[
                        Math.floor(
                            Math.random() *
                            pool.length
                        )
                    ];

                return interaction.reply(
                    `🎉 New winner for **${gw.prize}** is <@${randomWinner}>!`
                );
            }
        }
    ]
};
