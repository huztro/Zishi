/**
 * Zishi — Full Slash Command Based System
 * Discord.js v14
 */

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    REST,
    Routes,
    ChannelType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    SlashCommandBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// =========================
// MODULE IMPORTS
// =========================
const moderationCommandsList = require('./commands/moderation.js');
const applicationCommandsList = require('./commands/applications.js');
const welcomeModule = require('./commands/welcome.js');
const invitesModule = require('./commands/invites.js');
const economyModule = require('./commands/economy.js');
const giveawayModule = require('./commands/giveaway.js');
const funCommandsList = require('./commands/fun.js');
const helpCommand = require('./commands/help.js');

// =========================
// CLIENT
// =========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildBans
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

const commands = new Map();
const slashCommands = [];

const startTime = Date.now();

// =========================
// REGISTER HELPER
// =========================
function register(commandData, callback) {

    commands.set(commandData.name, {
        data: commandData,
        run: callback
    });

    slashCommands.push(commandData.toJSON());
}

// =========================
// HEALTH
// =========================
function getHealthMetrics(client) {

    const totalSeconds = (Date.now() - startTime) / 1000;

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return {
        ping: `${client.ws.ping}ms`,
        uptime: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    };
}

// =========================
// PING
// =========================
register(
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),

    async (interaction) => {

        const msg = await interaction.reply({
            content: 'Pinging...',
            fetchReply: true
        });

        const latency =
            msg.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply(
            `🏓 Pong!\nAPI: \`${interaction.client.ws.ping}ms\`\nLatency: \`${latency}ms\``
        );
    }
);

// =========================
// STATUS
// =========================
register(
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('View bot status'),

    async (interaction) => {

        const health = getHealthMetrics(interaction.client);

        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Status')
            .setColor(0x00FFCC)
            .addFields(
                {
                    name: '📡 Ping',
                    value: `\`${health.ping}\``,
                    inline: true
                },
                {
                    name: '⏳ Uptime',
                    value: `\`${health.uptime}\``,
                    inline: true
                },
                {
                    name: '💾 RAM',
                    value: `\`${health.memory}\``,
                    inline: true
                },
                {
                    name: '🏢 Guilds',
                    value: `\`${health.guilds}\``,
                    inline: true
                },
                {
                    name: '👥 Users',
                    value: `\`${health.users}\``,
                    inline: true
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
);

// =========================
// HELP
// =========================
register(
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Open help menu'),

    async (interaction) => {

        const embed = new EmbedBuilder()
            .setTitle('💎 Zishi Help')
            .setDescription(
                `Select a category below.`
            )
            .setColor(0x1A1C1E);

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Select category')
            .addOptions(
                {
                    label: 'Moderation',
                    value: 'mod',
                    emoji: '🛡️'
                },
                {
                    label: 'Economy',
                    value: 'eco',
                    emoji: '💰'
                },
                {
                    label: 'Fun',
                    value: 'fun',
                    emoji: '🎮'
                }
            );

        const row =
            new ActionRowBuilder().addComponents(menu);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
);

// =========================
// VERIFY SYSTEM
// =========================
register(
    new SlashCommandBuilder()
        .setName('setup-verification')
        .setDescription('Setup verification system')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async (interaction) => {

        const embed = new EmbedBuilder()
            .setTitle('🔒 Verification System')
            .setDescription(
                'Click below to verify yourself.'
            )
            .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('initiate_captcha')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            content: '✅ Verification panel created.',
            ephemeral: true
        });

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
);

// =========================
// TICKET SYSTEM
// =========================
register(
    new SlashCommandBuilder()
        .setName('setup-tickets')
        .setDescription('Setup ticket system')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async (interaction) => {

        const embed = new EmbedBuilder()
            .setTitle('🎫 Support System')
            .setDescription(
                'Click below to create a ticket.'
            )
            .setColor(0x2ECC71);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_channel')
                .setLabel('Open Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
            content: '✅ Ticket panel created.',
            ephemeral: true
        });

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
);


// =========================
// LOAD EXTERNAL COMMAND MODULES
// =========================

const externalModules = [
    moderationCommandsList,
    applicationCommandsList,
    economyModule,
    funCommandsList
];

for (const module of externalModules) {

    if (!module.commands) continue;

    for (const cmd of module.commands) {

        const slash = new SlashCommandBuilder()
            .setName(cmd.name)
            .setDescription(cmd.description || 'No description');

        // OPTIONS
        if (cmd.options) {

            for (const option of cmd.options) {

                if (option.type === 3) {

                    slash.addStringOption(o => {

                        o.setName(option.name)
                         .setDescription(option.description)
                         .setRequired(option.required || false);

                        if (option.choices) {
                            for (const choice of option.choices) {
                                o.addChoices({
                                    name: choice.name,
                                    value: choice.value
                                });
                            }
                        }

                        return o;
                    });
                }

                if (option.type === 4) {

                    slash.addIntegerOption(o =>
                        o.setName(option.name)
                         .setDescription(option.description)
                         .setRequired(option.required || false)
                    );
                }

                if (option.type === 6) {

                    slash.addUserOption(o =>
                        o.setName(option.name)
                         .setDescription(option.description)
                         .setRequired(option.required || false)
                    );
                }
            }
        }

        if (cmd.permissions) {
            slash.setDefaultMemberPermissions(cmd.permissions);
        }

        register(slash, cmd.run);
    }
}

// =========================
// READY
// =========================
client.once('ready', async () => {

    console.log(`🚀 Logged in as ${client.user.tag}`);

    giveawayModule.initializeGiveawayTrackers(client);

    // =========================
    // PRESENCE
    // =========================
    const statuses = [
        'Made By Huztro',
        '/help - For Support',
        'Executing System Diagnostics',
        'Ensuring Uptim Stability'
    ];

    let index = 0;

    setInterval(() => {

        client.user.setPresence({
            activities: [
                {
                    name: statuses[index],
                    type: 3
                }
            ],
            status: 'online'
        });

        index =
            (index + 1) % statuses.length;

    }, 5000);

    // =========================
    // GLOBAL SLASH SYNC
    // =========================
    try {

        const rest =
            new REST({ version: '10' })
                .setToken(process.env.BOT_TOKEN);

        console.log('🔄 Registering slash commands...');

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            {
                body: slashCommands
            }
        );

        console.log('✅ Slash commands registered.');

    } catch (err) {

        console.error(err);
    }
});

// =========================
// INTERACTIONS
// =========================
client.on('interactionCreate', async (interaction) => {

    // =========================
    // SLASH COMMANDS
    // =========================
    if (interaction.isChatInputCommand()) {

        const command =
            commands.get(interaction.commandName);

        if (!command) return;

        try {

            await command.run(interaction);

        } catch (err) {

            console.error(err);

            if (!interaction.replied) {

                await interaction.reply({
                    content: '❌ Command failed.',
                    ephemeral: true
                });
            }
        }
    }

    // =========================
    // BUTTONS
    // =========================
    if (interaction.isButton()) {

        // =========================
        // CREATE TICKET
        // =========================
        if (
            interaction.customId ===
            'create_ticket_channel'
        ) {

            await interaction.deferReply({
                ephemeral: true
            });

            const ticket =
                await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [
                                PermissionFlagsBits.ViewChannel
                            ]
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages
                            ]
                        }
                    ]
                });

            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticket Created')
                .setDescription(
                    'Support will be with you shortly.'
                )
                .setColor(0x3498DB);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            'close_ticket_channel'
                        )
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

            await ticket.send({
                content: `${interaction.user}`,
                embeds: [embed],
                components: [row]
            });

            await interaction.editReply({
                content: `✅ Ticket created: ${ticket}`
            });
        }

        // =========================
        // CLOSE TICKET
        // =========================
        if (
            interaction.customId ===
            'close_ticket_channel'
        ) {

            await interaction.reply({
                content:
                    '🔒 Closing ticket in 5 seconds...'
            });

            setTimeout(() => {
                interaction.channel.delete()
                    .catch(() => {});
            }, 5000);
        }

        // =========================
        // VERIFY BUTTON
        // =========================
        if (
            interaction.customId ===
            'initiate_captcha'
        ) {

            await interaction.reply({
                content:
                    '✅ You are now verified.',
                ephemeral: true
            });
        }
    }
});

// =========================
// LOGIN
// =========================
console.log(
    'TOKEN EXISTS:',
    !!process.env.BOT_TOKEN
);

client.login(process.env.BOT_TOKEN);
