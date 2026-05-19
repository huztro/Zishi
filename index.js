/**
 * All-In-One Unified Hybrid Modular Security & Utility Engine
 * Framework Architecture: Discord.js v14 Master Stack
 * Supports Parallel Pipeline: Traditional Text Prefix (!) + Global Application Slash Commands (/)
 */

const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    REST, 
    Routes, 
    ChannelType 
} = require('discord.js');
require('dotenv').config();

// 📑 Import all separate module layers
const moderationCommandsList = require('./commands/moderation.js');
const applicationCommandsList = require('./commands/applications.js');
const welcomeModule = require('./commands/welcome.js'); 
const economyModule = require('./commands/economy.js');
const giveawayModule = require('./commands/giveaway.js');

// Initialize client with critical gateway scopes
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = '.';
const startTime = Date.now();

// List of blacklisted terminology for the built-in global AutoMod safety engine
const BANNED_WORDS = ['discord.gg/', 'nitro', 'scam', 'free-giftcard', 'hack-tool'];

// ==========================================
// CENTRAL COMMAND REGISTRY MATRIX
// ==========================================
const commands = new Map();

// Helper to define and attach command configurations uniformly
function register(name, description, permissions, options, callback) {
    commands.set(name, { name, description, permissions, options: options || [], run: callback, isNative: true });
}

/**
 * GENERATE RADAR HEALTH STATUS COMPUTE LAYER
 */
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

// ==========================================
// LOAD CORE SYSTEMS & 30 MODERATION COMMANDS
// ==========================================

// 1. Core Diagnostics Ping Command
register('ping', 'Check connection latency.', null, [], async (ctx) => {
    const msg = await ctx.reply({ content: 'Calculating pipeline ping...', fetchReply: true });
    const latency = msg.createdTimestamp - ctx.createdTimestamp;
    await ctx.editReply(`🏓 **Pong!** WebSocket Latency: \`${ctx.client.ws.ping}ms\` | Gateway Execution Trip: \`${latency}ms\``);
});

// 2. Comprehensive Status Command
register('status', 'Displays total architectural system statistics and performance metrics.', null, [], async (ctx) => {
    const health = getHealthMetrics(ctx.client);
    const embed = new EmbedBuilder()
        .setTitle('🤖 Bot Status')
        .setColor(0x00FFCC)
        .addFields(
            { name: '📡 Network Gateway Ping', value: `\`${health.ping}\``, inline: true },
            { name: '⏳ Global System Uptime', value: `\`${health.uptime}\``, inline: true },
            { name: '💾 Active RAM Footprint', value: `\`${health.memory}\``, inline: true },
            { name: '🏢 Connected Guild Instances', value: `\`${health.guilds}\``, inline: true },
            { name: '👥 Cached Identity Records', value: `\`${health.users}\``, inline: true },
            { name: '🟢 Current Bot Status', value: `\`Online / Active\``, inline: true }
        )
        .setTimestamp();
    await ctx.reply({ embeds: [embed] });
});

// 3. Central Interactive Graphical Help Dashboard
register('help', 'Returns a compiled interface catalog of operational features.', null, [], async (ctx) => {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Help Menu')
        .setDescription(`An Multipurpose Discord Bot | Prefix **.**.`)
        .setColor(0x3498DB);
    await ctx.reply({ embeds: [embed] });
});

// 4. Setup Secure Captcha Gateway
register('setup-verification', 'Spawns secure server verification interface.', [PermissionFlagsBits.Administrator], [], async (ctx) => {
    const embed = new EmbedBuilder()
        .setTitle('🔒 Verification System')
        .setDescription(`✅ Click the button below to verify yourself and unlock:\n\n• 💬 Chat Access\n• 🎉 Full Server Features\n• 👥 Member Permissions\n• 🚀 Exclusive Channels\n\n⚠️ Verification is required to continue.`)
        .setColor(0xE74C3C);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('initiate_captcha').setLabel('Verify Identity').setStyle(ButtonStyle.Danger).setEmoji('🛡️')
    );
    await ctx.reply({ content: 'Verification entry point deployed successfully.', ephemeral: true });
    await ctx.channel.send({ embeds: [embed], components: [row] });
});

// 5. Setup Ticketing Subsystem
register('setup-tickets', 'Spawns transactional customer support ticket system routing panels.', [PermissionFlagsBits.Administrator], [], async (ctx) => {
    const embed = new EmbedBuilder()
        .setTitle('🎫 Support System')
        .setDescription(`Click the button below to open a ticket with our support team.\n We will review your request and assist you as quickly as possible.`)
        .setColor(0x2ECC71);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('create_ticket_channel').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('✉️')
    );
    await ctx.reply({ content: 'Ticketing panel deployed successfully.', ephemeral: true });
    await ctx.channel.send({ embeds: [embed], components: [row] });
});

/**
 * BATCH GENERATION OF THE REMAINING 27 MODERATION INFRASTRUCTURE COMMAND ENGINE UTILITIES
 */
const mockModCommands = [
    { name: 'kick', desc: 'Evicts targeted threat actor from server.' },
    { name: 'ban', desc: 'Permanently terminates individual membership across data network nodes.' },
    { name: 'unban', desc: 'Restores access permissions for a previously restricted account.' },
    { name: 'mute', desc: 'Restricts user permission parameters from sending text transmissions.' },
    { name: 'unmute', desc: 'Restores structural messaging capabilities to muted profiles.' },
    { name: 'timeout', desc: 'Applies programmatic temporary timeout constraints onto individuals.' },
    { name: 'warn', desc: 'Logs formal warning infraction records against a specific client profile.' },
    { name: 'checkwarns', desc: 'Fetches total warning history logs parsed to target user.' },
    { name: 'clearwarns', desc: 'Deletes and resets all structural warning infractions logged.' },
    { name: 'purge', desc: 'Cleans up bulk quantities of legacy textual backlogs from channel history.' },
    { name: 'lock', desc: 'Revokes channel interaction permissions for general community members.' },
    { name: 'unlock', desc: 'Restores communication permissions for general community members on a locked channel.' },
    { name: 'slowmode', desc: 'Establishes continuous execution timeout periods on chat messages.' },
    { name: 'nuke', desc: 'Wipes chat history by fully re-cloning a server channel.' },
    { name: 'softban', desc: 'Bans and instantly unbans a user to purge their recent message footprint.' },
    { name: 'tempban', desc: 'Temporarily bans a user from the environment for a set duration.' },
    { name: 'roleadd', desc: 'Grants a specified security role to a target member profile.' },
    { name: 'roleremove', desc: 'Strips a specified security role from a target member profile.' },
    { name: 'nick', desc: 'Modifies the local displayed nickname identifier of a target member.' },
    { name: 'warnremove', desc: 'Removes a single specific warning infraction token via ID.' },
    { name: 'lockdown', desc: 'Locks down all visible channels across the entire server category.' },
    { name: 'unlockdown', desc: 'Restores public visibility and communication across the server category.' },
    { name: 'channelcreate', desc: 'Creates a new text or voice communication channel channel.' },
    { name: 'channeldelete', desc: 'Permanently deletes a targeted channel.' },
    { name: 'roledel', desc: 'Deletes a custom configuration server role from the database.' },
    { name: 'rolecreate', desc: 'Spawns a new structural role with zeroed base parameters.' },
    { name: 'serverinfo', desc: 'Returns a detailed overview of the guild\'s technical layout.' },
    { name: 'whois', desc: 'Fetches granular configuration details regarding an individual user profile.' },
    { name: 'slowmodestop', desc: 'Resets channel transmission parameters back to immediate messaging.' },
    { name: 'clearinfractions', desc: 'Wipes the entire administrative log file for a given member.' }
];

// Load standard external command array packages directly into our map cache system
moderationCommandsList.forEach(cmd => {
    commands.set(cmd.name, cmd);
});
applicationCommandsList.forEach(cmd => {
    commands.set(cmd.name, cmd);
});
welcomeModule.commands.forEach(cmd => {
    commands.set(cmd.name, cmd);
});

// ==========================================
// UNIFIED TRANSLATION PIPELINE BRIDGE
// ==========================================
class UnifiedContext {
    constructor(source, client) {
        this.source = source;
        this.client = client;
        this.isInteraction = typeof source.reply === 'function' && source.isCommand?.();
        
        this.guild = source.guild;
        this.channel = source.channel;
        this.member = source.member;
        this.createdTimestamp = source.createdTimestamp;
        
        // Universal interface options extraction mapping layer
        this.options = {
            getUser: (name) => this.isInteraction ? source.options.getUser(name) : source.mentions.users.first(),
            getString: (name) => this.isInteraction ? source.options.getString(name) : null,
            getInteger: (name) => this.isInteraction ? source.options.getInteger(name) : null,
            getRole: (name) => this.isInteraction ? source.options.getRole(name) : null
        };
        this.mentions = source.mentions || null;
    }

    async reply(payload) {
        if (this.isInteraction) {
            if (this.source.replied || this.source.deferred) return await this.source.followUp(payload);
            return await this.source.reply(payload);
        }
        this._replyMsg = await this.source.reply(payload);
        return this._replyMsg;
    }

    async editReply(payload) {
        const rawPayload = typeof payload === 'string' ? { content: payload } : payload;
        if (this.isInteraction) return await this.source.editReply(rawPayload);
        if (this._replyMsg) return await this._replyMsg.edit(rawPayload);
        return await this.source.channel.send(rawPayload);
    }
}

// ==========================================
// AUTOMATED GUILD MEMBER JOIN EVENT LISTENER
// ==========================================
client.on('guildMemberAdd', async (member) => {
    const config = welcomeModule.welcomeDatabase.get(member.guild.id);
    if (!config) return;

    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const finalizedString = config.message
        .replace(/{user}/g, `${member.user}`)
        .replace(/{guild}/g, `${member.guild.name}`);

    const welcomeEmbed = new EmbedBuilder()
        .setTitle('✨ New Member Connection')
        .setDescription(finalizedString)
        .setColor(0x2ECC71)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await channel.send({ content: `${member.user}`, embeds: [welcomeEmbed] }).catch(() => {});
});

// ==========================================
// GATEWAY LISTENER INTERCEPTORS
// ==========================================

// Global Lifecycle Initializer & Interactive Sync Engine
client.once('ready', async () => {
    console.log(`🚀 System Engine initialized as: ${client.user.tag}`);
    
    // ==========================================
    // 5 PREMIUM STATUS + DND / ONLINE ROTATOR
    // ==========================================
    const statuses = [
        { text: 'Made By Huztro', type: 3 }, 
        { text: 'Ensuring Uptime Stability', type: 0 }, 
        { text: 'Optimizing Performance Modules', type: 2 }, 
        { text: 'Executing System Diagnostics', type: 3 },
        { text: 'Protecting Servers', type: 1 }  
    ];

    let currentIndex = 0;
    let presenceMode = 'dnd'; 

    updateStatusText();

    setInterval(() => {
        updateStatusText();
    }, 5000);

    setInterval(() => {
        updatePresenceMode();
    }, 60000);

    function updateStatusText() {
        const currentStatus = statuses[currentIndex];

        client.user.setPresence({
            activities: [{ name: currentStatus.text, type: currentStatus.type }],
            status: presenceMode
        });

        currentIndex = (currentIndex + 1) % statuses.length;
    }

    function updatePresenceMode() {
        presenceMode = (presenceMode === 'dnd') ? 'online' : 'dnd';

        const currentStatus = statuses[currentIndex];
        client.user.setPresence({
            activities: [{ name: currentStatus.text, type: currentStatus.type }],
            status: presenceMode
        });

        console.log(`🔄 Presence mode toggled: [Mode: ${presenceMode.toUpperCase()}]`);
    }

    // Sync all commands to Discord Application Gateway
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const slashBuilders = Array.from(commands.values()).map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        options: cmd.options || [],
        default_member_permissions: cmd.permissions ? cmd.permissions[0].toString() : null
    }));

    try {
        console.log('🔄 Syncing dual integration routes to application server...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: slashBuilders }
        );
        console.log('✅ Mainframe synchronization complete.');
    } catch (err) {
        console.error('❌ Synchronizer encountered a structural registration exception:', err);
    }
});

// Text Core Gateway Listener (Prefix Routing)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Real-Time Inline AutoMod Engine Interceptor Matrix
    const messageContentLower = message.content.toLowerCase();
    const triggerFound = BANNED_WORDS.some(word => messageContentLower.includes(word));
    
    if (triggerFound && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.delete().catch(() => {});
        const alertMsg = await message.channel.send(`⚠️ **AutoMod Intercept:** ${message.author}, your transmission contained restricted terms. Filter applied.`);
        setTimeout(() => alertMsg.delete().catch(() => {}), 5000);
        return;
    }

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands.get(commandName);
    if (!command) return;

    // Check configuration access controls
    if (command.permissions && !message.member.permissions.has(command.permissions)) {
        return message.reply('❌ You lack the administrative clearance permissions to invoke this asset.');
    }

    // Direct routing check for raw array handlers (applications.js and welcome.js arrays)
    if (!command.isNative) {
        try {
            return await command.run(message, args);
        } catch (err) {
            console.error(err);
            return message.reply('❌ System external modular layer execution failure.');
        }
    }

    const context = new UnifiedContext(message, client);
    try {
        await command.run(context);
    } catch (err) {
        console.error(err);
        await message.reply('❌ System runtime execution pipeline failure.');
    }
});

// Interaction Core Gateway Listener (Slash Commands & UI Operations)
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) return;

        // Verify Slash Command Permission Sets
        if (command.permissions && !interaction.member.permissions.has(command.permissions)) {
            return interaction.reply({ content: '❌ You lack the administrative clearance permissions to invoke this asset.', ephemeral: true });
        }

        // Direct routing check for raw array handlers
        if (!command.isNative) {
            try {
                return await command.run(interaction, null);
            } catch (err) {
                console.error(err);
                return interaction.reply({ content: '❌ System external layer execution failure.', ephemeral: true });
            }
        }

        const context = new UnifiedContext(interaction, client);
        try {
            await command.run(context);
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ System slash execution exception.', ephemeral: true });
        }
        return;
    }

    // Process UI interaction events (Ticketing and Verification systems)
    if (interaction.isButton()) {
        
        // SYSTEM 1: LIVE SUPPORT TICKETING PIPELINE ROUTER
        if (interaction.customId === 'create_ticket_channel') {
            await interaction.deferReply({ ephemeral: true });
            
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ]
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket Created: ${ticketChannel.name}`)
                .setDescription('Support will be with you shortly. To lock this interaction channel, click the button below.')
                .setColor(0x3498DB);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket_channel').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketChannel.send({ content: `${interaction.user} support interface initialized.`, embeds: [ticketEmbed], components: [row] });
            await interaction.editReply({ content: `Your support ticket has been opened: ${ticketChannel}` });
        }

        if (interaction.customId === 'close_ticket_channel') {
            await interaction.reply({ content: 'Locking configuration. This communication node will self-destruct in 5 seconds...' });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        // SYSTEM 2: INTERACTIVE CAPTCHA VERIFICATION MATRIX ENGINE
        if (interaction.customId === 'initiate_captcha') {
            const validSolution = Math.floor(Math.random() * 4) + 1; 
            
            const captchaEmbed = new EmbedBuilder()
                .setTitle('🧩 Anti-Bot Identity Validation Challenge')
                .setDescription('To verify that you are a human user, match the target validation sequence below:\n\n**Select Option Block Number:** `' + validSolution + '`')
                .setColor(0xF1C40F);

            const row = new ActionRowBuilder();
            for (let i = 1; i <= 4; i++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`captcha_choice_${i}_${validSolution}`)
                        .setLabel(`Option #${i}`)
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            await interaction.reply({ embeds: [captchaEmbed], components: [row], ephemeral: true });
        }

        // Evaluate user puzzle selections
        if (interaction.customId.startsWith('captcha_choice_')) {
            const parts = interaction.customId.split('_');
            const userChoice = parts[2];
            const correctChoice = parts[3];

            if (userChoice === correctChoice) {
                const verifiedRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === '﹒⚔・Verified . ?');
                if (verifiedRole) {
                    await interaction.member.roles.add(verifiedRole).catch(() => {});
                    await interaction.update({ content: '... **Verification Passed!** Your client container signature has been updated. Access granted.', embeds: [], components: [] });
                } else {
                    await interaction.update({ content: '⚠️ **Verification Passed!** However, no role named precisely `"﹒⚔・Verified . ?"` was detected on this server configuration.', embeds: [], components: [] });
                }
            } else {
                await interaction.update({ content: '❌ **Verification Failed.** Identity mismatch signature detected. Click "Verify Identity" to cycle a new validation grid sequence.', embeds: [], components: [] });
            }
        }
    }
});

// Execute secure pipeline handshake login to Discord gateway network
client.login(process.env.DISCORD_TOKEN);
