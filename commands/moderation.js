/**
 * Nexora Premium-Tier Modular Moderation Engine Matrix
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Client Framework
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType, ApplicationCommandOptionType } = require('discord.js');

// ==========================================
// CENTRAL PREMIUM EMBED CORES
// ==========================================
function createPremiumEmbed(title, description = '', executioner) {
    return new EmbedBuilder()
        .setTitle(`🔹 ${title}`)
        .setDescription(description)
        .setColor(0x1A1C1E)
        .setThumbnail('https://i.postimg.cc/d3zdwyjL/OIP.webp')
        .setFooter({
            text: `Action taken by ${executioner.username}`,
            iconURL: executioner.displayAvatarURL({ size: 256 })
        })
        .setTimestamp();
}

// Auxiliar para procesar usuarios (ID o Mención)
async function parseTargetUser(interactionOrMsg, args) {
    if (interactionOrMsg.isCommand?.()) return interactionOrMsg.options.getUser('user');
    if (interactionOrMsg.mentions.users.first()) return interactionOrMsg.mentions.users.first();
    if (args && args[0]) {
        try { return await interactionOrMsg.client.users.fetch(args[0]); } catch { return null; }
    }
    return null;
}

// Auxiliar para procesar roles (ID o Mención)
function parseTargetRole(interactionOrMsg, args) {
    if (interactionOrMsg.isCommand?.()) return interactionOrMsg.options.getRole('role');
    if (interactionOrMsg.mentions.roles.first()) return interactionOrMsg.mentions.roles.first();
    if (args && args[0]) return interactionOrMsg.guild.roles.cache.get(args[0]);
    return null;
}

const warningsDatabase = new Map();

module.exports = [
    // 1. KICK
    {
        name: 'kick',
        description: 'Evicts a target member from the server.',
        permissions: [PermissionFlagsBits.KickMembers],
        options: [
            { name: 'user', description: 'Target user profile context', type: 6, required: true },
            { name: 'reason', description: 'Administrative log notation text', type: 3, required: false }
        ],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Please specify a valid server member.', ephemeral: true });
            const reason = context.isCommand?.() ? context.options.getString('reason') : args.slice(1).join(' ') || 'No reason specified.';
            
            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member) return context.reply({ content: '❌ User is not present in this server.', ephemeral: true });
            if (!member.kickable) return context.reply({ content: '❌ Hierarchy Error: Target profile holds higher priority.', ephemeral: true });

            await member.kick(reason);
            
            const embed = createPremiumEmbed('User Evicted', context.member.user)
                .addFields(
                    { name: '👤 Target Identity', value: `> **User:** ${user}\n> **Tag:** \`${user.tag}\`\n> **ID:** \`${user.id}\``, inline: false },
                    { name: '📑 Case Information', value: `> **Action:** \`SERVER_KICK\`\n> **Reason:** \`${reason}\``, inline: false }
                );

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 2. BAN
    {
        name: 'ban',
        description: 'Permanently blocks a target identity from the server.',
        permissions: [PermissionFlagsBits.BanMembers],
        options: [
            { name: 'user', description: 'Target user identity record', type: 6, required: true },
            { name: 'reason', description: 'Administrative reason string', type: 3, required: false }
        ],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Specify a valid user identity.', ephemeral: true });
            const reason = context.isCommand?.() ? context.options.getString('reason') : args.slice(1).join(' ') || 'No reason specified.';

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (member && !member.bannable) return context.reply({ content: '❌ Hierarchy Error: Target profile holds higher priority.', ephemeral: true });

            await context.guild.members.ban(user.id, { reason });
            
            const embed = createPremiumEmbed('Banned user', context.member.user)
                .addFields(
                    { name: '👤 Blacklisted Target', value: `> **User:** ${user}\n> **Tag:** \`${user.tag}\`\n> **ID:** \`${user.id}\``, inline: false },
                    { name: '🔨 Ban Parameters', value: `> **Action:** \`PERMANENT_BAN\`\n> **Reason:** \`${reason}\``, inline: false }
                );

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 3. UNBAN
    {
        name: 'unban',
        description: 'Removes a ban entry tracking a user.',
        permissions: [PermissionFlagsBits.BanMembers],
        options: [{ name: 'user', description: 'Target absolute User ID string', type: 3, required: true }],
        async run(context, args) {
            const id = context.isCommand?.() ? context.options.getString('user') : args[0];
            if (!id) return context.reply({ content: '❌ Valid User ID parameter missing.', ephemeral: true });

            const unbanned = await context.guild.members.unban(id).catch(() => null);
            if (!unbanned) return context.reply({ content: '❌ Action rejected: profile matching ID is not banned.', ephemeral: true });

            const embed = createPremiumEmbed('Access Restored', context.member.user)
                .addFields({ name: '🔓 Account Cleared', value: `> **Target ID:** \`${id}\`\n> **Status:** \`Ban Revoked / Access Granted\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },
    
    // 4. TIMEOUT
    {
        name: 'timeout',
        description: 'Restricts user messaging actions temporarily.',
        permissions: [PermissionFlagsBits.ModerateMembers],
        options: [
            { name: 'user', description: 'Target member identity', type: 6, required: true },
            { name: 'minutes', description: 'Isolation window length (minutes)', type: 4, required: true }
        ],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            const mins = context.isCommand?.() ? context.options.getInteger('minutes') : parseInt(args[1], 10);
            if (!user || !mins || isNaN(mins)) return context.reply({ content: '❌ Missing parameters. Usage: `!timeout @user 15`', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member) return context.reply({ content: '❌ Member record absent.', ephemeral: true });

            await member.timeout(mins * 60 * 1000);
            
            const embed = createPremiumEmbed('Isolation Active', context.member.user)
                .addFields(
                    { name: '⏳ Muted Profile', value: `> **User:** ${user}\n> **ID:** \`${user.id}\``, inline: true },
                    { name: '⏱️ Cooldown Time', value: `> **Duration:** \`${mins} Minutes\`\n> **Status:** \`Restricted\``, inline: true }
                );

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 5. UNTIMEOUT
    {
        name: 'untimeout',
        description: 'Removes active timeout operational limits early.',
        permissions: [PermissionFlagsBits.ModerateMembers],
        options: [{ name: 'user', description: 'Target profile identity', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Target designation identity missing.', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member) return context.reply({ content: '❌ Profile not found.', ephemeral: true });

            await member.timeout(null);
            
            const embed = createPremiumEmbed('Isolation Revoked', context.member.user)
                .addFields({ name: '🔊 Communication Restored', value: `> **User:** ${user}\n> **Action:** \`Timeout Removed Early\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 6. WARN
    {
        name: 'warn',
        description: 'Appends a formal infraction token warning mark to a user.',
        permissions: [PermissionFlagsBits.ModerateMembers],
        options: [
            { name: 'user', description: 'Target user identity context', type: 6, required: true },
            { name: 'reason', description: 'Tracking context notation', type: 3, required: true }
        ],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Target context tracking field empty.', ephemeral: true });
            const reason = context.isCommand?.() ? context.options.getString('reason') : args.slice(1).join(' ');
            if (!reason) return context.reply({ content: '❌ Reason tracking string mandatory.', ephemeral: true });

            if (!warningsDatabase.has(user.id)) warningsDatabase.set(user.id, []);
            warningsDatabase.get(user.id).push(reason);

            const embed = createPremiumEmbed('Infraction Striked', context.member.user)
                .addFields(
                    { name: '⚠️ Flagged Profile', value: `> **User:** ${user}\n> **ID:** \`${user.id}\``, inline: true },
                    { name: '📈 Total Strikes', value: `> **Active Count:** \`${warningsDatabase.get(user.id).length} Warns\``, inline: true },
                    { name: '📝 Case Notes', value: `> \`${reason}\``, inline: false }
                );

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 7. CHECKWARNS
    {
        name: 'checkwarns',
        description: 'Retrieves history logs showing all warnings appended to an account.',
        permissions: [PermissionFlagsBits.ModerateMembers],
        options: [{ name: 'user', description: 'Target account profile', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Profile reference invalid.', ephemeral: true });

            const files = warningsDatabase.get(user.id) || [];
            if (!files.length) {
                const embed = createPremiumEmbed('Database Matrix Search', context.member.user)
                    .addFields({ name: '📊 Profile Status', value: `> **User:** ${user}\n> **Result:** \`Record is 100% Spotless (0 Warnings)\``, inline: false });
                return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
            }

            const embed = createPremiumEmbed(`Database History: ${user.username}`, context.member.user)
                .setDescription(files.map((log, index) => `\`[#${index + 1}]\` ➜ **Reason:** ${log}`).join('\n'));

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 8. CLEARWARNS
    {
        name: 'clearwarns',
        description: 'Flushes and deletes all historic warning database keys assigned to a user.',
        permissions: [PermissionFlagsBits.ModerateMembers],
        options: [{ name: 'user', description: 'Target account profile', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Target user reference context missing.', ephemeral: true });

            warningsDatabase.delete(user.id);
            const embed = createPremiumEmbed('Database Ledger Flushed', context.member.user)
                .addFields({ name: '🧹 Record Reset', value: `> **User:** ${user}\n> **Status:** \`All warning logs completely wiped from database\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 9. PURGE
    {
        name: 'purge',
        description: 'Deletes up to 100 recent chat logs.',
        permissions: [PermissionFlagsBits.ManageMessages],
        options: [{ name: 'amount', description: 'Number of rows to wipe out (1-100)', type: 4, required: true }],
        async run(context, args) {
            const count = context.isCommand?.() ? context.options.getInteger('amount') : parseInt(args[0], 10);
            if (!count || count < 1 || count > 100) return context.reply({ content: '❌ Input out of range. Supply limits matching 1 to 100.', ephemeral: true });

            const targetChannel = context.channel;
            if (!context.isCommand?.()) { await context.delete().catch(() => {}); }

            const cleared = await targetChannel.bulkDelete(count, true).catch(() => null);
            if (!cleared) return context.reply({ content: '❌ Error: Cannot bulk delete messages past 14 days old.', ephemeral: true });

            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Purged', execUser)
                .addFields(
                    { name: '💎 Messages Cleared', value: `> Deleted \`${cleared.size}\` messages`, inline: true },
                    { name: '📍 Channel', value: `> Channel: ${targetChannel}`, inline: true }
                );
            
            if (context.isCommand?.()) {
                return context.reply({ embeds: [embed] });
            } else {
                const receipt = await targetChannel.send({ embeds: [embed] });
                setTimeout(() => receipt.delete().catch(() => {}), 5000);
            }
        }
    },

    // 10. LOCK
    {
        name: 'lock',
        description: 'Stops message transmission capabilities on the target channel.',
        permissions: [PermissionFlagsBits.ManageChannels],
        options: [],
        async run(context) {
            await context.channel.permissionOverwrites.edit(context.guild.roles.everyone, { SendMessages: false });
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Security Quarantine', execUser)
                .addFields({ name: '🔒 Channel Overwrites', value: `> **Channel:** ${context.channel}\n> **Status:** \`Locked / Chat Disabled for @everyone\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 11. UNLOCK
    {
        name: 'unlock',
        description: 'Re-enables text communication across the current channel workspace.',
        permissions: [PermissionFlagsBits.ManageChannels],
        options: [],
        async run(context) {
            await context.channel.permissionOverwrites.edit(context.guild.roles.everyone, { SendMessages: null });
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Quarantine Lifted', execUser)
                .addFields({ name: '🔓 Channel Overwrites', value: `> **Channel:** ${context.channel}\n> **Status:** \`Unlocked / Chat Permissions Restored\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 12. SLOWMODE
    {
        name: 'slowmode',
        description: 'Enforces a strict message speed cooling delay across chat pipelines.',
        permissions: [PermissionFlagsBits.ManageChannels],
        options: [{ name: 'seconds', description: 'Cooldown length (seconds)', type: 4, required: true }],
        async run(context, args) {
            const timeVal = context.isCommand?.() ? context.options.getInteger('seconds') : parseInt(args[0], 10);
            if (timeVal === null || isNaN(timeVal)) return context.reply({ content: '❌ Cooldown tracking parameter input incorrect.', ephemeral: true });

            await context.channel.setRateLimitPerUser(timeVal);
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Rate Limit Throttle', execUser)
                .addFields({ name: '⏱️ Flow Constraints', value: `> **Channel:** ${context.channel}\n> **Cooldown Interval:** \`${timeVal} Seconds\`\n> **Status:** \`Active\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 13. SOFTBAN
    {
        name: 'softban',
        description: 'Bans and instantly unbans a target profile to safely erase their recent chats.',
        permissions: [PermissionFlagsBits.BanMembers],
        options: [{ name: 'user', description: 'Target threat actor', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Target reference value incorrect.', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (member && !member.bannable) return context.reply({ content: '❌ Role hierarchy constraints prevent this operation.', ephemeral: true });

            await context.guild.members.ban(user.id, { deleteMessageSeconds: 604800, reason: 'Softban text track cleanup script runtime execution.' });
            await context.guild.members.unban(user.id);
            
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Data Trace Purged', execUser)
                .addFields({ name: '💨 Softban Routing Complete', value: `> **User:** \`${user.tag}\`\n> **Result:** \`Account evicted and unbanned. Last 7 days of logs dropped.\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 14. ROLEADD
    {
        name: 'roleadd',
        description: 'Appends a configured server role to a user.',
        permissions: [PermissionFlagsBits.ManageRoles],
        options: [
            { name: 'user', description: 'Target recipient member', type: 6, required: true },
            { name: 'role', description: 'Target role designation reference key', type: 8, required: true }
        ],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            const role = parseTargetRole(context, context.isCommand?.() ? null : args.slice(1));
            if (!user || !role) return context.reply({ content: '❌ Missing functional arguments. Example template: `!roleadd @user @Role`', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            await member.roles.add(role);
            
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Permissions Altered', execUser)
                .addFields(
                    { name: '👤 Recipient Member', value: `> ${user}`, inline: true },
                    { name: '🧬 Added Role Matrix', value: `> ${role} (\`${role.name}\`)`, inline: true }
                );

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 15. ROLEREMOVE
    {
        name: 'roleremove',
        description: 'Removes a specific role from a member.',
        permissions: [PermissionFlagsBits.ManageRoles],
        options: [
            { name: 'user', description: 'Target subject member', type: 6, required: true },
            { name: 'role', description: 'Target role configuration reference key', type: 8, required: true }
        ],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            const role = parseTargetRole(context, context.isCommand?.() ? null : args.slice(1));
            if (!user || !role) return context.reply({ content: '❌ Missing functional arguments. Example template: `!roleremove @user @Role`', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            await member.roles.remove(role);
            
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Permissions Altered', execUser)
                .addFields(
                    { name: '👤 Targeted Member', value: `> ${user}`, inline: true },
                    { name: '🧬 Stripped Role Matrix', value: `> ${role} (\`${role.name}\`)`, inline: true }
                );

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 16. NICK
    {
        name: 'nick',
        description: 'Updates a target member\'s visible nickname.',
        permissions: [PermissionFlagsBits.ManageNicknames],
        options: [
            { name: 'user', description: 'Target member profile', type: 6, required: true },
            { name: 'name', description: 'New display nickname moniker format', type: 3, required: true }
        ],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            const newName = context.isCommand?.() ? context.options.getString('name') : args.slice(1).join(' ');
            if (!user || !newName) return context.reply({ content: '❌ Formatting requirement mapping issue. Usage: `!nick @user NewName`', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            await member.setNickname(newName);
            
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Identity Re-Mapped', execUser)
                .addFields(
                    { name: '👤 Client Identity', value: `> Member: ${user}`, inline: true },
                    { name: '✍️ Updated Nickname', value: `> Local Name: \`${newName}\``, inline: true }
                );

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 17. MUTE (Voice Node Mute)
    {
        name: 'mute',
        description: 'Mutes a member\'s voice connection.',
        permissions: [PermissionFlagsBits.MuteMembers],
        options: [{ name: 'user', description: 'Target member profile', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Target identity tracking entry missing.', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member || !member.voice.channel) return context.reply({ content: '❌ Target profile is not currently inside an active voice node.', ephemeral: true });

            await member.voice.setMute(true);
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Audio Node Kill', execUser)
                .addFields({ name: '🔇 Server Voice Mute', value: `> **Member:** ${user}\n> **Channel:** ${member.voice.channel}\n> **Status:** \`Transmission Silenced\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 18. UNMUTE (Voice Node Unmute)
    {
        name: 'unmute',
        description: 'Restores a user\'s ability to talk in voice channels.',
        permissions: [PermissionFlagsBits.MuteMembers],
        options: [{ name: 'user', description: 'Target member profile', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Identification query context empty.', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member || !member.voice.channel) return context.reply({ content: '❌ Target user is not currently inside a voice channel.', ephemeral: true });

            await member.voice.setMute(false);
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Audio Node Restored', execUser)
                .addFields({ name: '🔊 Server Voice Unmute', value: `> **Member:** ${user}\n> **Channel:** ${member.voice.channel}\n> **Status:** \`Microphone Online\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 19. DEAFEN
    {
        name: 'deafen',
        description: 'Blocks a user from hearing anything in voice channels.',
        permissions: [PermissionFlagsBits.DeafenMembers],
        options: [{ name: 'user', description: 'Target member profile', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Missing identification parameter fields.', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member || !member.voice.channel) return context.reply({ content: '❌ Target tracking record shows zero voice grid interactions.', ephemeral: true });

            await member.voice.setDeafen(true);
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Audio Isolation Applied', execUser)
                .addFields({ name: '🛑 Server Deafen', value: `> **Member:** ${user}\n> **Channel:** ${member.voice.channel}\n> **Status:** \`Audio Output Blocked\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 20. UNDEAFEN
    {
        name: 'undeafen',
        description: 'Restores hearing capabilities inside audio systems.',
        permissions: [PermissionFlagsBits.DeafenMembers],
        options: [{ name: 'user', description: 'Target member profile', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Account target search reference key empty.', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member || !member.voice.channel) return context.reply({ content: '❌ User is not present inside active audio streaming channels.', ephemeral: true });

            await member.voice.setDeafen(false);
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Audio Isolation Revoked', execUser)
                .addFields({ name: '🎧 Server Undeafen', value: `> **Member:** ${user}\n> **Channel:** ${member.voice.channel}\n> **Status:** \`Audio Output Active\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 21. VOICE KICK
    {
        name: 'voicekick',
        description: 'Force-disconnects a user out of their voice session.',
        permissions: [PermissionFlagsBits.MoveMembers],
        options: [{ name: 'user', description: 'Target user record alignment index', type: 6, required: true }],
        async run(context, args) {
            const user = await parseTargetUser(context, args);
            if (!user) return context.reply({ content: '❌ Identity pointer target null.', ephemeral: true });

            const member = await context.guild.members.fetch(user.id).catch(() => null);
            if (!member || !member.voice.channel) return context.reply({ content: '❌ Target user tracking register shows them as disconnected.', ephemeral: true });

            const currentVoiceChannel = member.voice.channel;
            await member.voice.disconnect();
            
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Voice Channel Eviction', execUser)
                .addFields({ name: '🔌 Stream Pipeline Terminated', value: `> **Evicted Member:** ${user}\n> **Dropped Node:** \`${currentVoiceChannel.name}\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 22. NUKE
    {
        name: 'nuke',
        description: 'Clones the channel to completely clear old data, links, and text structures.',
        permissions: [PermissionFlagsBits.Administrator],
        options: [],
        async run(context) {
            const currentPosition = context.channel.position;
            const reClonedChannel = await context.channel.clone();
            await context.channel.delete();
            await reClonedChannel.setPosition(currentPosition);

            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Node Blueprint Re-Cloned', execUser)
                .addFields({ name: '💥 Structural Refactor Wiped', value: `> **Channel Target:** \`#${reClonedChannel.name}\`\n> **Operation Ledger:** \`History dropped / Layout preserved\``, inline: false });

            return reClonedChannel.send({ embeds: [embed] });
        }
    },

    // 23. CHANNEL CREATE
    {
        name: 'channelcreate',
        description: 'Spawns a new standard text repository log channel block.',
        permissions: [PermissionFlagsBits.ManageChannels],
        options: [{ name: 'name', description: 'New channel name text label', type: 3, required: true }],
        async run(context, args) {
            const titleLabel = context.isCommand?.() ? context.options.getString('name') : args[0];
            if (!titleLabel) return context.reply({ content: '❌ Missing title string initialization variable.', ephemeral: true });

            const createdNode = await context.guild.channels.create({ name: titleLabel, type: ChannelType.GuildText });
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Structure Initialized', execUser)
                .addFields({ name: '📁 Node Provisioned', value: `> **Target Channel:** ${createdNode}\n> **Layout Scope:** \`GUILD_TEXT_CHANNEL\``, inline: false });

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 24. CHANNEL DELETE
    {
        name: 'channeldelete',
        description: 'Permanently deletes the channel workspace asset.',
        permissions: [PermissionFlagsBits.ManageChannels],
        options: [],
        async run(context) {
            const execUser = context.isCommand?.() ? context.user : context.author;
            const embed = createPremiumEmbed('Structure Wiped', execUser)
                .addFields({ name: '💥 Deletion Sequence Engaged', value: `> **Target Node Name:** \`#${context.channel.name}\`\n> Unlinking data matrices from structural tree...`, inline: false });

            await (context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
            return context.channel.delete();
        }
    },

    // 25. ROLE CREATE
    {
        name: 'rolecreate',
        description: 'Generates a blank base role layout frame.',
        permissions: [PermissionFlagsBits.ManageRoles],
        options: [
        {
            name: 'name',
            description: 'Label title string for the new role layout asset',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    async run(context, args) {
        const labelTitle = context.isCommand?.()
            ? context.options.getString('name')
            : args.join(' ');

        if (!labelTitle) {
            return context.reply({
                content: '❌ Title configuration definition parameters blank.',
                ephemeral: true
            });
        }

        const spawnedRole = await context.guild.roles.create({
            name: labelTitle,
            color: 0x5865F2
        });

        const execUser = context.isCommand?.()
            ? context.user
            : context.author;

        const embed = createPremiumEmbed('Security Role Generated', '', execUser)
            .addFields({
                name: '🎨 New Role Blueprint',
                value: `> **Role Entity:** ${spawnedRole}
> **Label Tag:** \`${spawnedRole.name}\`
> **ID Mapping:** \`${spawnedRole.id}\``,
                inline: false
            });

        return context.isCommand?.()
            ? context.reply({ embeds: [embed] })
            : context.channel.send({ embeds: [embed] });
    }
},

// 24. CHANNEL DELETE
{
    name: 'channeldelete',
    description: 'Permanently deletes the channel workspace asset.',
    permissions: [PermissionFlagsBits.ManageChannels],
    options: [],

    async run(context) {
        const isSlash = context.isCommand?.();
        const execUser = isSlash ? context.user : context.author;

        const embed = createPremiumEmbed(
            'Structure Wiped',
            `💥 **Deletion Sequence Engaged**

> **Target Node Name:** \`#${context.channel.name}\`
> Unlinking data matrices from structural tree...`,
            execUser
        );

        await (
            isSlash
                ? context.reply({ embeds: [embed] })
                : context.channel.send({ embeds: [embed] })
        );

        return context.channel.delete();
    }
},

// EMBED COMMAND
{
    name: 'embed',
    description: 'Sends a custom embed message.',
    permissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'color',
            description: 'Hex color (e.g. #ff0000)',
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'title',
            description: 'Embed title',
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'description',
            description: 'Embed description',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    async run(context, args) {
        const isSlash = context.isCommand?.();
        const author = isSlash ? context.user : context.author;

        let color, title, description;

        if (isSlash) {
            color = context.options.getString('color');
            title = context.options.getString('title');
            description = context.options.getString('description');
        } else {
            color = args?.[0];
            const parts = args.slice(1).join(' ').split('|');
            title = parts?.[0]?.trim();
            description = parts?.[1]?.trim();
        }

        if (!color || !title || !description) {
            return context.reply({
                content: '❌ Missing fields. Use `.embed <color> | <title> | <description>`',
                ephemeral: true
            });
        }

        let resolvedColor = parseInt(color.replace('#', ''), 16);
        if (isNaN(resolvedColor)) resolvedColor = 0x1A1C1E;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(resolvedColor)
            .setFooter({
                text: `Created by ${author.username}`,
                iconURL: author.displayAvatarURL({ size: 256 })
            })
            .setTimestamp();


        return isSlash
    ? context.reply({ embeds: [embed] })
    : context.channel.send({ embeds: [embed] });
    }
},

// SAY COMMAND
{
    name: 'say',
    description: 'Makes the bot send a message to the channel.',
    permissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'message',
            description: 'The message content to send',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    async run(context, args) {
        const isSlash = context.isCommand?.();
        const execUser = isSlash ? context.user : context.author;

        const messageContent = isSlash
            ? context.options.getString('message')
            : args.join(' ');

        if (!messageContent) {
            return context.reply({
                content: '❌ Please provide a message to send.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setDescription(messageContent)
            .setColor(0x5865F2)
            .setTimestamp();

        if (isSlash) {
            await context.reply({ content: '✅ Message sent.', ephemeral: true });
            return context.channel.send({ embeds: [embed] });
        } else {
            await context.delete().catch(() => {});
            return context.channel.send({ embeds: [embed] });
        }
    }
}
];
