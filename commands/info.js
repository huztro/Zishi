/**
 * Zishi — Info & Utility Aliases
 * Commands: !i (invites), !mc (membercount), !invite (bot invite),
 *           !ss / !supportserver (support server), !owner (owner info)
 * All with professional embeds.
 */

const { EmbedBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

// Invite data helpers (mirrors invites.js storage)
const INVITE_DB_PATH = path.join(__dirname, '../data/invites.json');

function getInviteData() {
    try {
        return JSON.parse(fs.readFileSync(INVITE_DB_PATH, 'utf8'));
    } catch {
        return {};
    }
}

// ==========================================
// CONSTANTS
// ==========================================
const SUPPORT_SERVER   = 'https://dsc.gg/froststar';
const OWNER_TAG        = '@ItzHuzaifa';
const OWNER_ID         = '1063765297321816064'; // Update if needed — used for mention

// ==========================================
// HANDLER
// Called from index.js prefix router.
// Returns true if the command was handled, false otherwise.
// ==========================================
async function handleInfoCommand(message, commandName, args, client) {

    // ---- !i  (invite stats alias) ----
    if (commandName === 'i') {
        const targetUser = message.mentions.users.first() || message.author;

        const db        = getInviteData();
        const guildData = db[message.guild.id] || {};
        const stats     = guildData[targetUser.id] || { regular: 0, bonus: 0, leaves: 0 };

        const regular = stats.regular || 0;
        const bonus   = stats.bonus   || 0;
        const leaves  = stats.leaves  || 0;
        const total   = regular + bonus - leaves;

        const embed = new EmbedBuilder()
            .setTitle(`📨 Invite Stats — ${targetUser.username}`)
            .setColor(0x3498DB)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🟢 Joined',      value: `\`${regular}\` users`,        inline: true },
                { name: '🔴 Left',        value: `\`${leaves}\` users`,         inline: true },
                { name: '✨ Bonus',       value: `\`${bonus}\` granted`,        inline: true },
                { name: '📊 Net Invites', value: `\`${total}\` valid invites`,  inline: false }
            )
            .setFooter({ text: 'Zishi | Invite Stats' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !mc  (membercount alias) ----
    if (commandName === 'mc') {
        const guild = message.guild;
        await guild.members.fetch().catch(() => {});

        const total   = guild.memberCount;
        const bots    = guild.members.cache.filter(m => m.user.bot).size;
        const humans  = total - bots;

        const embed = new EmbedBuilder()
            .setTitle(`👥 Member Count — ${guild.name}`)
            .setColor(0x00FFCC)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Humans',  value: `\`${humans.toLocaleString()}\``,  inline: true },
                { name: '🤖 Bots',    value: `\`${bots.toLocaleString()}\``,    inline: true },
                { name: '📊 Total',   value: `\`${total.toLocaleString()}\``,   inline: true }
            )
            .setFooter({ text: 'Zishi | Member Count' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !invite  (bot invite link) ----
    if (commandName === 'invite') {
        const botId      = client.user.id;
        const inviteLink = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot+applications.commands`;

        const embed = new EmbedBuilder()
            .setTitle('🔗 Invite Zishi to Your Server')
            .setColor(0x5865F2)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setDescription(
                `Click the link below to add **Zishi** to your server with full permissions.\n\n` +
                `> **[➕ Invite Zishi](${inviteLink})**\n\n` +
                `Zishi brings moderation, economy, leveling, giveaways, AutoMod, and much more to your community.`
            )
            .setFooter({ text: 'Zishi | Bot Invite' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !ss / !supportserver ----
    if (commandName === 'ss' || commandName === 'supportserver') {
        const embed = new EmbedBuilder()
            .setTitle('🌐 Zishi Support Server')
            .setColor(0x2ECC71)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setDescription(
                `Need help? Join our official support server!\n\n` +
                `> **[🚀 Join Support Server](${SUPPORT_SERVER})**\n\n` +
                `Get help with setup, report bugs, suggest features, and stay updated on new releases.`
            )
            .setFooter({ text: 'Zishi | Support Server' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !owner ----
    if (commandName === 'owner') {
        let ownerUser = null;
        try {
            ownerUser = await client.users.fetch(OWNER_ID);
        } catch {
            // Fallback if ID is wrong or user not found
        }

        const embed = new EmbedBuilder()
            .setTitle('👑 Bot Owner')
            .setColor(0xFFD700)
            .setDescription(
                `**Zishi** was created and is maintained by its owner.\n\n` +
                `> **Discord:** ${OWNER_TAG}\n` +
                (ownerUser ? `> **Mention:** ${ownerUser}\n` : '') +
                `\n` +
                `For inquiries, join the [Support Server](${SUPPORT_SERVER}).`
            )
            .setFooter({ text: 'Zishi | Owner Info' })
            .setTimestamp();

        if (ownerUser) {
            embed.setThumbnail(ownerUser.displayAvatarURL({ dynamic: true, size: 256 }));
        }

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    return false;
}

module.exports = { handleInfoCommand };
