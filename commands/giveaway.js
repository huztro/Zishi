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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
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

// =========================
// BUTTON INTERACTION HANDLER
// Called from index.js for all button interactions
// =========================
async function handleGiveawayButton(interaction) {

    const { customId } = interaction;

    // ---- JOIN GIVEAWAY ----
    if (customId === 'join_giveaway_pool') {

        const db = getGiveaways();
        const msgId = interaction.message.id;
        const gw = db[msgId];

        if (!gw) {
            return interaction.reply({
                content: '❌ This giveaway no longer exists.',
                ephemeral: true
            });
        }

        if (gw.ended) {
            return interaction.reply({
                content: '❌ This giveaway has already ended.',
                ephemeral: true
            });
        }

        if (gw.participants.includes(interaction.user.id)) {
            return interaction.reply({
                content: '✅ You are already entered in this giveaway!',
                ephemeral: true
            });
        }

        gw.participants.push(interaction.user.id);
        saveGiveaways(db);

        // Update the footer counter on the embed
        try {
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFooter({
                    text: `Entries Counter: ${gw.participants.length} Users Registered`
                });

            await interaction.message.edit({ embeds: [updatedEmbed] });
        } catch {
            // Non-critical — entry was still saved
        }

        return interaction.reply({
            content: `🎟️ You have been entered into the giveaway for **${gw.prize}**! Good luck!`,
            ephemeral: true
        });
    }

    // ---- STAFF APPLICATION ----
    if (customId === 'apply_staff_giveaway') {

        const modal = new ModalBuilder()
            .setCustomId('staff_application_modal')
            .setTitle('Staff Application');

        const q1 = new TextInputBuilder()
            .setCustomId('staff_q1')
            .setLabel('Why do you want to be staff?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(500);

        const q2 = new TextInputBuilder()
            .setCustomId('staff_q2')
            .setLabel('How much time can you dedicate per week?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const q3 = new TextInputBuilder()
            .setCustomId('staff_q3')
            .setLabel('Do you have prior moderation experience?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(500);

        modal.addComponents(
            new ActionRowBuilder().addComponents(q1),
            new ActionRowBuilder().addComponents(q2),
            new ActionRowBuilder().addComponents(q3)
        );

        return interaction.showModal(modal);
    }

    return false; // Not handled by this module
}

// =========================
// MODAL SUBMIT HANDLER
// =========================
async function handleGiveawayModal(interaction) {

    if (interaction.customId !== 'staff_application_modal') return false;

    const why = interaction.fields.getTextInputValue('staff_q1');
    const time = interaction.fields.getTextInputValue('staff_q2');
    const experience = interaction.fields.getTextInputValue('staff_q3');

    const embed = new EmbedBuilder()
        .setTitle('📋 New Staff Application')
        .setColor(0x5865F2)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '👤 Applicant', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: false },
            { name: '❓ Why do you want to be staff?', value: why, inline: false },
            { name: '⏰ Time per week', value: time, inline: false },
            { name: '🛡️ Prior experience', value: experience, inline: false }
        )
        .setTimestamp();

    // Try to find a staff-applications or mod-log channel
    const logChannel = interaction.guild.channels.cache.find(
        c => c.name.includes('staff-application') ||
             c.name.includes('applications') ||
             c.name.includes('mod-log') ||
             c.name.includes('staff')
    );

    if (logChannel) {
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    return interaction.reply({
        content: '✅ Your staff application has been submitted! The moderation team will review it shortly.',
        ephemeral: true
    });
}

module.exports = {

    handleGiveawayButton,
    handleGiveawayModal,

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
        },

        // ======================================
        // STAFF APPLY PANEL
        // ======================================
        {
            data: new SlashCommandBuilder()
                .setName('gstaff')
                .setDescription('Post a staff application panel.')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

            async run(interaction) {

                const embed = new EmbedBuilder()
                    .setTitle('📋 Staff Applications Open')
                    .setDescription(
                        'We are looking for dedicated staff members!\n\n' +
                        'Click the button below to submit your application.\n\n' +
                        '**Requirements:**\n' +
                        '> • Active in the server\n' +
                        '> • Good communication skills\n' +
                        '> • Willing to help members'
                    )
                    .setColor(0x5865F2)
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('apply_staff_giveaway')
                        .setLabel('Apply for Staff')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📋')
                );

                await interaction.reply({
                    content: '✅ Staff application panel posted.',
                    ephemeral: true
                });

                await interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                });
            }
        }
    ]
};
