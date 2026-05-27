/**
 * Nexora Premium-Tier Modular Moderation Engine Matrix
 * SLASH-ONLY VERSION (NO PREFIX SUPPORT)
 */

const {
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ApplicationCommandOptionType
} = require('discord.js');

// ==========================================
// PREMIUM EMBED CORE
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

const warningsDatabase = new Map();

module.exports = [

/* =========================
   1. KICK
========================= */
{
    name: 'kick',
    description: 'Evicts a target member from the server.',
    permissions: [PermissionFlagsBits.KickMembers],
    options: [
        { name: 'user', type: 6, description: 'Target user', required: true },
        { name: 'reason', type: 3, description: 'Reason', required: false }
    ],
    async run(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason specified';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
        if (!member.kickable) return interaction.reply({ content: 'Cannot kick this user.', ephemeral: true });

        await member.kick(reason);

        const embed = createPremiumEmbed('User Kicked', '', interaction.user)
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})` },
                { name: 'Reason', value: reason }
            );

        return interaction.reply({ embeds: [embed] });
    }
},

/* =========================
   2. BAN
========================= */
{
    name: 'ban',
    description: 'Bans a user.',
    permissions: [PermissionFlagsBits.BanMembers],
    options: [
        { name: 'user', type: 6, required: true },
        { name: 'reason', type: 3, required: false }
    ],
    async run(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason specified';

        await interaction.guild.members.ban(user.id, { reason });

        const embed = createPremiumEmbed('User Banned', '', interaction.user)
            .addFields(
                { name: 'User', value: `${user.tag}` },
                { name: 'Reason', value: reason }
            );

        return interaction.reply({ embeds: [embed] });
    }
},

/* =========================
   3. UNBAN
========================= */
{
    name: 'unban',
    description: 'Unbans a user ID.',
    permissions: [PermissionFlagsBits.BanMembers],
    options: [
        { name: 'user', type: 3, required: true }
    ],
    async run(interaction) {
        const id = interaction.options.getString('user');

        await interaction.guild.members.unban(id);

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Unbanned User', '', interaction.user)
                    .addFields({ name: 'User ID', value: id })
            ]
        });
    }
},

/* =========================
   4. TIMEOUT
========================= */
{
    name: 'timeout',
    description: 'Timeout a user.',
    permissions: [PermissionFlagsBits.ModerateMembers],
    options: [
        { name: 'user', type: 6, required: true },
        { name: 'minutes', type: 4, required: true }
    ],
    async run(interaction) {
        const user = interaction.options.getUser('user');
        const mins = interaction.options.getInteger('minutes');

        const member = await interaction.guild.members.fetch(user.id);
        await member.timeout(mins * 60000);

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Timed Out', '', interaction.user)
                    .addFields(
                        { name: 'User', value: user.tag },
                        { name: 'Duration', value: `${mins} min` }
                    )
            ]
        });
    }
},

/* =========================
   5. UNTIMEOUT
========================= */
{
    name: 'untimeout',
    description: 'Remove timeout.',
    permissions: [PermissionFlagsBits.ModerateMembers],
    options: [
        { name: 'user', type: 6, required: true }
    ],
    async run(interaction) {
        const user = interaction.options.getUser('user');

        const member = await interaction.guild.members.fetch(user.id);
        await member.timeout(null);

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Timeout Removed', '', interaction.user)
                    .addFields({ name: 'User', value: user.tag })
            ]
        });
    }
},

/* =========================
   6. WARN
========================= */
{
    name: 'warn',
    description: 'Warn a user.',
    permissions: [PermissionFlagsBits.ModerateMembers],
    options: [
        { name: 'user', type: 6, required: true },
        { name: 'reason', type: 3, required: true }
    ],
    async run(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        if (!warningsDatabase.has(user.id)) warningsDatabase.set(user.id, []);
        warningsDatabase.get(user.id).push(reason);

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Warn Issued', '', interaction.user)
                    .addFields(
                        { name: 'User', value: user.tag },
                        { name: 'Reason', value: reason },
                        { name: 'Total', value: `${warningsDatabase.get(user.id).length}` }
                    )
            ]
        });
    }
},

/* =========================
   7. CHECKWARNS
========================= */
{
    name: 'checkwarns',
    description: 'Check warnings.',
    permissions: [PermissionFlagsBits.ModerateMembers],
    options: [
        { name: 'user', type: 6, required: true }
    ],
    async run(interaction) {
        const user = interaction.options.getUser('user');
        const warns = warningsDatabase.get(user.id) || [];

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Warnings', '', interaction.user)
                    .setDescription(
                        warns.length
                            ? warns.map((w, i) => `${i + 1}. ${w}`).join('\n')
                            : 'No warnings'
                    )
            ]
        });
    }
},

/* =========================
   8. CLEARWARNS
========================= */
{
    name: 'clearwarns',
    description: 'Clear warnings.',
    permissions: [PermissionFlagsBits.ModerateMembers],
    options: [
        { name: 'user', type: 6, required: true }
    ],
    async run(interaction) {
        const user = interaction.options.getUser('user');
        warningsDatabase.delete(user.id);

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Warnings Cleared', '', interaction.user)
                    .addFields({ name: 'User', value: user.tag })
            ]
        });
    }
},

/* =========================
   9. PURGE
========================= */
{
    name: 'purge',
    description: 'Delete messages.',
    permissions: [PermissionFlagsBits.ManageMessages],
    options: [
        { name: 'amount', type: 4, required: true }
    ],
    async run(interaction) {
        const amount = interaction.options.getInteger('amount');

        const deleted = await interaction.channel.bulkDelete(amount, true);

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Purged Messages', '', interaction.user)
                    .addFields({ name: 'Deleted', value: `${deleted.size}` })
            ],
            ephemeral: true
        });
    }
},

/* =========================
   10. LOCK
========================= */
{
    name: 'lock',
    description: 'Lock channel.',
    permissions: [PermissionFlagsBits.ManageChannels],
    async run(interaction) {
        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            { SendMessages: false }
        );

        return interaction.reply({
            embeds: [createPremiumEmbed('Channel Locked', '', interaction.user)]
        });
    }
},

/* =========================
   11. UNLOCK
========================= */
{
    name: 'unlock',
    description: 'Unlock channel.',
    permissions: [PermissionFlagsBits.ManageChannels],
    async run(interaction) {
        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            { SendMessages: null }
        );

        return interaction.reply({
            embeds: [createPremiumEmbed('Channel Unlocked', '', interaction.user)]
        });
    }
},

/* =========================
   12. SLOWMODE
========================= */
{
    name: 'slowmode',
    description: 'Set slowmode.',
    permissions: [PermissionFlagsBits.ManageChannels],
    options: [
        { name: 'seconds', type: 4, required: true }
    ],
    async run(interaction) {
        const sec = interaction.options.getInteger('seconds');

        await interaction.channel.setRateLimitPerUser(sec);

        return interaction.reply({
            embeds: [
                createPremiumEmbed('Slowmode Set', '', interaction.user)
                    .addFields({ name: 'Seconds', value: `${sec}` })
            ]
        });
    }
}

];
