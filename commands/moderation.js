/**
 * Zishi — Full Moderation Command Suite
 * Supports BOTH Slash Commands AND Prefix Commands (!)
 * 30+ moderation commands
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

// ==========================================
// PREMIUM EMBED CORE
// ==========================================
function createPremiumEmbed(title, description = '', executioner) {
    const embed = new EmbedBuilder()
        .setTitle(`🔹 ${title}`)
        .setColor(0x1A1C1E)
        .setFooter({
            text: `Action taken by ${executioner.username}`,
            iconURL: executioner.displayAvatarURL({ size: 256 })
        })
        .setTimestamp();

    if (description && description.trim().length > 0) {
        embed.setDescription(description);
    }

    return embed;
}

// ==========================================
// DELETE BUTTON ROW
// Adds a 🗑️ trash button that deletes the mod response
// ==========================================
function deleteButtonRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('mod_delete_message')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
    );
}

// ==========================================
// WARNINGS DATABASE (in-memory, per-guild)
// ==========================================
// Structure: Map<guildId, Map<userId, Array<{reason, moderator, timestamp}>>>
const warningsDatabase = new Map();

function getGuildWarns(guildId) {
    if (!warningsDatabase.has(guildId)) warningsDatabase.set(guildId, new Map());
    return warningsDatabase.get(guildId);
}

// ==========================================
// HYBRID CONTEXT HELPERS
// ==========================================
// Resolves user from slash option OR prefix mention/ID
async function resolveUser(ctx, args, optionName = 'user') {
    if (ctx.isCommand?.()) return ctx.options.getUser(optionName);
    const mention = ctx.mentions?.users?.first();
    if (mention) return mention;
    const id = args?.[0]?.replace(/[<@!>]/g, '');
    if (id) return ctx.client.users.fetch(id).catch(() => null);
    return null;
}

// Resolves integer from slash option OR prefix arg
function resolveInt(ctx, args, optionName, argIndex = 1) {
    if (ctx.isCommand?.()) return ctx.options.getInteger(optionName);
    return parseInt(args?.[argIndex]) || null;
}

// Resolves string from slash option OR prefix args joined
function resolveString(ctx, args, optionName, argStart = 1) {
    if (ctx.isCommand?.()) return ctx.options.getString(optionName);
    return args?.slice(argStart).join(' ') || null;
}

// Unified reply that works for both slash and prefix
// Automatically appends the delete button to any embed response
async function reply(ctx, data) {
    // Inject delete button into embed responses
    if (typeof data === 'object' && data.embeds && data.embeds.length > 0) {
        data = { ...data, components: [deleteButtonRow()] };
    }

    if (ctx.isCommand?.()) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(data);
        return ctx.reply(data);
    }
    const content = typeof data === 'string' ? data : data.content;
    const embeds = typeof data === 'object' ? data.embeds : undefined;
    const components = typeof data === 'object' ? data.components : undefined;
    return ctx.channel.send({ content, embeds, components });
}

// ==========================================
// TEMPBAN TIMERS (in-memory)
// ==========================================
const tempbanTimers = new Map();

// ==========================================
// MUTE ROLE CACHE
// ==========================================
async function getMuteRole(guild) {
    let muteRole = guild.roles.cache.find(r => r.name === 'Muted');
    if (!muteRole) {
        muteRole = await guild.roles.create({
            name: 'Muted',
            color: 0x808080,
            permissions: []
        });
        for (const channel of guild.channels.cache.values()) {
            await channel.permissionOverwrites.edit(muteRole, {
                SendMessages: false,
                Speak: false,
                AddReactions: false
            }).catch(() => {});
        }
    }
    return muteRole;
}

// ==========================================
// COMMANDS (prefix-only — no slash registration)
// ==========================================
const moderationCommands = [


/* =========================
   1. KICK
========================= */
{
    name: 'kick',
    description: 'Kick a member from the server.',
    permissions: PermissionFlagsBits.KickMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: false }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const reason = resolveString(ctx, args, 'reason', 2) || 'No reason specified';

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });
        if (!member.kickable) return reply(ctx, { content: '❌ Cannot kick this user.', ephemeral: true });

        await member.kick(reason);

        const embed = createPremiumEmbed('User Kicked', '', ctx.isCommand?.() ? ctx.user : ctx.author)
            .addFields(
                { name: '👤 User', value: `${user.tag} (\`${user.id}\`)` },
                { name: '📋 Reason', value: reason }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   2. BAN
========================= */
{
    name: 'ban',
    description: 'Permanently ban a user.',
    permissions: PermissionFlagsBits.BanMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: false }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const reason = resolveString(ctx, args, 'reason', 2) || 'No reason specified';

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        await ctx.guild.members.ban(user.id, { reason });

        const embed = createPremiumEmbed('User Banned', '', ctx.isCommand?.() ? ctx.user : ctx.author)
            .addFields(
                { name: '👤 User', value: `${user.tag}` },
                { name: '📋 Reason', value: reason }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   3. UNBAN
========================= */
{
    name: 'unban',
    description: 'Unban a user by ID.',
    permissions: PermissionFlagsBits.BanMembers,
    options: [
        { name: 'userid', type: 3, description: 'User ID to unban', required: true }
    ],
    async run(ctx, args) {
        const id = ctx.isCommand?.()
            ? ctx.options.getString('userid')
            : args?.[0];

        if (!id) return reply(ctx, { content: '❌ Provide a user ID.', ephemeral: true });

        await ctx.guild.members.unban(id).catch(() => null);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('User Unbanned', '', ctx.isCommand?.() ? ctx.user : ctx.author)
                    .addFields({ name: '🆔 User ID', value: id })
            ]
        });
    }
},

/* =========================
   4. TEMPBAN
========================= */
{
    name: 'tempban',
    description: 'Temporarily ban a user for a set duration (minutes).',
    permissions: PermissionFlagsBits.BanMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'minutes', type: 4, description: 'Duration in minutes', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: false }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const mins = resolveInt(ctx, args, 'minutes', 1);
        const reason = resolveString(ctx, args, 'reason', 3) || 'Temporary ban';
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });
        if (!mins || mins <= 0) return reply(ctx, { content: '❌ Provide a valid duration.', ephemeral: true });

        await ctx.guild.members.ban(user.id, { reason });

        const timerKey = `${ctx.guild.id}_${user.id}`;
        if (tempbanTimers.has(timerKey)) clearTimeout(tempbanTimers.get(timerKey));

        const timer = setTimeout(async () => {
            await ctx.guild.members.unban(user.id).catch(() => {});
            tempbanTimers.delete(timerKey);
        }, mins * 60000);

        tempbanTimers.set(timerKey, timer);

        const embed = createPremiumEmbed('Temp Ban Issued', '', executor)
            .addFields(
                { name: '👤 User', value: `${user.tag}` },
                { name: '⏱️ Duration', value: `${mins} minute(s)` },
                { name: '📋 Reason', value: reason }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   5. SOFTBAN
========================= */
{
    name: 'softban',
    description: 'Ban then immediately unban a user (clears messages).',
    permissions: PermissionFlagsBits.BanMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: false }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const reason = resolveString(ctx, args, 'reason', 2) || 'Softban';
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        await ctx.guild.members.ban(user.id, { reason, deleteMessageSeconds: 604800 });
        await ctx.guild.members.unban(user.id);

        const embed = createPremiumEmbed('Softban Applied', '', executor)
            .addFields(
                { name: '👤 User', value: `${user.tag}` },
                { name: '📋 Reason', value: reason }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   6. MUTE (Role-based)
========================= */
{
    name: 'mute',
    description: 'Mute a member using the Muted role.',
    permissions: PermissionFlagsBits.ManageRoles,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: false }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const reason = resolveString(ctx, args, 'reason', 2) || 'No reason specified';
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });

        const muteRole = await getMuteRole(ctx.guild);
        await member.roles.add(muteRole, reason);

        const embed = createPremiumEmbed('Member Muted', '', executor)
            .addFields(
                { name: '👤 User', value: `${user.tag}` },
                { name: '📋 Reason', value: reason }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   7. UNMUTE
========================= */
{
    name: 'unmute',
    description: 'Remove the Muted role from a member.',
    permissions: PermissionFlagsBits.ManageRoles,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });

        const muteRole = ctx.guild.roles.cache.find(r => r.name === 'Muted');
        if (!muteRole) return reply(ctx, { content: '❌ No Muted role found.', ephemeral: true });

        await member.roles.remove(muteRole);

        const embed = createPremiumEmbed('Member Unmuted', '', executor)
            .addFields({ name: '👤 User', value: `${user.tag}` });

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   8. TIMEOUT
========================= */
{
    name: 'timeout',
    description: 'Timeout a user for a set number of minutes.',
    permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'minutes', type: 4, description: 'Duration in minutes', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: false }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const mins = resolveInt(ctx, args, 'minutes', 1);
        const reason = resolveString(ctx, args, 'reason', 3) || 'No reason specified';
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });
        if (!mins || mins <= 0) return reply(ctx, { content: '❌ Provide a valid duration.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });

        await member.timeout(mins * 60000, reason);

        const embed = createPremiumEmbed('Timeout Applied', '', executor)
            .addFields(
                { name: '👤 User', value: user.tag },
                { name: '⏱️ Duration', value: `${mins} minute(s)` },
                { name: '📋 Reason', value: reason }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   9. UNTIMEOUT
========================= */
{
    name: 'untimeout',
    description: 'Remove a timeout from a user.',
    permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });

        await member.timeout(null);

        const embed = createPremiumEmbed('Timeout Removed', '', executor)
            .addFields({ name: '👤 User', value: user.tag });

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   10. WARN
========================= */
{
    name: 'warn',
    description: 'Issue a warning to a user.',
    permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const reason = resolveString(ctx, args, 'reason', 2) || 'No reason specified';
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const guildWarns = getGuildWarns(ctx.guild.id);
        if (!guildWarns.has(user.id)) guildWarns.set(user.id, []);
        guildWarns.get(user.id).push({
            reason,
            moderator: executor.tag,
            timestamp: new Date().toISOString()
        });

        const embed = createPremiumEmbed('Warning Issued', '', executor)
            .addFields(
                { name: '👤 User', value: user.tag },
                { name: '📋 Reason', value: reason },
                { name: '🔢 Total Warnings', value: `${guildWarns.get(user.id).length}` }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   11. WARNREMOVE
========================= */
{
    name: 'warnremove',
    description: 'Remove a specific warning from a user by index.',
    permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'index', type: 4, description: 'Warning number to remove', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const index = resolveInt(ctx, args, 'index', 1);
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const guildWarns = getGuildWarns(ctx.guild.id);
        const warns = guildWarns.get(user.id) || [];

        if (!index || index < 1 || index > warns.length) {
            return reply(ctx, { content: `❌ Invalid warning index. User has ${warns.length} warning(s).`, ephemeral: true });
        }

        const removed = warns.splice(index - 1, 1)[0];
        guildWarns.set(user.id, warns);

        const embed = createPremiumEmbed('Warning Removed', '', executor)
            .addFields(
                { name: '👤 User', value: user.tag },
                { name: '🗑️ Removed Warning', value: removed.reason },
                { name: '🔢 Remaining', value: `${warns.length}` }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   12. CHECKWARNS
========================= */
{
    name: 'checkwarns',
    description: 'View all warnings for a user.',
    permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const guildWarns = getGuildWarns(ctx.guild.id);
        const warns = guildWarns.get(user.id) || [];

        const embed = createPremiumEmbed(`Warnings — ${user.tag}`, '', executor)
            .setDescription(
                warns.length
                    ? warns.map((w, i) => `**${i + 1}.** ${w.reason} — *by ${w.moderator}*`).join('\n')
                    : '✅ No warnings on record.'
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   13. CLEARWARNS
========================= */
{
    name: 'clearwarns',
    description: 'Clear all warnings for a user.',
    permissions: PermissionFlagsBits.ModerateMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const guildWarns = getGuildWarns(ctx.guild.id);
        guildWarns.delete(user.id);

        const embed = createPremiumEmbed('Warnings Cleared', '', executor)
            .addFields({ name: '👤 User', value: user.tag });

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   14. PURGE
========================= */
{
    name: 'purge',
    description: 'Bulk delete messages in the current channel.',
    permissions: PermissionFlagsBits.ManageMessages,
    options: [
        { name: 'amount', type: 4, description: 'Number of messages (1–100)', required: true }
    ],
    async run(ctx, args) {
        const amount = resolveInt(ctx, args, 'amount', 0);
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!amount || amount < 1 || amount > 100) {
            return reply(ctx, { content: '❌ Amount must be between 1 and 100.', ephemeral: true });
        }

        const deleted = await ctx.channel.bulkDelete(amount, true).catch(() => null);

        const embed = createPremiumEmbed('Messages Purged', '', executor)
            .addFields({ name: '🗑️ Deleted', value: `${deleted?.size ?? 0} message(s)` });

        return reply(ctx, { embeds: [embed], ephemeral: true });
    }
},

/* =========================
   15. NUKE
========================= */
{
    name: 'nuke',
    description: 'Clone and delete the current channel (wipes all messages).',
    permissions: PermissionFlagsBits.ManageChannels,
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        const channel = ctx.channel;

        const newChannel = await channel.clone();
        await newChannel.setPosition(channel.position);
        await channel.delete();

        const embed = createPremiumEmbed('Channel Nuked', `Channel has been reset.`, executor);
        await newChannel.send({ embeds: [embed], components: [deleteButtonRow()] });
    }
},

/* =========================
   16. LOCK
========================= */
{
    name: 'lock',
    description: 'Lock the current channel (prevent members from sending messages).',
    permissions: PermissionFlagsBits.ManageChannels,
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        await ctx.channel.permissionOverwrites.edit(
            ctx.guild.roles.everyone,
            { SendMessages: false }
        );

        return reply(ctx, {
            embeds: [createPremiumEmbed('Channel Locked', '🔒 No one can send messages here.', executor)]
        });
    }
},

/* =========================
   17. UNLOCK
========================= */
{
    name: 'unlock',
    description: 'Unlock the current channel.',
    permissions: PermissionFlagsBits.ManageChannels,
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        await ctx.channel.permissionOverwrites.edit(
            ctx.guild.roles.everyone,
            { SendMessages: null }
        );

        return reply(ctx, {
            embeds: [createPremiumEmbed('Channel Unlocked', '🔓 Members can send messages again.', executor)]
        });
    }
},

/* =========================
   18. LOCKDOWN (all channels)
========================= */
{
    name: 'lockdown',
    description: 'Lock ALL text channels in the server.',
    permissions: PermissionFlagsBits.Administrator,
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        let count = 0;

        for (const channel of ctx.guild.channels.cache.values()) {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(
                    ctx.guild.roles.everyone,
                    { SendMessages: false }
                ).catch(() => {});
                count++;
            }
        }

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Server Lockdown', `🔒 Locked **${count}** channels.`, executor)
            ]
        });
    }
},

/* =========================
   19. UNLOCKDOWN
========================= */
{
    name: 'unlockdown',
    description: 'Unlock ALL text channels in the server.',
    permissions: PermissionFlagsBits.Administrator,
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        let count = 0;

        for (const channel of ctx.guild.channels.cache.values()) {
            if (channel.type === ChannelType.GuildText) {
                await channel.permissionOverwrites.edit(
                    ctx.guild.roles.everyone,
                    { SendMessages: null }
                ).catch(() => {});
                count++;
            }
        }

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Lockdown Lifted', `🔓 Unlocked **${count}** channels.`, executor)
            ]
        });
    }
},

/* =========================
   20. SLOWMODE
========================= */
{
    name: 'slowmode',
    description: 'Set slowmode on the current channel.',
    permissions: PermissionFlagsBits.ManageChannels,
    options: [
        { name: 'seconds', type: 4, description: 'Seconds (0 to disable)', required: true }
    ],
    async run(ctx, args) {
        const sec = resolveInt(ctx, args, 'seconds', 0);
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (sec === null || sec < 0 || sec > 21600) {
            return reply(ctx, { content: '❌ Seconds must be between 0 and 21600.', ephemeral: true });
        }

        await ctx.channel.setRateLimitPerUser(sec);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed(sec === 0 ? 'Slowmode Disabled' : 'Slowmode Set', '', executor)
                    .addFields({ name: '⏱️ Rate', value: sec === 0 ? 'Disabled' : `${sec} second(s)` })
            ]
        });
    }
},

/* =========================
   21. ROLEADD
========================= */
{
    name: 'roleadd',
    description: 'Add a role to a member.',
    permissions: PermissionFlagsBits.ManageRoles,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'role', type: 8, description: 'Role to add', required: true }
    ],
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        const user = await resolveUser(ctx, args, 'user');

        let role;
        if (ctx.isCommand?.()) {
            role = ctx.options.getRole('role');
        } else {
            const roleId = args?.[1]?.replace(/[<@&>]/g, '');
            role = ctx.guild.roles.cache.get(roleId) || ctx.guild.roles.cache.find(r => r.name.toLowerCase() === args?.[1]?.toLowerCase());
        }

        if (!user || !role) return reply(ctx, { content: '❌ User or role not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });

        await member.roles.add(role);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Role Added', '', executor)
                    .addFields(
                        { name: '👤 User', value: user.tag },
                        { name: '🎭 Role', value: role.name }
                    )
            ]
        });
    }
},

/* =========================
   22. ROLEREMOVE
========================= */
{
    name: 'roleremove',
    description: 'Remove a role from a member.',
    permissions: PermissionFlagsBits.ManageRoles,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'role', type: 8, description: 'Role to remove', required: true }
    ],
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        const user = await resolveUser(ctx, args, 'user');

        let role;
        if (ctx.isCommand?.()) {
            role = ctx.options.getRole('role');
        } else {
            const roleId = args?.[1]?.replace(/[<@&>]/g, '');
            role = ctx.guild.roles.cache.get(roleId) || ctx.guild.roles.cache.find(r => r.name.toLowerCase() === args?.[1]?.toLowerCase());
        }

        if (!user || !role) return reply(ctx, { content: '❌ User or role not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });

        await member.roles.remove(role);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Role Removed', '', executor)
                    .addFields(
                        { name: '👤 User', value: user.tag },
                        { name: '🎭 Role', value: role.name }
                    )
            ]
        });
    }
},

/* =========================
   23. ROLECREATE
========================= */
{
    name: 'rolecreate',
    description: 'Create a new role.',
    permissions: PermissionFlagsBits.ManageRoles,
    options: [
        { name: 'name', type: 3, description: 'Role name', required: true },
        { name: 'color', type: 3, description: 'Hex color (e.g. #FF0000)', required: false }
    ],
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        const name = resolveString(ctx, args, 'name', 0);
        const colorInput = ctx.isCommand?.() ? ctx.options.getString('color') : args?.[1];
        const color = colorInput ? parseInt(colorInput.replace('#', ''), 16) : 0x99AAB5;

        if (!name) return reply(ctx, { content: '❌ Provide a role name.', ephemeral: true });

        const role = await ctx.guild.roles.create({ name, color });

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Role Created', '', executor)
                    .addFields({ name: '🎭 Role', value: `${role} (\`${role.id}\`)` })
            ]
        });
    }
},

/* =========================
   24. ROLEDELETE
========================= */
{
    name: 'roledelete',
    description: 'Delete a role from the server.',
    permissions: PermissionFlagsBits.ManageRoles,
    options: [
        { name: 'role', type: 8, description: 'Role to delete', required: true }
    ],
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        let role;
        if (ctx.isCommand?.()) {
            role = ctx.options.getRole('role');
        } else {
            const roleId = args?.[0]?.replace(/[<@&>]/g, '');
            role = ctx.guild.roles.cache.get(roleId) || ctx.guild.roles.cache.find(r => r.name.toLowerCase() === args?.[0]?.toLowerCase());
        }

        if (!role) return reply(ctx, { content: '❌ Role not found.', ephemeral: true });

        const roleName = role.name;
        await role.delete();

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Role Deleted', '', executor)
                    .addFields({ name: '🎭 Role', value: roleName })
            ]
        });
    }
},

/* =========================
   25. NICK
========================= */
{
    name: 'nick',
    description: 'Change a member\'s nickname.',
    permissions: PermissionFlagsBits.ManageNicknames,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'nickname', type: 3, description: 'New nickname (leave blank to reset)', required: false }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const nickname = resolveString(ctx, args, 'nickname', 2) || null;
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });

        await member.setNickname(nickname);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Nickname Updated', '', executor)
                    .addFields(
                        { name: '👤 User', value: user.tag },
                        { name: '📝 Nickname', value: nickname || '*(reset)*' }
                    )
            ]
        });
    }
},

/* =========================
   26. CHANNELCREATE
========================= */
{
    name: 'channelcreate',
    description: 'Create a new text channel.',
    permissions: PermissionFlagsBits.ManageChannels,
    options: [
        { name: 'name', type: 3, description: 'Channel name', required: true }
    ],
    async run(ctx, args) {
        const name = resolveString(ctx, args, 'name', 0);
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!name) return reply(ctx, { content: '❌ Provide a channel name.', ephemeral: true });

        const channel = await ctx.guild.channels.create({
            name,
            type: ChannelType.GuildText
        });

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Channel Created', '', executor)
                    .addFields({ name: '📢 Channel', value: `${channel}` })
            ]
        });
    }
},

/* =========================
   27. CHANNELDELETE
========================= */
{
    name: 'channeldelete',
    description: 'Delete a channel.',
    permissions: PermissionFlagsBits.ManageChannels,
    options: [
        { name: 'channel', type: 7, description: 'Channel to delete', required: true }
    ],
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        let targetChannel;
        if (ctx.isCommand?.()) {
            targetChannel = ctx.options.getChannel('channel');
        } else {
            const chId = args?.[0]?.replace(/[<#>]/g, '');
            targetChannel = ctx.guild.channels.cache.get(chId);
        }

        if (!targetChannel) return reply(ctx, { content: '❌ Channel not found.', ephemeral: true });

        const channelName = targetChannel.name;
        await targetChannel.delete();

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Channel Deleted', '', executor)
                    .addFields({ name: '📢 Channel', value: `#${channelName}` })
            ]
        });
    }
},

/* =========================
   28. DEAFEN
========================= */
{
    name: 'deafen',
    description: 'Server-deafen a member in voice.',
    permissions: PermissionFlagsBits.DeafenMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });
        if (!member.voice.channel) return reply(ctx, { content: '❌ User is not in a voice channel.', ephemeral: true });

        await member.voice.setDeaf(true);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Member Deafened', '', executor)
                    .addFields({ name: '👤 User', value: user.tag })
            ]
        });
    }
},

/* =========================
   29. UNDEAFEN
========================= */
{
    name: 'undeafen',
    description: 'Remove server-deafen from a member.',
    permissions: PermissionFlagsBits.DeafenMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });
        if (!member.voice.channel) return reply(ctx, { content: '❌ User is not in a voice channel.', ephemeral: true });

        await member.voice.setDeaf(false);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Member Undeafened', '', executor)
                    .addFields({ name: '👤 User', value: user.tag })
            ]
        });
    }
},

/* =========================
   30. VOICEKICK
========================= */
{
    name: 'voicekick',
    description: 'Disconnect a member from their voice channel.',
    permissions: PermissionFlagsBits.MoveMembers,
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true }
    ],
    async run(ctx, args) {
        const user = await resolveUser(ctx, args, 'user');
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not in server.', ephemeral: true });
        if (!member.voice.channel) return reply(ctx, { content: '❌ User is not in a voice channel.', ephemeral: true });

        await member.voice.disconnect();

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('Voice Kicked', '', executor)
                    .addFields({ name: '👤 User', value: user.tag })
            ]
        });
    }
},

/* =========================
   31. WHOIS
========================= */
{
    name: 'whois',
    description: 'View detailed information about a member.',
    options: [
        { name: 'user', type: 6, description: 'Target user', required: false }
    ],
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        const user = await resolveUser(ctx, args, 'user') || executor;

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ Member not found.', ephemeral: true });

        const roles = member.roles.cache
            .filter(r => r.id !== ctx.guild.roles.everyone.id)
            .map(r => r.toString())
            .join(', ') || 'None';

        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        const createdAt = Math.floor(user.createdTimestamp / 1000);

        const embed = createPremiumEmbed(`Who Is — ${user.tag}`, '', executor)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
                { name: '📅 Account Created', value: `<t:${createdAt}:R>`, inline: false },
                { name: '📥 Joined Server', value: `<t:${joinedAt}:R>`, inline: false },
                { name: '🎭 Roles', value: roles.length > 1024 ? roles.slice(0, 1020) + '...' : roles, inline: false }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   32. SERVERINFO
========================= */
{
    name: 'serverinfo',
    description: 'View detailed information about this server.',
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;
        const guild = ctx.guild;

        const owner = await guild.fetchOwner().catch(() => null);
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;

        const embed = createPremiumEmbed(`Server Info — ${guild.name}`, '', executor)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { name: '🆔 ID', value: `\`${guild.id}\``, inline: true },
                { name: '👑 Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
                { name: '👥 Members', value: `\`${guild.memberCount}\``, inline: true },
                { name: '📢 Text Channels', value: `\`${textChannels}\``, inline: true },
                { name: '🔊 Voice Channels', value: `\`${voiceChannels}\``, inline: true },
                { name: '🎭 Roles', value: `\`${guild.roles.cache.size}\``, inline: true },
                { name: '🚀 Boost Level', value: `Tier \`${guild.premiumTier}\` (${guild.premiumSubscriptionCount} boosts)`, inline: false }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   33. CLEARINFRACTIONS
========================= */
{
    name: 'clearinfractions',
    description: 'Clear ALL warnings for ALL users in this server.',
    permissions: PermissionFlagsBits.Administrator,
    async run(ctx, args) {
        const executor = ctx.isCommand?.() ? ctx.user : ctx.author;

        warningsDatabase.delete(ctx.guild.id);

        return reply(ctx, {
            embeds: [
                createPremiumEmbed('All Infractions Cleared', 'All warnings for this server have been wiped.', executor)
            ]
        });
    }
}

]; // end moderationCommands array

// ==========================================
// MODULE EXPORT — prefix-only, no slash registration
// ==========================================
module.exports = {
    // Expose the raw list so index.js can do permission lookups
    commands: moderationCommands,

    // Prefix handler: routes !kick, !ban, etc.
    async handlePrefix(message, commandName, args) {
        const cmd = moderationCommands.find(c => c.name === commandName);
        if (!cmd) return false;

        // Permission check
        if (cmd.permissions && !message.member.permissions.has(cmd.permissions)) {
            await message.reply({ content: '❌ You lack the required permissions.' });
            return true;
        }

        try {
            await cmd.run(message, args);
        } catch (err) {
            console.error(`[Moderation Prefix Error] !${commandName}:`, err);
            await message.reply({ content: '❌ Command failed.' }).catch(() => {});
        }
        return true;
    }
};
