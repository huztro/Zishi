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
const basicCommandsList = require('./commands/basic.js');
const helpCommand = require('./commands/help.js');
const autoModSystem = require('./commands/automod.js');
const autoReactSystem = require('./commands/autoreact.js');
const reactionRolesSystem = require('./commands/reactionroles.js');
const levelingSystem = require('./commands/leveling.js');
const autoresponderSystem = require('./commands/autoresponder.js');
const tsetupCommand = require('./commands/tsetup.js');
const utilityCommandsList = require('./commands/utility.js');
const { handleShortcut } = require('./commands/shortcuts.js');
const { getSettings } = require('./utils/settings.js');
const noPrefixSystem = require('./commands/noprefix.js');

// =========================
// PREFIX CONFIG
// =========================
const DEFAULT_PREFIXES = ['!', '.'];

function getPrefixes(guildId) {
    if (global.prefixes && global.prefixes[guildId]) {
        return global.prefixes[guildId];
    }

    return DEFAULT_PREFIXES;
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
        GatewayIntentBits.GuildInvites,          // Required for invite tracking
        GatewayIntentBits.MessageContent,        // Required for prefix commands
        GatewayIntentBits.GuildMessageReactions  // Required for reaction roles
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

const commands = new Map();
const slashCommands = [];
const registeredCommandNames = new Set(); // tracks names to prevent duplicates

const startTime = Date.now();

// =========================
// REGISTER HELPER
// Deduplicates by command name — only the FIRST registration wins.
// =========================
function register(commandData, callback) {

    const name = commandData.name;

    if (registeredCommandNames.has(name)) {
        console.warn(`[Register] Skipping duplicate command: /${name}`);
        return;
    }

    registeredCommandNames.add(name);

    commands.set(name, {
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
// HELP (unified — same menu for /help and !help)
// =========================
register(
    helpCommand.data,
    helpCommand.execute.bind(helpCommand)
);

// =========================
// INVITE (bot invite link)
// =========================
register(
    new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot invite link'),

    async (interaction) => {
        const clientId = interaction.client.user.id;
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot+applications.commands`;

        const embed = new EmbedBuilder()
            .setTitle('🔗 Invite Zishi')
            .setDescription(
                `Add **Zishi** to your server and unlock powerful moderation, economy, leveling, and more!\n\n` +
                `**[➕ Click Here to Invite](${inviteUrl})**`
            )
            .setColor(0x5865F2)
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Zishi Bot • Made by @ItzHuzaifa' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
);

// =========================
// SUPPORT SERVER
// =========================
register(
    new SlashCommandBuilder()
        .setName('supportserver')
        .setDescription('Get the support server link'),

    async (interaction) => {
        const embed = new EmbedBuilder()
            .setTitle('🌟 Zishi Support Server')
            .setDescription(
                `Need help? Have a suggestion? Join our support server!\n\n` +
                `**[🔗 Join Here](https://dsc.gg/froststar)**\n\n` +
                `> Get help with setup\n` +
                `> Report bugs & suggest features\n` +
                `> Stay updated on new releases`
            )
            .setColor(0x2ECC71)
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Zishi Bot • Support Server' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
);

// =========================
// UPTIME
// =========================
register(
    new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('View how long the bot has been online'),

    async (interaction) => {
        const totalSeconds = (Date.now() - startTime) / 1000;
        const days    = Math.floor(totalSeconds / 86400);
        const hours   = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const parts   = [];
        if (days)    parts.push(`${days}d`);
        if (hours)   parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);

        const embed = new EmbedBuilder()
            .setTitle('⏳ Bot Uptime')
            .setDescription(`**Zishi** has been online for:\n\`\`\`${parts.join(' ')}\`\`\``)
            .setColor(0x00FFCC)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
);

// =========================
// OWNER
// =========================
register(
    new SlashCommandBuilder()
        .setName('owner')
        .setDescription('View bot owner information'),

    async (interaction) => {
        const ownerId = process.env.OWNER_ID;
        let ownerUser = null;
        if (ownerId) {
            ownerUser = await interaction.client.users.fetch(ownerId).catch(() => null);
        }

        const embed = new EmbedBuilder()
            .setTitle('👑 Bot Owner')
            .setDescription(
                `**Zishi** was created and is maintained by **@ItzHuzaifa**.\n\n` +
                `> 🛠️ Developer & Designer\n` +
                `> 💡 Feature Requests: Join the [Support Server](https://dsc.gg/froststar)\n` +
                `> 🐛 Bug Reports: [Support Server](https://dsc.gg/froststar)`
            )
            .setColor(0xFFD700)
            .setTimestamp();

        if (ownerUser) {
            embed
                .setThumbnail(ownerUser.displayAvatarURL({ size: 256 }))
                .addFields({ name: '🔖 Discord Tag', value: `\`${ownerUser.tag}\``, inline: true });
        }

        embed.setFooter({ text: 'Zishi Bot • Made with ❤️' });

        await interaction.reply({ embeds: [embed] });
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
// LOAD EXTERNAL COMMAND MODULES
// (moderation and economy are prefix-only — excluded from slash registration)
// =========================

const externalModules = [
    applicationCommandsList,
    funCommandsList,
    basicCommandsList,      // avatar, serverinfo, userinfo, say, embed + aliases
    utilityCommandsList     // roleall, listroles, membercount, rolemembers, removeall, massban, massunban, memberinfo, roledeleteall, channelinfo
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
// (modules that export { data, execute } or { commands: [{data, run}] })
// All go through register() so deduplication is enforced automatically.
// =========================

// AutoMod slash command
if (autoModSystem.data) {
    register(autoModSystem.data, autoModSystem.execute.bind(autoModSystem));
}

// AutoReact slash command
if (autoReactSystem.data) {
    register(autoReactSystem.data, autoReactSystem.execute.bind(autoReactSystem));
}

// Leveling slash command
if (levelingSystem.data) {
    register(levelingSystem.data, levelingSystem.execute.bind(levelingSystem));
}

// Autoresponder slash command
if (autoresponderSystem.data) {
    register(autoresponderSystem.data, autoresponderSystem.execute.bind(autoresponderSystem));
}

// Reaction Roles slash command (/rr)
if (reactionRolesSystem.data) {
    register(reactionRolesSystem.data, reactionRolesSystem.execute.bind(reactionRolesSystem));
}

// Welcome commands
if (welcomeModule.commands) {
    for (const cmd of welcomeModule.commands) {
        if (cmd.data) {
            register(cmd.data, cmd.run.bind(cmd));
        }
    }
}

// Invite commands
if (invitesModule.commands) {
    for (const cmd of invitesModule.commands) {
        if (cmd.data) {
            register(cmd.data, cmd.run.bind(cmd));
        }
    }
}

// Giveaway commands
if (giveawayModule.commands) {
    for (const cmd of giveawayModule.commands) {
        if (cmd.data) {
            register(cmd.data, cmd.run.bind(cmd));
        }
    }
}

// Ticket setup command
register(tsetupCommand.data, tsetupCommand.run);

// NoPrefix slash command
register(noPrefixSystem.data, noPrefixSystem.execute.bind(noPrefixSystem));

// =========================
// READY
// =========================
client.once('ready', async () => {

    console.log(`🚀 Logged in as ${client.user.tag}`);

    // Expose commands map on client so shortcut handlers can delegate
    client.commands = commands;

    giveawayModule.initializeGiveawayTrackers(client);

    // Start no-prefix expiry timer (checks every minute)
    noPrefixSystem.startExpiryTimer(client);

    // Cache invite snapshots for all guilds (for invite tracking)
    for (const guild of client.guilds.cache.values()) {
        await invitesModule.cacheGuildInvites(guild).catch(() => {});
    }

    // =========================
    // PRESENCE
    // =========================
    const statuses = [
        'Made By @ItzHuzaifa',
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

        console.log(`🔄 Registering ${slashCommands.length} slash commands: ${slashCommands.map(c => c.name).join(', ')}`);

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            {
                body: slashCommands
            }
        );

        console.log(`✅ ${slashCommands.length} slash commands registered successfully.`);

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

            console.error(`[Slash Command Error] /${interaction.commandName}:`, err);

            try {
                const errPayload = { content: '❌ Command failed.', ephemeral: true };
                if (interaction.deferred) {
                    await interaction.editReply(errPayload);
                } else if (!interaction.replied) {
                    await interaction.reply(errPayload);
                }
            } catch {
                // Interaction may have expired — ignore
            }
        }
    }

    // =========================
    // MODALS
    // =========================
    if (interaction.isModalSubmit()) {

        try {
            // Application modal submissions
            const handled = await applicationCommandsList.handleApplicationModal(interaction);
            if (handled) return;
        } catch (err) {
            console.error('[Application Modal Error]', err);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Application submission failed.', ephemeral: true }).catch(() => {});
            }
        }
    }

    // =========================
    // BUTTONS
    // =========================
    if (interaction.isButton()) {

        // =========================
        // MOD DELETE BUTTON
        // Trash emoji button on mod command responses — deletes the message
        // =========================
        if (interaction.customId === 'mod_delete_message') {
            try {
                await interaction.message.delete();
            } catch {
                await interaction.reply({ content: '❌ Could not delete the message.', ephemeral: true }).catch(() => {});
            }
            return;
        }

        // =========================
        // GIVEAWAY BUTTONS
        // =========================
        try {
            const handled = await giveawayModule.handleGiveawayButton(interaction);
            if (handled !== false) return;
        } catch (err) {
            console.error('[Giveaway Button Error]', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Failed to process giveaway action.', ephemeral: true }).catch(() => {});
            }
            return;
        }

        // =========================
        // APPLICATION BUTTONS
        // =========================
        try {
            const handled = await applicationCommandsList.handleApplicationButton(interaction);
            if (handled !== false) return;
        } catch (err) {
            console.error('[Application Button Error]', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Failed to open application.', ephemeral: true }).catch(() => {});
            }
            return;
        }

        // =========================
        // CREATE TICKET (tsetup panel — config-driven)
        // =========================
        if (interaction.customId === 'tsetup_open_ticket') {

            await interaction.deferReply({ ephemeral: true });

            // Load guild-specific ticket config saved by /tsetup or !tsetup
            const settings = getSettings(interaction.guild.id);
            const cfg = settings.ticketSetup || {};
            const ticketTitle       = cfg.title       || '🎫 Ticket Created';
            const ticketDescription = cfg.description || 'Support will be with you shortly.';

            const ticket = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
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
                .setTitle(ticketTitle)
                .setDescription(ticketDescription)
                .setColor(0x3498DB);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket_channel')
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
    // AUTORESPONDER (runs on every message)
    // =========================
    try {
        await autoresponderSystem.handleAutoresponder(message);
    } catch (err) {
        console.error('[Autoresponder Error]', err);
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
            await economyModule.handlePrefix(message, ecoName, ecoArgs);
        }
    } catch (err) {
        console.error('[Economy Channel Error]', err);
    }

    // =========================
    // PREFIX COMMANDS
    // Supports both prefixed messages AND no-prefix users
    // =========================
    const prefixes = getPrefixes(message.guild.id);
    const prefix = prefixes.find(p => message.content.startsWith(p));

    // Check if this user has no-prefix access
    const userHasNoPrefix = noPrefixSystem.hasNoPrefix(message.guild.id, message.author.id);

    // If no prefix found and user doesn't have no-prefix access, stop here
    if (!prefix && !userHasNoPrefix) return;

    let args, commandName;

    if (prefix) {
        // Normal prefixed command
        const parts = message.content.slice(prefix.length).trim().split(/ +/);
        commandName = parts.shift().toLowerCase();
        args = parts;
    } else {
        // No-prefix user — treat the whole message as a command
        const parts = message.content.trim().split(/ +/);
        commandName = parts.shift().toLowerCase();
        args = parts;
    }

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

    // ---- SHORTCUTS (ping, uptime, status, invite, ss, supportserver, owner, i, mc) ----
    try {
        const handled = await handleShortcut(message, commandName, args, client, startTime);
        if (handled) return;
    } catch (err) {
        console.error('[Shortcut Error]', err);
    }

    // ---- SETPREFIX ----
    if (commandName === 'setprefix') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: '❌ Administrator permission required.' });
        }
        const newPrefix = args[0];
        if (!newPrefix) return message.reply({ content: '❌ Usage: `!setprefix <prefix>`' });
        global.prefixes ??= {};
        global.prefixes[message.guild.id] = ['!', '.', newPrefix];
        return message.reply({ content: `✅ Prefix updated to **${newPrefix}**` });
    }

    // ---- NOPREFIX COMMANDS ----
    try {
        const handled = await noPrefixSystem.handlePrefix(message, commandName, args);
        if (handled) return;
    } catch (err) {
        console.error('[NoPrefix Error]', err);
    }

    // ---- GIVEAWAY PREFIX COMMANDS ----
    try {
        const handled = await giveawayModule.handleGiveawayPrefix(message, commandName, args);
        if (handled) return;
    } catch (err) {
        console.error('[Giveaway Prefix Error]', err);
        message.reply({ content: '❌ Giveaway command failed.' }).catch(() => {});
    }

    // ---- ALL COMMANDS (via commands Map + aliases) ----
    try {
        const prefixAliases = {
            // Economy aliases
            balance: 'bal',
            inv: 'inventory',
            lb: 'ecolb',
            leaderboard: 'ecolb',
            // Basic command aliases
            av: 'avatar',
            si: 'serverinfo',
            ui: 'userinfo',
            // Utility aliases
            invites: 'invites',
            membercount: 'membercount'
        };
        const resolvedName = prefixAliases[commandName] || commandName;
        const cmd = commands.get(resolvedName);
        if (cmd) {
            // Permission check for slash-registered commands that declare required permissions
            const cmdDef = [...basicCommandsList, ...utilityCommandsList]
                .find(c => c.name === resolvedName);
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

    // ---- MODERATION COMMANDS (prefix-only) ----
    try {
        const handled = await moderationModule.handlePrefix(message, commandName, args);
        if (handled) return;
    } catch (err) {
        console.error('[Prefix Moderation Error]', err);
        message.reply({ content: '❌ Command failed.' }).catch(() => {});
    }

    // ---- ECONOMY COMMANDS (prefix-only) ----
    try {
        const handled = await economyModule.handlePrefix(message, commandName, args);
        if (handled) return;
    } catch (err) {
        console.error('[Prefix Economy Error]', err);
        message.reply({ content: '❌ Command failed.' }).catch(() => {});
    }

    // ---- TSETUP ----
    if (commandName === 'tsetup') {
        try {
            await tsetupCommand.handlePrefix(message, args);
        } catch (err) {
            console.error('[Prefix tsetup Error]', err);
            message.reply({ content: '❌ tsetup failed.' }).catch(() => {});
        }
        return;
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
// GUILD CREATE (bot joins a new server)
// Cache invites immediately so tracking works from day one
// =========================
client.on('guildCreate', async (guild) => {
    await invitesModule.cacheGuildInvites(guild).catch(() => {});
});

// =========================
// GUILD MEMBER ADD (invite tracking)
// =========================
client.on('guildMemberAdd', async (member) => {

    // Invite tracking
    try {
        await invitesModule.handleMemberJoin(member);
    } catch (err) {
        console.error('[Invite Join Error]', err);
    }

    // Welcome message
    try {
        const { welcomeDatabase } = welcomeModule;
        const config = welcomeDatabase.get(member.guild.id);
        if (config && config.channelId && config.message) {
            const channel = member.guild.channels.cache.get(config.channelId);
            if (channel) {
                const msg = config.message
                    .replace('{user}', member.toString())
                    .replace('{guild}', member.guild.name);
                await channel.send(msg).catch(() => {});
            }
        }
    } catch (err) {
        console.error('[Welcome Error]', err);
    }
});

// =========================
// GUILD MEMBER REMOVE (invite tracking)
// =========================
client.on('guildMemberRemove', async (member) => {
    try {
        await invitesModule.handleMemberLeave(member);
    } catch (err) {
        console.error('[Invite Leave Error]', err);
    }
});

// =========================
// REACTION ADD (Reaction Roles)
// =========================
client.on('messageReactionAdd', async (reaction, user) => {
    try {
        await reactionRolesSystem.handleReactionAdd(reaction, user);
    } catch (err) {
        console.error('[ReactionRoles Add Error]', err);
    }
});

// =========================
// REACTION REMOVE (Reaction Roles)
// =========================
client.on('messageReactionRemove', async (reaction, user) => {
    try {
        await reactionRolesSystem.handleReactionRemove(reaction, user);
    } catch (err) {
        console.error('[ReactionRoles Remove Error]', err);
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
