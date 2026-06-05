/**
 * Zishi — Utility & Admin Command Suite
 * Supports BOTH Slash Commands AND Prefix Commands (!/.
 * 10 admin/utility commands
 */

const {
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

// ==========================================
// SHARED EMBED HELPER
// ==========================================
function createUtilEmbed(title, description, executor) {
    const embed = new EmbedBuilder()
        .setTitle(`🔹 ${title}`)
        .setColor(0x1A1C1E)
        .setFooter({
            text: `Action by ${executor.username}`,
            iconURL: executor.displayAvatarURL({ size: 256 })
        })
        .setTimestamp();

    if (description && description.trim().length > 0) {
        embed.setDescription(description);
    }

    return embed;
}

// ==========================================
// HYBRID HELPERS
// ==========================================
function getExecutor(ctx) {
    return ctx.isCommand?.() ? ctx.user : ctx.author;
}

async function resolveRole(ctx, args, optionName = 'role') {
    if (ctx.isCommand?.()) return ctx.options.getRole(optionName);
    const mention = ctx.mentions?.roles?.first();
    if (mention) return mention;
    const query = args?.[0]?.replace(/[<@&>]/g, '');
    if (!query) return null;
    return ctx.guild.roles.cache.get(query)
        || ctx.guild.roles.cache.find(r => r.name.toLowerCase() === query.toLowerCase())
        || null;
}

async function resolveChannel(ctx, args, optionName = 'channel') {
    if (ctx.isCommand?.()) return ctx.options.getChannel(optionName);
    const mention = ctx.mentions?.channels?.first();
    if (mention) return mention;
    const query = args?.[0]?.replace(/[<#>]/g, '');
    if (!query) return null;
    return ctx.guild.channels.cache.get(query)
        || ctx.guild.channels.cache.find(c => c.name.toLowerCase() === query.toLowerCase())
        || null;
}

async function resolveUser(ctx, args, optionName = 'user') {
    if (ctx.isCommand?.()) return ctx.options.getUser(optionName);
    const mention = ctx.mentions?.users?.first();
    if (mention) return mention;
    const id = args?.[0]?.replace(/[<@!>]/g, '');
    if (id) return ctx.client.users.fetch(id).catch(() => null);
    return null;
}

async function reply(ctx, data) {
    if (ctx.isCommand?.()) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(data);
        return ctx.reply(data);
    }
    const content = typeof data === 'string' ? data : data.content;
    const embeds = typeof data === 'object' ? data.embeds : undefined;
    return ctx.channel.send({ content, embeds });
}

// ==========================================
// CONFIRMATION HELPER (prefix only — slash uses ephemeral follow-up)
// Returns true if confirmed, false if cancelled/timed out.
// ==========================================
async function awaitPrefixConfirmation(ctx, prompt) {
    const confirmMsg = await ctx.channel.send(
        `⚠️ **${prompt}**\nReply \`yes\` to confirm or \`no\` to cancel. *(15 seconds)*`
    );

    const filter = m =>
        m.author.id === ctx.author.id &&
        ['yes', 'no'].includes(m.content.toLowerCase());

    const collected = await ctx.channel.awaitMessages({
        filter,
        max: 1,
        time: 15000,
        errors: ['time']
    }).catch(() => null);

    await confirmMsg.delete().catch(() => {});

    if (!collected) {
        await ctx.channel.send('⏱️ Confirmation timed out. Action cancelled.').catch(() => {});
        return false;
    }

    const response = collected.first().content.toLowerCase();
    await collected.first().delete().catch(() => {});

    if (response !== 'yes') {
        await ctx.channel.send('❌ Action cancelled.').catch(() => {});
        return false;
    }

    return true;
}

// ==========================================
// COMMANDS EXPORT
// ==========================================
module.exports = [

/* =========================
   1. ROLEALL
   Give a role to every member in the server.
========================= */
{
    name: 'roleall',
    description: 'Give a role to all members in the server.',
    permissions: PermissionFlagsBits.Administrator,
    options: [
        { name: 'role', type: 8, description: 'Role to assign to all members', required: true }
    ],
    async run(ctx, args) {
        const executor = getExecutor(ctx);
        const role = await resolveRole(ctx, args, 'role');

        if (!role) return reply(ctx, { content: '❌ Role not found.', ephemeral: true });
        if (role.managed) return reply(ctx, { content: '❌ Cannot assign a managed/bot role.', ephemeral: true });
        if (role.position >= ctx.guild.members.me.roles.highest.position) {
            return reply(ctx, { content: '❌ That role is higher than or equal to my highest role.', ephemeral: true });
        }

        // Confirmation
        if (ctx.isCommand?.()) {
            await ctx.deferReply();
        } else {
            const confirmed = await awaitPrefixConfirmation(
                ctx,
                `This will assign **${role.name}** to ALL members. Are you sure?`
            );
            if (!confirmed) return;
        }

        const members = await ctx.guild.members.fetch();
        const eligible = members.filter(m => !m.roles.cache.has(role.id) && !m.user.bot);

        if (eligible.size === 0) {
            return reply(ctx, { content: '✅ All eligible members already have that role.', ephemeral: true });
        }

        const statusMsg = await reply(ctx, {
            content: `⏳ Assigning **${role.name}** to \`${eligible.size}\` members...`,
            ephemeral: false
        });

        let success = 0;
        let failed = 0;

        for (const [, member] of eligible) {
            await member.roles.add(role, `roleall by ${executor.tag}`).then(() => success++).catch(() => failed++);
        }

        const embed = createUtilEmbed('Role All — Complete', '', executor)
            .addFields(
                { name: '🎭 Role', value: `${role}`, inline: true },
                { name: '✅ Assigned', value: `\`${success}\``, inline: true },
                { name: '❌ Failed', value: `\`${failed}\``, inline: true }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   2. LISTROLES
   List all roles with member counts.
========================= */
{
    name: 'listroles',
    description: 'List all roles in the server with their member counts.',
    permissions: PermissionFlagsBits.Administrator,
    options: [],
    async run(ctx, args) {
        const executor = getExecutor(ctx);

        const roles = ctx.guild.roles.cache
            .filter(r => r.id !== ctx.guild.roles.everyone.id)
            .sort((a, b) => b.position - a.position);

        if (roles.size === 0) {
            return reply(ctx, { content: '❌ No roles found in this server.', ephemeral: true });
        }

        // Build paginated chunks (Discord field value limit: 1024 chars)
        const lines = roles.map(r => `${r} — \`${r.members.size}\` member(s)`);
        const chunks = [];
        let current = '';

        for (const line of lines) {
            if ((current + '\n' + line).length > 1000) {
                chunks.push(current);
                current = line;
            } else {
                current = current ? current + '\n' + line : line;
            }
        }
        if (current) chunks.push(current);

        const embed = createUtilEmbed(`Server Roles — ${roles.size} total`, '', executor);

        chunks.forEach((chunk, i) => {
            embed.addFields({ name: i === 0 ? '🎭 Roles' : '\u200b', value: chunk, inline: false });
        });

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   3. MEMBERCOUNT
   Show total members, bots, and humans.
========================= */
{
    name: 'membercount',
    description: 'Show total members, bots, and humans in the server.',
    permissions: PermissionFlagsBits.Administrator,
    options: [],
    async run(ctx, args) {
        const executor = getExecutor(ctx);

        const members = await ctx.guild.members.fetch();
        const total = members.size;
        const bots = members.filter(m => m.user.bot).size;
        const humans = total - bots;

        const embed = createUtilEmbed('Member Count', '', executor)
            .setThumbnail(ctx.guild.iconURL({ size: 256 }))
            .addFields(
                { name: '👥 Total', value: `\`${total.toLocaleString()}\``, inline: true },
                { name: '🧑 Humans', value: `\`${humans.toLocaleString()}\``, inline: true },
                { name: '🤖 Bots', value: `\`${bots.toLocaleString()}\``, inline: true }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   4. ROLEMEMBERS
   List all members with a specific role.
========================= */
{
    name: 'rolemembers',
    description: 'List all members who have a specific role.',
    permissions: PermissionFlagsBits.Administrator,
    options: [
        { name: 'role', type: 8, description: 'Role to list members of', required: true }
    ],
    async run(ctx, args) {
        const executor = getExecutor(ctx);
        const role = await resolveRole(ctx, args, 'role');

        if (!role) return reply(ctx, { content: '❌ Role not found.', ephemeral: true });

        const members = role.members;

        if (members.size === 0) {
            return reply(ctx, { content: `❌ No members have the **${role.name}** role.`, ephemeral: true });
        }

        const lines = members.map(m => `${m.user.tag} (\`${m.id}\`)`);
        const chunks = [];
        let current = '';

        for (const line of lines) {
            if ((current + '\n' + line).length > 1000) {
                chunks.push(current);
                current = line;
            } else {
                current = current ? current + '\n' + line : line;
            }
        }
        if (current) chunks.push(current);

        const embed = createUtilEmbed(`Members with ${role.name} — ${members.size} total`, '', executor);

        chunks.forEach((chunk, i) => {
            embed.addFields({ name: i === 0 ? '👤 Members' : '\u200b', value: chunk, inline: false });
        });

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   5. REMOVEALL
   Remove a role from all members.
========================= */
{
    name: 'removeall',
    description: 'Remove a role from all members in the server.',
    permissions: PermissionFlagsBits.Administrator,
    options: [
        { name: 'role', type: 8, description: 'Role to remove from all members', required: true }
    ],
    async run(ctx, args) {
        const executor = getExecutor(ctx);
        const role = await resolveRole(ctx, args, 'role');

        if (!role) return reply(ctx, { content: '❌ Role not found.', ephemeral: true });
        if (role.managed) return reply(ctx, { content: '❌ Cannot remove a managed/bot role.', ephemeral: true });
        if (role.position >= ctx.guild.members.me.roles.highest.position) {
            return reply(ctx, { content: '❌ That role is higher than or equal to my highest role.', ephemeral: true });
        }

        // Confirmation
        if (ctx.isCommand?.()) {
            await ctx.deferReply();
        } else {
            const confirmed = await awaitPrefixConfirmation(
                ctx,
                `This will remove **${role.name}** from ALL members. Are you sure?`
            );
            if (!confirmed) return;
        }

        const holders = role.members;

        if (holders.size === 0) {
            return reply(ctx, { content: '✅ No members currently have that role.', ephemeral: true });
        }

        await reply(ctx, { content: `⏳ Removing **${role.name}** from \`${holders.size}\` members...` });

        let success = 0;
        let failed = 0;

        for (const [, member] of holders) {
            await member.roles.remove(role, `removeall by ${executor.tag}`).then(() => success++).catch(() => failed++);
        }

        const embed = createUtilEmbed('Remove All — Complete', '', executor)
            .addFields(
                { name: '🎭 Role', value: `${role}`, inline: true },
                { name: '✅ Removed', value: `\`${success}\``, inline: true },
                { name: '❌ Failed', value: `\`${failed}\``, inline: true }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   6. MASSBAN
   Ban multiple users at once by ID.
========================= */
{
    name: 'massban',
    description: 'Ban multiple users at once. Provide space-separated user IDs.',
    permissions: PermissionFlagsBits.Administrator,
    options: [
        { name: 'userids', type: 3, description: 'Space-separated user IDs to ban', required: true },
        { name: 'reason', type: 3, description: 'Reason for the bans', required: false }
    ],
    async run(ctx, args) {
        const executor = getExecutor(ctx);

        let rawIds, reason;
        if (ctx.isCommand?.()) {
            rawIds = ctx.options.getString('userids');
            reason = ctx.options.getString('reason') || 'Mass ban';
        } else {
            rawIds = args?.join(' ');
            reason = 'Mass ban';
        }

        const ids = rawIds?.split(/\s+/).filter(id => /^\d{17,20}$/.test(id));

        if (!ids || ids.length === 0) {
            return reply(ctx, { content: '❌ No valid user IDs provided.', ephemeral: true });
        }

        // Confirmation
        if (ctx.isCommand?.()) {
            await ctx.deferReply();
        } else {
            const confirmed = await awaitPrefixConfirmation(
                ctx,
                `This will ban **${ids.length}** user(s). Are you sure?`
            );
            if (!confirmed) return;
        }

        let success = 0;
        let failed = 0;
        const failedIds = [];

        for (const id of ids) {
            await ctx.guild.members.ban(id, { reason: `${reason} | by ${executor.tag}` })
                .then(() => success++)
                .catch(() => { failed++; failedIds.push(id); });
        }

        const embed = createUtilEmbed('Mass Ban — Complete', '', executor)
            .addFields(
                { name: '📋 Reason', value: reason, inline: false },
                { name: '✅ Banned', value: `\`${success}\``, inline: true },
                { name: '❌ Failed', value: `\`${failed}\``, inline: true }
            );

        if (failedIds.length > 0) {
            embed.addFields({ name: '⚠️ Failed IDs', value: failedIds.join(', ').slice(0, 1024), inline: false });
        }

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   7. MASSUNBAN
   Unban multiple users at once by ID.
========================= */
{
    name: 'massunban',
    description: 'Unban multiple users at once. Provide space-separated user IDs.',
    permissions: PermissionFlagsBits.Administrator,
    options: [
        { name: 'userids', type: 3, description: 'Space-separated user IDs to unban', required: true }
    ],
    async run(ctx, args) {
        const executor = getExecutor(ctx);

        const rawIds = ctx.isCommand?.()
            ? ctx.options.getString('userids')
            : args?.join(' ');

        const ids = rawIds?.split(/\s+/).filter(id => /^\d{17,20}$/.test(id));

        if (!ids || ids.length === 0) {
            return reply(ctx, { content: '❌ No valid user IDs provided.', ephemeral: true });
        }

        // Confirmation
        if (ctx.isCommand?.()) {
            await ctx.deferReply();
        } else {
            const confirmed = await awaitPrefixConfirmation(
                ctx,
                `This will unban **${ids.length}** user(s). Are you sure?`
            );
            if (!confirmed) return;
        }

        let success = 0;
        let failed = 0;
        const failedIds = [];

        for (const id of ids) {
            await ctx.guild.members.unban(id, `Mass unban by ${executor.tag}`)
                .then(() => success++)
                .catch(() => { failed++; failedIds.push(id); });
        }

        const embed = createUtilEmbed('Mass Unban — Complete', '', executor)
            .addFields(
                { name: '✅ Unbanned', value: `\`${success}\``, inline: true },
                { name: '❌ Failed', value: `\`${failed}\``, inline: true }
            );

        if (failedIds.length > 0) {
            embed.addFields({ name: '⚠️ Failed IDs', value: failedIds.join(', ').slice(0, 1024), inline: false });
        }

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   8. MEMBERINFO
   Detailed info about a member.
========================= */
{
    name: 'memberinfo',
    description: 'Show detailed info about a server member.',
    permissions: PermissionFlagsBits.Administrator,
    options: [
        { name: 'user', type: 6, description: 'Member to inspect', required: true }
    ],
    async run(ctx, args) {
        const executor = getExecutor(ctx);
        const user = await resolveUser(ctx, args, 'user');

        if (!user) return reply(ctx, { content: '❌ User not found.', ephemeral: true });

        const member = await ctx.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply(ctx, { content: '❌ That user is not in this server.', ephemeral: true });

        const joinedAt = member.joinedAt
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
            : 'Unknown';

        const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`;

        const roles = member.roles.cache
            .filter(r => r.id !== ctx.guild.roles.everyone.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString());

        const rolesDisplay = roles.length > 0
            ? roles.slice(0, 20).join(', ') + (roles.length > 20 ? ` (+${roles.length - 20} more)` : '')
            : 'None';

        const flags = user.flags?.toArray() || [];
        const badges = flags.length > 0 ? flags.join(', ') : 'None';

        const statusMap = { online: '🟢 Online', idle: '🟡 Idle', dnd: '🔴 Do Not Disturb', offline: '⚫ Offline' };
        const presence = member.presence?.status
            ? (statusMap[member.presence.status] || member.presence.status)
            : '⚫ Offline';

        const embed = createUtilEmbed('Member Info', '', executor)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '👤 Identity', value: `**Tag:** \`${user.tag}\`\n**ID:** \`${user.id}\`\n**Mention:** ${user}`, inline: false },
                { name: '📅 Account Created', value: createdAt, inline: false },
                { name: '📥 Joined Server', value: joinedAt, inline: false },
                { name: '🎭 Top Role', value: `${member.roles.highest}`, inline: true },
                { name: '🔢 Role Count', value: `\`${roles.length}\``, inline: true },
                { name: '🌐 Status', value: presence, inline: true },
                { name: '🛡️ Roles', value: rolesDisplay, inline: false },
                { name: '🏅 Badges', value: badges, inline: false },
                { name: '🤖 Bot', value: user.bot ? '✅ Yes' : '❌ No', inline: true },
                { name: '💬 Nickname', value: member.nickname || 'None', inline: true }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   9. ROLEDELETEALL
   Delete all non-managed, non-default roles (with confirmation).
========================= */
{
    name: 'roledeleteall',
    description: 'Delete all deletable roles in the server. Requires confirmation.',
    permissions: PermissionFlagsBits.Administrator,
    options: [],
    async run(ctx, args) {
        const executor = getExecutor(ctx);

        const deletable = ctx.guild.roles.cache.filter(r =>
            r.id !== ctx.guild.roles.everyone.id &&
            !r.managed &&
            r.position < ctx.guild.members.me.roles.highest.position
        );

        if (deletable.size === 0) {
            return reply(ctx, { content: '❌ No deletable roles found.', ephemeral: true });
        }

        // Confirmation
        if (ctx.isCommand?.()) {
            await ctx.deferReply();
        } else {
            const confirmed = await awaitPrefixConfirmation(
                ctx,
                `⚠️ **DANGER:** This will permanently delete **${deletable.size}** role(s). This cannot be undone. Are you sure?`
            );
            if (!confirmed) return;
        }

        await reply(ctx, { content: `⏳ Deleting \`${deletable.size}\` roles...` });

        let success = 0;
        let failed = 0;

        for (const [, role] of deletable) {
            await role.delete(`roledeleteall by ${executor.tag}`).then(() => success++).catch(() => failed++);
        }

        const embed = createUtilEmbed('Role Delete All — Complete', '', executor)
            .addFields(
                { name: '✅ Deleted', value: `\`${success}\``, inline: true },
                { name: '❌ Failed', value: `\`${failed}\``, inline: true }
            );

        return reply(ctx, { embeds: [embed] });
    }
},

/* =========================
   10. CHANNELINFO
   Detailed info about a channel.
========================= */
{
    name: 'channelinfo',
    description: 'Show detailed info about a channel.',
    permissions: PermissionFlagsBits.Administrator,
    options: [
        { name: 'channel', type: 7, description: 'Channel to inspect (defaults to current)', required: false }
    ],
    async run(ctx, args) {
        const executor = getExecutor(ctx);

        let channel;
        if (ctx.isCommand?.()) {
            channel = ctx.options.getChannel('channel') || ctx.channel;
        } else {
            channel = await resolveChannel(ctx, args, 'channel') || ctx.channel;
        }

        const typeMap = {
            [ChannelType.GuildText]:        '💬 Text Channel',
            [ChannelType.GuildVoice]:       '🔊 Voice Channel',
            [ChannelType.GuildCategory]:    '📁 Category',
            [ChannelType.GuildAnnouncement]:'📢 Announcement Channel',
            [ChannelType.GuildStageVoice]:  '🎙️ Stage Channel',
            [ChannelType.GuildForum]:       '📋 Forum Channel',
            [ChannelType.GuildThread]:      '🧵 Thread',
            [ChannelType.PublicThread]:     '🧵 Public Thread',
            [ChannelType.PrivateThread]:    '🔒 Private Thread'
        };

        const channelType = typeMap[channel.type] || `Unknown (\`${channel.type}\`)`;
        const createdAt = `<t:${Math.floor(channel.createdTimestamp / 1000)}:F> (<t:${Math.floor(channel.createdTimestamp / 1000)}:R>)`;
        const category = channel.parent ? channel.parent.name : 'None';
        const position = channel.position != null ? `\`${channel.position}\`` : 'N/A';
        const topic = channel.topic || 'No topic set';
        const nsfw = channel.nsfw != null ? (channel.nsfw ? '✅ Yes' : '❌ No') : 'N/A';
        const slowmode = channel.rateLimitPerUser
            ? `\`${channel.rateLimitPerUser}s\``
            : '`Off`';
        const memberCount = channel.members?.size != null
            ? `\`${channel.members.size}\``
            : 'N/A';

        const embed = createUtilEmbed('Channel Info', '', executor)
            .addFields(
                { name: '📛 Name', value: `${channel}`, inline: true },
                { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
                { name: '📂 Type', value: channelType, inline: true },
                { name: '📅 Created', value: createdAt, inline: false },
                { name: '📁 Category', value: category, inline: true },
                { name: '📊 Position', value: position, inline: true },
                { name: '👥 Members', value: memberCount, inline: true },
                { name: '🔞 NSFW', value: nsfw, inline: true },
                { name: '🐌 Slowmode', value: slowmode, inline: true },
                { name: '📝 Topic', value: topic.slice(0, 512), inline: false }
            );

        return reply(ctx, { embeds: [embed] });
    }
}

]; // end module.exports
