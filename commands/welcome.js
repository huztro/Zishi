/**
 * Nexora Premium-Tier Welcome Configuration Subsystem
 * Architecture Support: FULL SLASH COMMAND FRAMEWORK
 */

const {
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    SlashCommandBuilder
} = require('discord.js');

// Runtime memory database
const welcomeDatabase = new Map();

module.exports = {

    welcomeDatabase,

    commands: [

        // ==================================================
        // WELCOME SETUP
        // ==================================================
        {
            data: new SlashCommandBuilder()
                .setName('welcomesetup')
                .setDescription(
                    'Setup Welcome Messages For The Server.'
                )
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.Administrator
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription(
                            'The text channel to stream greetings into'
                        )
                        .addChannelTypes(
                            ChannelType.GuildText
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription(
                            'Use {user} and {guild} as variables.'
                        )
                        .setRequired(true)
                ),

            async run(interaction) {

                const guild =
                    interaction.guild;

                const channel =
                    interaction.options.getChannel(
                        'channel'
                    );

                const message =
                    interaction.options.getString(
                        'message'
                    );

                if (
                    !channel ||
                    channel.type !==
                        ChannelType.GuildText
                ) {

                    return interaction.reply({
                        content:
                            '❌ **Setup Error:** The designated logging channel target must be a standard text layout channel.',
                        ephemeral: true
                    });
                }

                if (!message) {

                    return interaction.reply({
                        content:
                            '❌ **Setup Error:** Please provide a custom welcome message payload string.',
                        ephemeral: true
                    });
                }

                welcomeDatabase.set(
                    guild.id,
                    {
                        channelId: channel.id,
                        message: message
                    }
                );

                const embed =
                    new EmbedBuilder()
                        .setTitle(
                            '👋 Welcome Engine Configured'
                        )
                        .setColor(0x2ECC71)
                        .addFields(
                            {
                                name:
                                    '📡 Stream Target Channel',
                                value: `${channel}`,
                                inline: true
                            },
                            {
                                name:
                                    '📄 Active Phrase String',
                                value:
                                    `\`\`\`${message}\`\`\``,
                                inline: false
                            }
                        )
                        .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }
        },

        // ==================================================
        // WELCOME EDIT
        // ==================================================
        {
            data: new SlashCommandBuilder()
                .setName('welcomeedit')
                .setDescription(
                    'Edit Current Welcome Channel Or Message.'
                )
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.Administrator
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription(
                            'The modified target text channel'
                        )
                        .addChannelTypes(
                            ChannelType.GuildText
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription(
                            'The upgraded phrase layout matrix profile string.'
                        )
                        .setRequired(true)
                ),

            async run(interaction) {

                const guild =
                    interaction.guild;

                if (
                    !welcomeDatabase.has(
                        guild.id
                    )
                ) {

                    return interaction.reply({
                        content:
                            '❌ **Operational Fault:** No welcome profile found on this guild. Use `/welcomesetup` first.',
                        ephemeral: true
                    });
                }

                const channel =
                    interaction.options.getChannel(
                        'channel'
                    );

                const message =
                    interaction.options.getString(
                        'message'
                    );

                if (
                    !channel ||
                    channel.type !==
                        ChannelType.GuildText
                ) {

                    return interaction.reply({
                        content:
                            '❌ **Setup Error:** Target must be a standard text channel.',
                        ephemeral: true
                    });
                }

                welcomeDatabase.set(
                    guild.id,
                    {
                        channelId: channel.id,
                        message: message
                    }
                );

                const embed =
                    new EmbedBuilder()
                        .setTitle(
                            '🔄 Welcome Engine Manifest Patched'
                        )
                        .setColor(0x3498DB)
                        .addFields(
                            {
                                name:
                                    '📡 New Target Channel',
                                value: `${channel}`,
                                inline: true
                            },
                            {
                                name:
                                    '📄 Updated Phrase String',
                                value:
                                    `\`\`\`${message}\`\`\``,
                                inline: false
                            }
                        )
                        .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }
        },

        // ==================================================
        // WELCOME TEST
        // ==================================================
        {
            data: new SlashCommandBuilder()
                .setName('welcometest')
                .setDescription(
                    'Test welcome message.'
                )
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.Administrator
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription(
                            'The text channel target layout to evaluate'
                        )
                        .addChannelTypes(
                            ChannelType.GuildText
                        )
                        .setRequired(true)
                ),

            async run(interaction) {

                const channel =
                    interaction.options.getChannel(
                        'channel'
                    );

                const user =
                    interaction.user;

                if (
                    !channel ||
                    channel.type !==
                        ChannelType.GuildText
                ) {

                    return interaction.reply({
                        content:
                            '❌ **Validation Fault:** Simulated testing routes require an active text node.',
                        ephemeral: true
                    });
                }

                const guildConfig =
                    welcomeDatabase.get(
                        interaction.guild.id
                    );

                const phraseString =
                    guildConfig
                        ? guildConfig.message
                        : '👋 Welcome {user} to **{guild}**! We are glad you are here.';

                const localizedMessage =
                    phraseString
                        .replace(
                            /{user}/g,
                            `${user}`
                        )
                        .replace(
                            /{guild}/g,
                            `${interaction.guild.name}`
                        );

                const testEmbed =
                    new EmbedBuilder()
                        .setTitle(
                            'Welcome {user}'
                        )
                        .setDescription(
                            localizedMessage
                        )
                        .setColor(0x9B59B6)
                        .setThumbnail(
                            user.displayAvatarURL({
                                dynamic: true
                            })
                        )
                        .setTimestamp();

                await channel.send({
                    content: `${user}`,
                    embeds: [testEmbed]
                });

                return interaction.reply({
                    content:
                        `✅ **Simulation Complete:** Sent output sequence straight to channel node: ${channel}`,
                    ephemeral: true
                });
            }
        }
    ]
};
