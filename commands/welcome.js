/**
 * Nexora Premium-Tier Welcome Configuration Subsystem
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Client Framework
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// Runtime memory database for welcome configurations (Shared via exports if needed)
const welcomeDatabase = new Map(); 

module.exports = {
    welcomeDatabase, // Export database access so index.js can catch real joins
    commands: [
        // 1. WELCOME SETUP
        {
            name: 'welcomesetup',
            description: 'Setup Welcome Messages For The Server.',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                { name: 'channel', description: 'The text channel to stream greetings into', type: 7, required: true },
                { name: 'message', description: 'Custom text greeting. Use {user} and {guild} as variables.', type: 3, required: true }
            ],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const guild = context.guild;

                let channel, message;
                if (isSlash) {
                    channel = context.options.getChannel('channel');
                    message = context.options.getString('message');
                } else {
                    channel = context.mentions.channels.first();
                    message = args ? args.slice(1).join(' ') : null;
                }

                if (!channel || channel.type !== ChannelType.GuildText) {
                    const replyContent = '❌ **Setup Error:** The designated logging channel target must be a standard text layout channel.';
                    return isSlash ? context.reply({ content: replyContent, ephemeral: true }) : context.reply(replyContent);
                }

                if (!message) {
                    const replyContent = '❌ **Setup Error:** Please provide a custom welcome message payload string.';
                    return isSlash ? context.reply({ content: replyContent, ephemeral: true }) : context.reply(replyContent);
                }

                welcomeDatabase.set(guild.id, { channelId: channel.id, message: message });

                const embed = new EmbedBuilder()
                    .setTitle('👋 Welcome Engine Configured')
                    .setColor(0x2ECC71)
                    .addFields(
                        { name: '📡 Stream Target Channel', value: `${channel}`, inline: true },
                        { name: '📄 Active Phrase String', value: `\`\`\`${message}\`\`\``, inline: false }
                    )
                    .setTimestamp();

                return isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
            }
        },

        // 2. WELCOME EDIT
        {
            name: 'welcomeedit',
            description: 'Edit Current Welcome Channel Or Message.',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                { name: 'channel', description: 'The modified target text channel', type: 7, required: true },
                { name: 'message', description: 'The upgraded phrase layout matrix profile string.', type: 3, required: true }
            ],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const guild = context.guild;

                if (!welcomeDatabase.has(guild.id)) {
                    const replyContent = '❌ **Operational Fault:** No welcome profile found on this guild. Use `.welcomesetup` first.';
                    return isSlash ? context.reply({ content: replyContent, ephemeral: true }) : context.reply(replyContent);
                }

                let channel, message;
                if (isSlash) {
                    channel = context.options.getChannel('channel');
                    message = context.options.getString('message');
                } else {
                    channel = context.mentions.channels.first();
                    message = args ? args.slice(1).join(' ') : null;
                }

                if (!channel || channel.type !== ChannelType.GuildText) {
                    const replyContent = '❌ **Setup Error:** Target must be a standard text channel.';
                    return isSlash ? context.reply({ content: replyContent, ephemeral: true }) : context.reply(replyContent);
                }

                welcomeDatabase.set(guild.id, { channelId: channel.id, message: message });

                const embed = new EmbedBuilder()
                    .setTitle('🔄 Welcome Engine Manifest Patched')
                    .setColor(0x3498DB)
                    .addFields(
                        { name: '📡 New Target Channel', value: `${channel}`, inline: true },
                        { name: '📄 Updated Phrase String', value: `\`\`\`${message}\`\`\``, inline: false }
                    )
                    .setTimestamp();

                return isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
            }
        },

        // 3. WELCOME TEST SIMULATION
        {
            name: 'welcometest',
            description: 'test welcome message.',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                { name: 'channel', description: 'The text channel target layout to evaluate', type: 7, required: true }
            ],
            async run(context) {
                const isSlash = context.isCommand?.();
                const channel = isSlash ? context.options.getChannel('channel') : context.mentions.channels.first();
                const user = isSlash ? context.user : context.author;
                const member = context.member;

                if (!channel || channel.type !== ChannelType.GuildText) {
                    const replyContent = '❌ **Validation Fault:** Simulated testing routes require an active text node.';
                    return isSlash ? context.reply({ content: replyContent, ephemeral: true }) : context.reply(replyContent);
                }

                const guildConfig = welcomeDatabase.get(context.guild.id);
                const phraseString = guildConfig ? guildConfig.message : "👋 Welcome {user} to **{guild}**! We are glad you are here.";

                const localizedMessage = phraseString
                    .replace(/{user}/g, `${user}`)
                    .replace(/{guild}/g, `${context.guild.name}`);

                const testEmbed = new EmbedBuilder()
                    .setTitle('Welcome {user}')
                    .setDescription(localizedMessage)
                    .setColor(0x9B59B6)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await channel.send({ content: `${user}`, embeds: [testEmbed] });
                
                const completeText = `✅ **Simulation Complete:** Sent output sequence straight to channel node: ${channel}`;
                return isSlash ? context.reply({ content: completeText, ephemeral: true }) : context.channel.send(completeText);
            }
        }
    ]
};
