/**
 * Nexora Premium-Tier Distributed Giveaway Subsystem
 * Storage Framework: Local Flat-File Persistent JSON Database (Zero MongoDB Dependencies)
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Framework Matrix
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../giveaways.json');

// Initialize database container layer on initialization 
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 4));
}

function getGiveaways() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveGiveaways(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
}

// Convert common shorthand strings (e.g., 10m, 2h, 1d) safely into millisecond increments
function parseDuration(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)([mhds])$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case 'm': return value * 60000;
        case 'h': return value * 3600000;
        case 'd': return value * 86400000;
        case 's': return value * 1000;
        default: return null;
    }
}

module.exports = {
    // Export live monitoring hook for index.js reconstruction sequences on startup
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
                        const channel = await client.channels.fetch(gw.channelId).catch(() => null);
                        if (!channel) continue;

                        const msg = await channel.messages.fetch(msgId).catch(() => null);
                        if (!msg) continue;

                        const pool = gw.participants || [];
                        const winners = [];
                        const count = Math.min(pool.length, gw.winnersCount);

                        // Extract unique randomized winner profiles
                        const poolCopy = [...pool];
                        while (winners.length < count && poolCopy.length > 0) {
                            const index = Math.floor(Math.random() * poolCopy.length);
                            winners.push(poolCopy.splice(index, 1)[0]);
                        }

                        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                        const endEmbed = EmbedBuilder.from(msg.embeds[0])
                            .setTitle('🎉 GIVEAWAY STARTED 🎉')
                            .setColor(0x7289DA)
                            .setDescription(`The Giveaway is started!\n\n🎁 **Prize Pool:** \`${gw.prize}\` \n👑 **Winners:** ${winners.length > 0 ? winnerMentions : '*No valid entry footprints recorded.*'}`)
                            .setFields([])
                            .setTimestamp();

                        // Clear interactive click configurations
                        await msg.edit({ embeds: [endEmbed], components: [] });

                        if (winners.length > 0) {
                            await channel.send(`🎉 **Congratulations** ${winnerMentions}! You won the prize drop: **${gw.prize}**!`);
                        } else {
                            await channel.send(`⚠️ **Giveaway Expired:** No valid participants entered the drawing for **${gw.prize}**.`);
                        }
                    } catch (err) {
                        console.error('Giveaway automation error:', err);
                    }
                }
            }
            if (stateChanged) saveGiveaways(db);
        }, 10000);
    },

    commands: [
        // 1. START GIVEAWAY
        {
            name: 'gstart',
            description: 'Launches a timed automated giveaway with click buttons.',
            permissions: [PermissionFlagsBits.ManageMessages],
            options: [
                { name: 'duration', description: 'Format time (e.g., 10m, 2h, 1d)', type: 3, required: true },
                { name: 'winners', description: 'Number of winners to pull', type: 4, required: true },
                { name: 'prize', description: 'The item or role reward package name', type: 3, required: true }
            ],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const durationStr = isSlash ? context.options.getString('duration') : args?.[0];
                const winnersInput = isSlash ? context.options.getInteger('winners') : parseInt(args?.[1]);
                const prizeStr = isSlash ? context.options.getString('prize') : args?.slice(2).join(' ');

                const durationMs = parseDuration(durationStr);
                if (!durationMs) return context.reply('❌ **Invalid Format:** Define duration properly using `10m`, `2h`, or `1d`.');
                if (isNaN(winnersInput) || winnersInput <= 0) return context.reply('❌ **Format Error:** Winners parameter must be a positive integer.');
                if (!prizeStr) return context.reply('❌ **Format Error:** Please specify the reward package prize.');

                const endTimestamp = Date.now() + durationMs;

                const embed = new EmbedBuilder()
                    .setTitle('🎁 ACTIVE PREMIUM GIVEAWAY 🎁')
                    .setDescription(`Click the ticket button layout below to sign up! \n\n🏆 **Prize:** \`${prizeStr}\` \n👑 **Total Winners Selected:** \`${winnersInput}\` \n⏳ **Ending In:** <t:${Math.floor(endTimestamp / 1000)}:R>`)
                    .setColor(0x00FFCC)
                    .setFooter({ text: 'Entries Counter: 0 Users Registered' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('join_giveaway_pool')
                        .setLabel('Join Entry Slot')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎟️')
                );

                const responseMsg = isSlash ? await context.reply({ embeds: [embed], components: [row], fetchReply: true }) : await context.channel.send({ embeds: [embed], components: [row] });
                const msgId = responseMsg.id;

                const db = getGiveaways();
                db[msgId] = {
                    guildId: context.guild.id,
                    channelId: context.channel.id,
                    prize: prizeStr,
                    winnersCount: winnersInput,
                    endTimestamp: endTimestamp,
                    ended: false,
                    participants: []
                };
                saveGiveaways(db);
            }
        },

        // 2. REROLL GIVEAWAY
        {
            name: 'greroll',
            description: 'Redraws a fresh set of winners from a closed giveaway message node.',
            permissions: [PermissionFlagsBits.ManageMessages],
            options: [{ name: 'message_id', description: 'The message ID of the giveaway', type: 3, required: true }],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const targetMsgId = isSlash ? context.options.getString('message_id') : args?.[0];

                if (!targetMsgId) return context.reply('❌ Provide a target giveaway message ID.');

                const db = getGiveaways();
                const gw = db[targetMsgId];

                if (!gw) return context.reply('❌ **Database Mismatch:** No record of that giveaway was found.');
                if (!gw.ended) return context.reply('❌ This target giveaway configuration has not concluded yet.');

                const pool = gw.participants || [];
                if (pool.length === 0) return context.reply('❌ **Reroll Aborted:** No participants signed up for this entry slot.');

                const randomWinner = pool[Math.floor(Math.random() * pool.length)];
                return context.reply(`🎉 **Giveaway Reroll:** The new winner for **${gw.prize}** is <@${randomWinner}>!`);
            }
        }
    ]
};
