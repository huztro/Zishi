/**
 * Nexora Premium Dropdown Interactive Help Panel Subsystem
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Client Framework
 */

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    PermissionFlagsBits 
} = require('discord.js');

// Helper to build the uniform premium dark-mode embed design matching Capture.PNG
function createBaseHelpEmbed(author) {
    return new EmbedBuilder()
        .setTitle('💎 Zishi Help Menu')
        .setDescription(
            `> Select a category from the dropdown below to explore commands\n` +
            `> Type \`.help <command>\` for details\n\n` +
            `💡 [Invite Bot](https://discord.com/oauth2/authorize?client_id=${author.client.user.id}&permissions=8&scope=bot+applications.commands)\n` +
            `🎉 [Support Server](https://discord.gg/your-support)\n\n` +
            `Thanks for using **Zishi**`
        )
        .setColor(0x1A1C1E) // Premium dark background color
        .setFooter({ text: 'Zishi | Help Panel' })
        .setTimestamp();
}

module.exports = {
    commands: [
        {
            name: 'help',
            description: 'Returns the interactive control panel listing all features.',
            options: [{ name: 'query', description: 'Search specific details for a command', type: 3, required: false }],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const author = isSlash ? context.user : context.author;
                const client = context.client;

                // Handle specific command details lookup query (e.g., .help kick)
                const searchQuery = isSlash ? context.options.getString('query') : args?.[0];
                if (searchQuery) {
                    const targetCommand = client.commands?.get(searchQuery.toLowerCase());
                    if (!targetCommand) {
                        return context.reply({ content: `❌ **Lookup Error:** No command found matching \`${searchQuery}\`.`, ephemeral: true });
                    }

                    const detailEmbed = new EmbedBuilder()
                        .setTitle(`💎 Command Details: .${targetCommand.name}`)
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: '📋 Name', value: `\`${targetCommand.name}\``, inline: true },
                            { name: 'ℹ️ Description', value: `\`${targetCommand.description}\``, inline: false },
                            { name: '🧬 Clearance Permissions Required', value: `\`${targetCommand.permissions ? 'Admin / Staff Only' : 'Everyone'}\``, inline: true }
                        )
                        .setFooter({ text: 'Nexora | Registry Matrix' })
                        .setTimestamp();

                    return isSlash ? context.reply({ embeds: [detailEmbed] }) : context.channel.send({ embeds: [detailEmbed] });
                }

                // Spawns the premium category dropdown component
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('help_category_select')
                    .setPlaceholder('📁 Select a category')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Moderation')
                            .setDescription('Core administrative security & enforcement tools.')
                            .setEmoji('🛡️')
                            .setValue('moderation'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Systems & Utility')
                            .setDescription('Configure captcha gates, welcome loops, and support tickets.')
                            .setEmoji('🎟️')
                            .setValue('systems'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Economy')
                            .setDescription('Check balances, play slots, work, and trade in the marketplace.')
                            .setEmoji('💰')
                            .setValue('economy'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Giveaways')
                            .setDescription('Manage active real-time prize drawings.')
                            .setEmoji('🎁')
                            .setValue('giveaways'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Premium Simulated Tools')
                            .setDescription('Explore simulated enterprise system diagnostics.')
                            .setEmoji('👑')
                            .setValue('premium'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Fun & Games')
                            .setDescription('Play dice games, run IQ tests, view jokes, and more.')
                            .setEmoji('🎮')
                            .setValue('fun')
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);
                const initialEmbed = createBaseHelpEmbed(author);

                const response = isSlash 
                    ? await context.reply({ embeds: [initialEmbed], components: [row], fetchReply: true })
                    : await context.channel.send({ embeds: [initialEmbed], components: [row] });

                // Initialize highly optimized self-contained component collector
                const collector = response.createMessageComponentCollector({
                    filter: (i) => i.user.id === author.id,
                    time: 300000 // 5 Minute active session
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.customId !== 'help_category_select') return;

                    const selection = interaction.values[0];
                    let activeEmbed = createBaseHelpEmbed(author);

                    switch (selection) {
                        case 'moderation':
                            activeEmbed = new EmbedBuilder()
                                .setTitle('🛡️ Moderation Command Registry')
                                .setColor(0x1A1C1E)
                                .addFields(
                                    { name: '`purge <amount>`', value: 'Wipe up to 100 recent chat logs instantly.', inline: true },
                                    { name: '`kick <user> [reason]`', value: 'Evict a toxic user out of the guild.', inline: true },
                                    { name: '`ban <user> [reason]`', value: 'Permanently blacklist a target identity.', inline: true },
                                    { name: '`timeout <user> <minutes>`', value: 'Temporarily isolate a member.', inline: true },
                                    { name: '`warn <user> <reason>`', value: 'Issues an official warning strike.', inline: true },
                                    { name: '`checkwarns <user>`', value: 'Query a target member\'s warn history.', inline: true }
                                )
                                .setFooter({ text: 'Category: Server Moderation' });
                            break;

                        case 'systems':
                            activeEmbed = new EmbedBuilder()
                                .setTitle('🎟️ Systems & Setup Command Registry')
                                .setColor(0x1A1C1E)
                                .addFields(
                                    { name: '`setup-verification`', value: 'Spawns secure server captcha identity gateways.', inline: false },
                                    { name: '`setup-tickets`', value: 'Spawns private administrative support ticket desks.', inline: false },
                                    { name: '`welcomesetup <channel> <message>`', value: 'Initializes dynamic welcoming message loops.', inline: false },
                                    { name: '`welcometest <channel>`', value: 'Triggers a simulated connection test greet.', inline: false }
                                )
                                .setFooter({ text: 'Category: Systems & Utility Setup' });
                            break;

                        case 'economy':
                            activeEmbed = new EmbedBuilder()
                                .setTitle('💰 Economy Command Registry')
                                .setColor(0x1A1C1E)
                                .addFields(
                                    { name: '`balance [user]`', value: 'Inspect cash reserves and bank bank allocation counts.', inline: true },
                                    { name: '`daily`', value: 'Claim your daily allowance payment from the system.', inline: true },
                                    { name: '`work`', value: 'Shift tasks to acquire wallet funds.', inline: true },
                                    { name: '`coinflip <wager> <heads/tails>`', value: 'Gamble on a 50/50 toss.', inline: true },
                                    { name: '`slots <bet>`', value: 'Roll matching machine reels for multipliers.', inline: true },
                                    { name: '`crime` / `rob <user>`', value: 'Bypasses filters to siphon cash assets.', inline: true }
                                )
                                .setFooter({ text: 'Category: Server Economics & Games' });
                            break;

                        case 'giveaways':
                            activeEmbed = new EmbedBuilder()
                                .setTitle('🎁 Giveaway Command Registry')
                                .setColor(0x1A1C1E)
                                .addFields(
                                    { name: '`gstart <time> <winners> <prize>`', value: 'Launches timed interactive draws.', inline: false },
                                    { name: '`greroll <message_id>`', value: 'Redraws a fresh set of winners from a concluded draw.', inline: false }
                                )
                                .setFooter({ text: 'Category: Server Giveaways System' });
                            break;

                        case 'premium':
                            activeEmbed = new EmbedBuilder()
                                .setTitle('👑 Premium Enterprise Tools')
                                .setColor(0x1A1C1E)
                                .addFields(
                                    { name: '`premium-status`', value: 'Validates active system server license diagnostics.', inline: true },
                                    { name: '`premium-antiraid`', value: 'Inspects VPN/Proxy security perimeter scans.', inline: true },
                                    { name: '`premium-backup`', value: 'Saves complete server architectures into snapshot backups.', inline: true },
                                    { name: '`premium-aichat <channel>`', value: 'Links a dynamic neural network chatbot node.', inline: true }
                                )
                                .setFooter({ text: 'Category: Simulated Enterprise Utilities' });
                            break;

                        case 'fun':
                            activeEmbed = new EmbedBuilder()
                                .setTitle('🎮 Fun & Games Command Registry')
                                .setColor(0x1A1C1E)
                                .addFields(
                                    { name: '`iqtest [user]`', value: 'Performs a simulated cognitive brain evaluation.', inline: true },
                                    { name: '`lovecalc <user1> <user2>`', value: 'Calculates structural affinity levels.', inline: true },
                                    { name: '`joke` / `trivia`', value: 'Retrieves code jokes or active trivia questions.', inline: true },
                                    { name: '`hug` / `slap` / `pat`', value: 'Dispatches playful actions with custom cards.', inline: true }
                                )
                                .setFooter({ text: 'Category: Entertainment & Games' });
                            break;
                    }

                    // Preserves footer styling matching Capture.PNG
                    activeEmbed.setTimestamp().setFooter({ text: 'Nexora | Help Panel' });

                    await interaction.update({ embeds: [activeEmbed], components: [row] });
                });

                // Clear components automatically on timeout to prevent visual lag
                collector.on('end', () => {
                    response.edit({ components: [] }).catch(() => {});
                });
            }
        }
    ]
};
