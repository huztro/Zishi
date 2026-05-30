/**
 * Zishi — Full Featured Discord Bot
 * Discord.js v14
 * Supports BOTH Slash Commands (/) AND Prefix Commands (!)
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
const moderationModule = require('./commands/moderation.js');
const applicationCommandsList = require('./commands/applications.js');
const welcomeModule = require('./commands/welcome.js');
const invitesModule = require('./commands/invites.js');
const economyModule = require('./commands/economy.js');
const giveawayModule = require('./commands/giveaway.js');
const funCommandsList = require('./commands/fun.js');
const helpCommand = require('./commands/help.js');
const autoModSystem = require('./commands/automod.js');
const autoReactSystem = require('./commands/autoreact.js');
const levelingSystem = require('./commands/leveling.js');

// =========================
// PREFIX CONFIG
// =========================
const DEFAULT_PREFIX = '!';

function getPrefix(guildId) {
    if (global.prefixes && global.prefixes[guildId]) {
        return global.prefixes[guildId];
    }
    return DEFAULT_PREFIX;
}

// =========================
// CLIENT
// =========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.MessageContent   // Required for prefix commands
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
    moderationModule,       // plain array of commands
    applicationCommandsList,
    economyModule,          // plain array of commands
    funCommandsList
];

for (const mod of externalModules) {

    // Support both array exports and { commands: [...] } exports
    const cmdList = Array.isArray(mod) ? mod : (mod.commands || []);

    for (const cmd of cmdList) {

        // Some modules (fun, applications) export SlashCommandBuilder directly
        if (cmd.data && typeof cmd.data.toJSON === 'function') {
            register(cmd.data, cmd.run || cmd.execute);
            continue;
        }

        const slash = new SlashCommandBuilder()
            .setName(cmd.name)
            .setDescription(cmd.description || 'No description');

        // OPTIONS
        if (cmd.options) {

            for (const option of cmd.options) {

                // STRING (type 3)
                if (option.type === 3) {
                    slash.addStringOption(o => {
                        o.setName(option.name)
                         .setDescription(option.description || 'No description')
                         .setRequired(option.required || false);
                        if (option.choices) {
                            for (const choice of option.choices) {
                                o.addChoices({ name: choice.name, value: choice.value });
                            }
                        }
                        return o;
                    });
                }

                // INTEGER (type 4)
                if (option.type === 4) {
                    slash.addIntegerOption(o =>
                        o.setName(option.name)
                         .setDescription(option.description || 'No description')
                         .setRequired(option.required || false)
                    );
                }

                // USER (type 6)
                if (option.type === 6) {
                    slash.addUserOption(o =>
                        o.setName(option.name)
                         .setDescription(option.description || 'No description')
                         .setRequired(option.required || false)
                    );
                }

                // CHANNEL (type 7)
                if (option.type === 7) {
                    slash.addChannelOption(o =>
                        o.setName(option.name)
                         .setDescription(option.description || 'No description')
                         .setRequired(option.required || false)
                    );
                }

                // ROLE (type 8)
                if (option.type === 8) {
                    slash.addRoleOption(o =>
                        o.setName(option.name)
                         .setDescription(option.description || 'No description')
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
// REGISTER SPECIAL SLASH COMMANDS
// (modules that export { data, execute } directly)
// =========================

// AutoMod slash command
if (autoModSystem.data) {
    commands.set(autoModSystem.data.name, {
        data: autoModSystem.data,
        run: autoModSystem.execute.bind(autoModSystem)
    });
    slashCommands.push(autoModSystem.data.toJSON());
}

// AutoReact slash command
if (autoReactSystem.data) {
    commands.set(autoReactSystem.data.name, {
        data: autoReactSystem.data,
        run: autoReactSystem.execute.bind(autoReactSystem)
    });
    slashCommands.push(autoReactSystem.data.toJSON());
}

// Leveling slash command
if (levelingSystem.data) {
    commands.set(levelingSystem.data.name, {
        data: levelingSystem.data,
        run: levelingSystem.execute.bind(levelingSystem)
    });
    slashCommands.push(levelingSystem.data.toJSON());
}

// Welcome commands
if (welcomeModule.commands) {
    for (const cmd of welcomeModule.commands) {
        if (cmd.data) {
            commands.set(cmd.data.name, {
                data: cmd.data,
                run: cmd.run.bind(cmd)
            });
            slashCommands.push(cmd.data.toJSON());
        }
    }
}

// Invite commands
if (invitesModule.commands) {
    for (const cmd of invitesModule.commands) {
        if (cmd.data) {
            commands.set(cmd.data.name, {
                data: cmd.data,
                run: cmd.run.bind(cmd)
            });
            slashCommands.push(cmd.data.toJSON());
        }
    }
}

// Giveaway commands
if (giveawayModule.commands) {
    for (const cmd of giveawayModule.commands) {
        if (cmd.data) {
            commands.set(cmd.data.name, {
                data: cmd.data,
                run: cmd.run.bind(cmd)
            });
            slashCommands.push(cmd.data.toJSON());
        }
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
        'Ensuring Uptime Stability'
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
// MESSAGE CREATE (Prefix + AutoMod + Leveling)
// =========================
client.on('messageCreate', async (message) => {

    if (!message.guild) return;
    if (message.author.bot) return;

    // =========================
    // AUTOMOD (runs on every message, owner bypasses)
    // =========================
    try {
        await autoModSystem.handleAutoMod(message, process.env.OWNER_ID);
    } catch (err) {
        console.error('[AutoMod Error]', err);
    }

    // =========================
    // AUTOREACT (runs on every message, independent of AutoMod)
    // =========================
    try {
        await autoReactSystem.handleAutoReact(message);
    } catch (err) {
        console.error('[AutoReact Error]', err);
    }

    // =========================
    // LEVELING XP (runs on every message)
    // =========================
    try {
        await levelingSystem.handleMessage(message);
    } catch (err) {
        console.error('[Leveling Error]', err);
    }

    // =========================
    // ECONOMY CHANNEL (no-prefix channel)
    // =========================
    try {
        const ECONOMY_CHANNEL_ID = '1509293693687828583';
        if (ECONOMY_CHANNEL_ID && message.channel.id === ECONOMY_CHANNEL_ID) {
            const ecoArgs = message.content.trim().split(/ +/);
            const ecoCmd = ecoArgs.shift().toLowerCase();
            const ecoAliases = {
                balance: 'bal', inv: 'inventory',
                lb: 'ecolb', leaderboard: 'ecolb'
            };
            const ecoName = ecoAliases[ecoCmd] || ecoCmd;
            const ecoCommand = commands.get(ecoName);
            if (ecoCommand) {
                await ecoCommand.run(message, ecoArgs);
            }
        }
    } catch (err) {
        console.error('[Economy Channel Error]', err);
    }

    // =========================
    // PREFIX COMMANDS
    // =========================
    const prefix = getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!commandName) return;

    // ---- HELP ----
    if (commandName === 'help') {
        try {
            await helpCommand.run(message);
        } catch (err) {
            console.error('[Prefix Help Error]', err);
        }
        return;
    }

    // ---- PING ----
    if (commandName === 'ping') {
        const sent = await message.channel.send('🏓 Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong!\nAPI: \`${client.ws.ping}ms\`\nLatency: \`${latency}ms\``);
        return;
    }

    // ---- STATUS ----
    if (commandName === 'status') {
        const health = getHealthMetrics(client);
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Status')
            .setColor(0x00FFCC)
            .addFields(
                { name: '📡 Ping', value: `\`${health.ping}\``, inline: true },
                { name: '⏳ Uptime', value: `\`${health.uptime}\``, inline: true },
                { name: '💾 RAM', value: `\`${health.memory}\``, inline: true },
                { name: '🏢 Guilds', value: `\`${health.guilds}\``, inline: true },
                { name: '👥 Users', value: `\`${health.users}\``, inline: true }
            )
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
        return;
    }

    // ---- SETPREFIX ----
    if (commandName === 'setprefix') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: '❌ Administrator permission required.' });
        }
        const newPrefix = args[0];
        if (!newPrefix) return message.reply({ content: '❌ Usage: `!setprefix <prefix>`' });
        global.prefixes ??= {};
        global.prefixes[message.guild.id] = newPrefix;
        return message.reply({ content: `✅ Prefix updated to **${newPrefix}**` });
    }

    // ---- MODERATION + ECONOMY COMMANDS (via commands Map) ----
    try {
        const ecoAliases = { balance: 'bal', inv: 'inventory', lb: 'ecolb', leaderboard: 'ecolb' };
        const resolvedName = ecoAliases[commandName] || commandName;
        const cmd = commands.get(resolvedName);
        if (cmd) {
            // Permission check for commands that declare required permissions
            const cmdDef = [...moderationModule, ...economyModule].find(c => c.name === resolvedName);
            if (cmdDef?.permissions && !message.member.permissions.has(cmdDef.permissions)) {
                return message.reply({ content: '❌ You lack the required permissions.' });
            }
            await cmd.run(message, args);
            return;
        }
    } catch (err) {
        console.error('[Prefix Command Error]', err);
        message.reply({ content: '❌ Command failed.' }).catch(() => {});
    }

    // ---- LEVELING COMMANDS ----
    try {
        const handled = await levelingSystem.handlePrefix(message, commandName, args);
        if (handled) return;
    } catch (err) {
        console.error('[Prefix Leveling Error]', err);
    }

    // ---- AUTOMOD CONFIG ----
    try {
        const handled = await autoModSystem.handlePrefix(message, commandName, args);
        if (handled) return;
    } catch (err) {
        console.error('[Prefix AutoMod Error]', err);
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
