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
           `> Use \`.help <command>\` for details\n\n` +
           `💡 **Invite Bot:** [Click Here](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot+applications.commands)\n` +
           `🎉 **Support Server:** [Join Here](https://discord.gg/ZQnThRAD9f)`
            )
            .setColor(0x1A1C1E)
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
                new StringSelectMenuOptionBuilder().setLabel('Systems').setValue('sys').setEmoji('🎟️'),
                new StringSelectMenuOptionBuilder().setLabel('Economy').setValue('eco').setEmoji('💰'),
                new StringSelectMenuOptionBuilder().setLabel('Giveaways').setValue('give').setEmoji('🎁'),
                new StringSelectMenuOptionBuilder().setLabel('Premium').setValue('prem').setEmoji('👑'),
                new StringSelectMenuOptionBuilder().setLabel('Fun & Games').setValue('fun').setEmoji('🎮')
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
                        .setTitle('🛡️ Moderation')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'purge', value: 'Delete messages' },
                            { name: 'kick', value: 'Kick user' },
                            { name: 'ban', value: 'Ban user' },
                            { name: 'warn', value: 'Warn user' }
                        );
                    break;

                case 'sys':
                    embed = new EmbedBuilder()
                        .setTitle('🎟️ Systems')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'ticket setup', value: 'Create tickets system' },
                            { name: 'welcome setup', value: 'Setup welcome system' }
                        );
                    break;

                case 'eco':
                    embed = new EmbedBuilder()
                        .setTitle('💰 Economy')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'balance', value: 'Check money' },
                            { name: 'daily', value: 'Claim reward' },
                            { name: 'work', value: 'Earn money' }
                        );
                    break;

                case 'give':
                    embed = new EmbedBuilder()
                        .setTitle('🎁 Giveaways')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'gstart', value: 'Start giveaway' },
                            { name: 'greroll', value: 'Reroll winner' }
                        );
                    break;

                case 'prem':
                    embed = new EmbedBuilder()
                        .setTitle('👑 Premium Tools')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'antiraid', value: 'Anti raid system' },
                            { name: 'backup', value: 'Server backup' },
                            { name: 'status', value: 'System status' }
                        );
                    break;

                case 'fun':
                    embed = new EmbedBuilder()
                        .setTitle('🎮 Fun & Games')
                        .setColor(0x1A1C1E)
                        .addFields(
                            { name: 'joke', value: 'Random jokes' },
                            { name: 'iqtest', value: 'IQ test' },
                            { name: 'hug', value: 'Hug someone' }
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
