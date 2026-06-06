/**
 * Nexora Premium Help System (Fixed Architecture Version)
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');

module.exports = {
    name: "help",
    description: "Interactive premium help panel",

    async run(ctx) {

        const client = ctx.client;
        const user = ctx.user || ctx.author;

        // ===============================
        // BASE EMBED
        // ===============================
        const baseEmbed = new EmbedBuilder()
            .setTitle('💎 Zishi Help Menu')
            .setDescription(
            `> Select a category below\n` +
           `> Use \`!help\` to open this panel anytime\n\n` +
           `💡 **Invite Bot:** [Click Here](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot+applications.commands)\n` +
           `🎉 **Support Server:** [Join Here](https://dsc.gg/froststar)\n` +
           `👑 **Owner:** @ItzHuzaifa`
            )
            .setColor(0x1A1C1E)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Zishi | Help Panel' })
            .setTimestamp();

        // ===============================
        // DROPDOWN MENU
        // ===============================
        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('📁 Select a category')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Moderation').setValue('mod').setEmoji('🛡️'),
                new StringSelectMenuOptionBuilder().setLabel('Systems & AutoMod').setValue('sys').setEmoji('🎟️'),
                new StringSelectMenuOptionBuilder().setLabel('Economy').setValue('eco').setEmoji('💰'),
                new StringSelectMenuOptionBuilder().setLabel('Leveling').setValue('lvl').setEmoji('📈'),
                new StringSelectMenuOptionBuilder().setLabel('Giveaways').setValue('give').setEmoji('🎁'),
                new StringSelectMenuOptionBuilder().setLabel('Premium').setValue('prem').setEmoji('👑'),
                new StringSelectMenuOptionBuilder().setLabel('Fun & Games').setValue('fun').setEmoji('🎮'),
                new StringSelectMenuOptionBuilder().setLabel('Info & Links').setValue('info').setEmoji('🔗')
            );

        const row = new ActionRowBuilder().addComponents(menu);

        // For slash interactions, fetchReply is needed to get the message object for the collector.
        // For prefix messages, ctx.reply returns the sent message directly.
        const replyOptions = {
            embeds: [baseEmbed],
            components: [row],
            fetchReply: true
        };

        const msg = await ctx.reply(replyOptions);

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
                        .setDescription('All commands work with `/` slash AND `!` prefix.\n\u200b')
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
                        .setTitle('🎟️ Systems')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'setup-tickets', value: 'Create ticket panel' },
                            { name: 'setup-verification', value: 'Create verify panel' },
                            { name: 'welcomesetup', value: 'Setup welcome messages' },
                            { name: 'automod enable/disable', value: 'Toggle AutoMod' },
                            { name: 'automod status', value: 'View AutoMod config' },
                            { name: 'automod spam/caps/mentions/links', value: 'Configure filters' },
                            { name: 'automod badwords-add/remove', value: 'Manage bad words' },
                            { name: 'automod autoreact-add/remove', value: 'Manage autoreacts' },
                            { name: 'leveling enable/disable', value: 'Toggle XP system' },
                            { name: 'leveling rank', value: 'View your level' },
                            { name: 'leveling leaderboard', value: 'Top levels' }
                        );
                    break;

                case 'eco':
                    embed = new EmbedBuilder()
                        .setTitle('💰 Economy')
                        .setColor(0x1A1C1E)
                        .setDescription('All commands work with `/` slash AND `!` prefix.\n\u200b')
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
                        .setDescription('XP is earned by chatting in **any channel** (10s cooldown). Level-up messages go to the configured announcement channel.\n\u200b')
                        .addFields(
                            { name: '/leveling enable', value: 'Enable XP system', inline: true },
                            { name: '/leveling disable', value: 'Disable XP system', inline: true },
                            { name: '/leveling rank', value: 'View your level & XP', inline: true },
                            { name: '/leveling leaderboard', value: 'Top 10 levels', inline: true },
                            { name: '/leveling channel-set', value: 'Set level-up message channel', inline: true },
                            { name: '/leveling channel-add', value: 'Restrict XP earning to channel', inline: true },
                            { name: '/leveling channel-remove', value: 'Remove XP channel restriction', inline: true },
                            { name: '!rank [@user]', value: 'Prefix: view rank', inline: true },
                            { name: '!leaderboard', value: 'Prefix: level leaderboard', inline: true },
                            { name: '!levelchannel #ch', value: 'Admin: set level-up channel', inline: true },
                            { name: '!resetlevels [@user]', value: 'Admin: reset levels', inline: true }
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

                case 'info':
                    embed = new EmbedBuilder()
                        .setTitle('🔗 Info & Links')
                        .setColor(0x1A1C1E)
                        .setDescription('Quick-access commands for bot info, links, and server stats.\n\u200b')
                        .addFields(
                            { name: '!invite', value: 'Get the bot invite link', inline: true },
                            { name: '!ss / !supportserver', value: 'Join the support server', inline: true },
                            { name: '!owner', value: 'View bot owner info', inline: true },
                            { name: '!mc', value: 'Server member count', inline: true },
                            { name: '!i [@user]', value: 'Invite stats (alias for !invites)', inline: true },
                            { name: '!invites [@user]', value: 'Full invite stats', inline: true },
                            { name: '!inviteleaderboard', value: 'Top invite contributors', inline: true },
                            { name: '!ping', value: 'Bot latency', inline: true },
                            { name: '!status', value: 'Bot uptime & stats', inline: true }
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
