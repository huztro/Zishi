/**
 * Zishi — Help System
 * Unified handler for BOTH !help (prefix) and /help (slash).
 * Both use the exact same embed and dropdown menu.
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    SlashCommandBuilder
} = require('discord.js');

const SUPPORT_SERVER = 'https://dsc.gg/froststar';

module.exports = {
    name: "help",
    description: "Interactive help panel",

    // Slash command definition — registered in index.js
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Open the interactive help menu'),

    // execute() is called by the slash command handler in index.js
    async execute(interaction) {
        return module.exports.run(interaction);
    },

    async run(ctx) {

        const isSlash = typeof ctx.isChatInputCommand === 'function' && ctx.isChatInputCommand();
        const client  = ctx.client;
        const user    = isSlash ? ctx.user : ctx.author;

        // ===============================
        // BASE EMBED
        // ===============================
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot+applications.commands`;

        const baseEmbed = new EmbedBuilder()
            .setTitle('💎 Zishi Help Menu')
            .setDescription(
                `> Select a category below to explore commands\n` +
                `> All commands work with \`/\` slash **and** \`!\` prefix\n\n` +
                `💡 **Invite Bot:** [Click Here](${inviteUrl})\n` +
                `🎉 **Support Server:** [Join Here](${SUPPORT_SERVER})`
            )
            .setColor(0x1A1C1E)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Zishi | Help Panel • Use the dropdown to navigate' })
            .setTimestamp();

        // ===============================
        // DROPDOWN MENU
        // ===============================
        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('📁 Select a category')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Moderation').setValue('mod').setEmoji('🛡️').setDescription('30+ mod commands'),
                new StringSelectMenuOptionBuilder().setLabel('Systems & AutoMod').setValue('sys').setEmoji('🎟️').setDescription('Tickets, verification, AutoMod'),
                new StringSelectMenuOptionBuilder().setLabel('Economy').setValue('eco').setEmoji('💰').setDescription('Balance, daily, shop & more'),
                new StringSelectMenuOptionBuilder().setLabel('Leveling').setValue('lvl').setEmoji('📈').setDescription('XP, rank, leaderboard'),
                new StringSelectMenuOptionBuilder().setLabel('Giveaways').setValue('give').setEmoji('🎁').setDescription('Start & manage giveaways'),
                new StringSelectMenuOptionBuilder().setLabel('Utility').setValue('util').setEmoji('🔧').setDescription('Invite, ping, uptime & more'),
                new StringSelectMenuOptionBuilder().setLabel('Fun & Games').setValue('fun').setEmoji('🎮').setDescription('RPS, dice, 8ball & more'),
                new StringSelectMenuOptionBuilder().setLabel('Premium').setValue('prem').setEmoji('👑').setDescription('Premium-only features')
            );

        const row = new ActionRowBuilder().addComponents(menu);

        const msg = await ctx.reply({
            embeds: [baseEmbed],
            components: [row],
            fetchReply: true
        });

        // ===============================
        // COLLECTOR
        // ===============================
        const collector = msg.createMessageComponentCollector({
            time: 300000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) return;

            let embed;

            switch (i.values[0]) {

                case 'mod':
                    embed = new EmbedBuilder()
                        .setTitle('🛡️ Moderation (30+ Commands)')
                        .setColor(0x1A1C1E)
                        .setDescription('All commands use the `!` prefix.\n\u200b')
                        .addFields(
                            { name: '👢 kick', value: 'Kick a member', inline: true },
                            { name: '🔨 ban', value: 'Permanently ban', inline: true },
                            { name: '⏱️ tempban', value: 'Temp ban (minutes)', inline: true },
                            { name: '🧹 softban', value: 'Ban + unban (clears msgs)', inline: true },
                            { name: '🔓 unban', value: 'Unban by user ID', inline: true },
                            { name: '🔇 mute', value: 'Mute (Muted role)', inline: true },
                            { name: '🔊 unmute', value: 'Remove mute', inline: true },
                            { name: '⏳ timeout', value: 'Timeout (minutes)', inline: true },
                            { name: '✅ untimeout', value: 'Remove timeout', inline: true },
                            { name: '⚠️ warn', value: 'Issue a warning', inline: true },
                            { name: '🗑️ warnremove', value: 'Remove warning by #', inline: true },
                            { name: '📋 checkwarns', value: 'View warnings', inline: true },
                            { name: '🧹 clearwarns', value: 'Clear all warnings', inline: true },
                            { name: '💥 purge', value: 'Bulk delete messages', inline: true },
                            { name: '☢️ nuke', value: 'Clone & wipe channel', inline: true },
                            { name: '🔒 lock', value: 'Lock channel', inline: true },
                            { name: '🔓 unlock', value: 'Unlock channel', inline: true },
                            { name: '🌐 lockdown', value: 'Lock ALL channels', inline: true },
                            { name: '🌐 unlockdown', value: 'Unlock ALL channels', inline: true },
                            { name: '🐢 slowmode', value: 'Set slowmode (0=off)', inline: true },
                            { name: '➕ roleadd', value: 'Add role to member', inline: true },
                            { name: '➖ roleremove', value: 'Remove role', inline: true },
                            { name: '🎭 rolecreate', value: 'Create a role', inline: true },
                            { name: '🗑️ roledelete', value: 'Delete a role', inline: true },
                            { name: '📝 nick', value: 'Change nickname', inline: true },
                            { name: '📢 channelcreate', value: 'Create text channel', inline: true },
                            { name: '🗑️ channeldelete', value: 'Delete a channel', inline: true },
                            { name: '🔇 deafen', value: 'Server-deafen in voice', inline: true },
                            { name: '🔊 undeafen', value: 'Remove deafen', inline: true },
                            { name: '👢 voicekick', value: 'Disconnect from voice', inline: true },
                            { name: '🔍 whois', value: 'Member info', inline: true },
                            { name: '🏢 serverinfo', value: 'Server info', inline: true },
                            { name: '🧹 clearinfractions', value: 'Wipe all server warns', inline: true }
                        );
                    break;

                case 'sys':
                    embed = new EmbedBuilder()
                        .setTitle('🎟️ Systems & AutoMod')
                        .setColor(0x1A1C1E)
                        .setDescription('Setup and configuration commands.\n\u200b')
                        .addFields(
                            { name: '/tsetup', value: 'Create ticket panel', inline: true },
                            { name: '/setup-verification', value: 'Create verify panel', inline: true },
                            { name: '/welcomesetup', value: 'Setup welcome messages', inline: true },
                            { name: '/automod enable/disable', value: 'Toggle AutoMod', inline: true },
                            { name: '/automod status', value: 'View AutoMod config', inline: true },
                            { name: '/automod spam/caps/mentions/links', value: 'Configure filters', inline: true },
                            { name: '/automod badwords-add/remove', value: 'Manage bad words', inline: true },
                            { name: '/automod logchannel', value: 'Set AutoMod log channel', inline: true },
                            { name: '/leveling enable/disable', value: 'Toggle XP system', inline: true },
                            { name: '/leveling setup-channel', value: 'Set level-up message channel', inline: true },
                            { name: '/leveling channel-add/remove', value: 'Restrict XP to channels', inline: true }
                        );
                    break;

                case 'eco':
                    embed = new EmbedBuilder()
                        .setTitle('💰 Economy')
                        .setColor(0x1A1C1E)
                        .setDescription('All commands use the `!` prefix.\n\u200b')
                        .addFields(
                            { name: '💰 bal', value: 'Check balance', inline: true },
                            { name: '📆 daily', value: 'Claim daily ($1,000)', inline: true },
                            { name: '⚙️ work', value: 'Work for money (1h cd)', inline: true },
                            { name: '🏦 deposit', value: 'Deposit to bank', inline: true },
                            { name: '💵 withdraw', value: 'Withdraw from bank', inline: true },
                            { name: '💸 transfer', value: 'Send money to user', inline: true },
                            { name: '🦹 rob', value: 'Rob another user (30m cd)', inline: true },
                            { name: '🎲 gamble', value: 'Gamble your money', inline: true },
                            { name: '🛒 shop', value: 'View item shop', inline: true },
                            { name: '🛍️ buy', value: 'Buy an item', inline: true },
                            { name: '💸 sell', value: 'Sell an item (50%)', inline: true },
                            { name: '🎒 inventory', value: 'View your items', inline: true },
                            { name: '🏆 ecolb', value: 'Economy leaderboard', inline: true }
                        );
                    break;

                case 'lvl':
                    embed = new EmbedBuilder()
                        .setTitle('📈 Leveling System')
                        .setColor(0x1A1C1E)
                        .setDescription('XP is earned by chatting in **any channel** (10s cooldown). Level-up messages go to the configured setup channel.\n\u200b')
                        .addFields(
                            { name: '/leveling enable', value: 'Enable XP system', inline: true },
                            { name: '/leveling disable', value: 'Disable XP system', inline: true },
                            { name: '/leveling setup-channel', value: 'Set level-up message channel', inline: true },
                            { name: '/leveling rank', value: 'View your level & XP', inline: true },
                            { name: '/leveling leaderboard', value: 'Top 10 levels', inline: true },
                            { name: '/leveling channel-add', value: 'Restrict XP gain to channel', inline: true },
                            { name: '/leveling channel-remove', value: 'Remove XP channel restriction', inline: true },
                            { name: '!rank [@user]', value: 'Prefix: view rank', inline: true },
                            { name: '!leaderboard', value: 'Prefix: level leaderboard', inline: true },
                            { name: '!resetlevels [@user]', value: 'Admin: reset levels', inline: true }
                        );
                    break;

                case 'util':
                    embed = new EmbedBuilder()
                        .setTitle('🔧 Utility Commands')
                        .setColor(0x1A1C1E)
                        .setDescription('Quick-access utility commands.\n\u200b')
                        .addFields(
                            { name: '!ping', value: 'Bot latency', inline: true },
                            { name: '!uptime', value: 'How long bot has been online', inline: true },
                            { name: '!status', value: 'Full bot status (ping, RAM, guilds)', inline: true },
                            { name: '!invite', value: 'Get bot invite link', inline: true },
                            { name: '!ss / !supportserver', value: 'Support server link', inline: true },
                            { name: '!owner', value: 'Bot owner info', inline: true },
                            { name: '!i', value: 'Alias for !invites', inline: true },
                            { name: '!mc', value: 'Alias for !membercount', inline: true },
                            { name: '!avatar [@user]', value: 'View avatar', inline: true },
                            { name: '!serverinfo', value: 'Server statistics', inline: true },
                            { name: '!userinfo [@user]', value: 'User profile info', inline: true },
                            { name: '!membercount', value: 'Total member count', inline: true }
                        );
                    break;

                case 'give':
                    embed = new EmbedBuilder()
                        .setTitle('🎁 Giveaways')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'gstart', value: 'Start a giveaway' },
                            { name: 'greroll', value: 'Reroll a winner' }
                        );
                    break;

                case 'prem':
                    embed = new EmbedBuilder()
                        .setTitle('👑 Premium Tools')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'premium-aichat', value: 'AI chatbot setup' },
                            { name: 'premium-backup', value: 'Server backup' },
                            { name: 'status', value: 'System status' }
                        );
                    break;

                case 'fun':
                    embed = new EmbedBuilder()
                        .setTitle('🎮 Fun & Games')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'rps', value: 'Rock Paper Scissors' },
                            { name: 'dice', value: 'Roll dice' },
                            { name: 'coin', value: 'Flip a coin' },
                            { name: '8ball', value: 'Ask the magic 8 ball' }
                        );
                    break;
            }

            embed.setFooter({ text: 'Zishi Help System' }).setTimestamp();

            await i.update({
                embeds: [embed],
                components: [row]
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
