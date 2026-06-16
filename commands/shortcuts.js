/**
 * Zishi — Shortcuts & Utility Commands
 * Handles: !i, !mc, !addbot, !ss, !supportserver, !owner, !ping, !uptime, !status
 * All commands work as prefix commands. Slash equivalents are registered in index.js.
 */

const { EmbedBuilder } = require('discord.js');

const SUPPORT_SERVER = 'https://dsc.gg/froststar';
const OWNER_ID = process.env.OWNER_ID || ''; // Set in .env
const OWNER_TAG = '@ItzHuzaifa';

// ==========================================
// HELPER: Format uptime from milliseconds
// ==========================================
function formatUptime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days    = Math.floor(totalSeconds / 86400);
    const hours   = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days)    parts.push(`${days}d`);
    if (hours)   parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

// ==========================================
// HANDLER
// Called from index.js messageCreate with (message, commandName, args, client, startTime)
// Returns true if the command was handled, false otherwise.
// ==========================================
async function handleShortcut(message, commandName, args, client, startTime) {

    // ---- !i  (alias for !invites) ----
    // Handled by re-routing commandName — invitesModule.handlePrefix picks it up
    if (commandName === 'i') {
        const { handlePrefix: invitesHandlePrefix } = require('./invites.js');
        await invitesHandlePrefix(message, 'invites', args);
        return true;
    }

    // ---- !mc  (alias for !membercount) ----
    if (commandName === 'mc') {
        const membercountCmd = client.commands?.get('membercount');
        if (membercountCmd) {
            await membercountCmd.run(message, args);
        } else {
            // Fallback inline implementation
            const embed = new EmbedBuilder()
                .setTitle('👥 Member Count')
                .setColor(0x00FFCC)
                .addFields(
                    { name: '👤 Total Members', value: `\`${message.guild.memberCount.toLocaleString()}\``, inline: true },
                    { name: '🤖 Bots', value: `\`${message.guild.members.cache.filter(m => m.user.bot).size.toLocaleString()}\``, inline: true },
                    { name: '🧑 Humans', value: `\`${message.guild.members.cache.filter(m => !m.user.bot).size.toLocaleString()}\``, inline: true }
                )
                .setTimestamp();
            await message.channel.send({ embeds: [embed] });
        }
        return true;
    }

    // ---- !addbot  (bot invite link) ----
    if (commandName === 'addbot') {
        const clientId = client.user.id;
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot+applications.commands`;

        const embed = new EmbedBuilder()
            .setTitle('🔗 Invite Zishi')
            .setDescription(
                `Add **Zishi** to your server and unlock powerful moderation, economy, leveling, and more!\n\n` +
                `**[➕ Click Here to Invite](${inviteUrl})**`
            )
            .setColor(0x5865F2)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Zishi Bot • Made by @ItzHuzaifa' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !ss / !supportserver  (support server link) ----
    if (commandName === 'ss' || commandName === 'supportserver') {
        const embed = new EmbedBuilder()
            .setTitle('🌟 Zishi Support Server')
            .setDescription(
                `Need help? Have a suggestion? Join our support server!\n\n` +
                `**[🔗 Join Here](${SUPPORT_SERVER})**\n\n` +
                `> Get help with setup\n` +
                `> Report bugs & suggest features\n` +
                `> Stay updated on new releases`
            )
            .setColor(0x2ECC71)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Zishi Bot • Support Server' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !owner  (owner info) ----
    if (commandName === 'owner') {
        let ownerUser = null;
        if (OWNER_ID) {
            ownerUser = await client.users.fetch(OWNER_ID).catch(() => null);
        }

        const embed = new EmbedBuilder()
            .setTitle('👑 Bot Owner')
            .setDescription(
                `**Zishi** was created and is maintained by **${OWNER_TAG}**.\n\n` +
                `> 🛠️ Developer & Designer\n` +
                `> 💡 Feature Requests: Join the [Support Server](${SUPPORT_SERVER})\n` +
                `> 🐛 Bug Reports: [Support Server](${SUPPORT_SERVER})`
            )
            .setColor(0xFFD700)
            .setTimestamp();

        if (ownerUser) {
            embed
                .setThumbnail(ownerUser.displayAvatarURL({ size: 256 }))
                .addFields({ name: '🔖 Discord Tag', value: `\`${ownerUser.tag}\``, inline: true });
        }

        embed.setFooter({ text: 'Zishi Bot • Made with ❤️' });

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !ping ----
    if (commandName === 'ping') {
        const sent = await message.channel.send('🏓 Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(
            `🏓 **Pong!**\n` +
            `📡 API Latency: \`${client.ws.ping}ms\`\n` +
            `⚡ Message Latency: \`${latency}ms\``
        );
        return true;
    }

    // ---- !uptime ----
    if (commandName === 'uptime') {
        const uptime = formatUptime(Date.now() - startTime);
        const embed = new EmbedBuilder()
            .setTitle('⏳ Bot Uptime')
            .setDescription(`**Zishi** has been online for:\n\`\`\`${uptime}\`\`\``)
            .setColor(0x00FFCC)
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
        return true;
    }

    // ---- !status ----
    if (commandName === 'status') {
        const totalSeconds = (Date.now() - startTime) / 1000;
        const days    = Math.floor(totalSeconds / 86400);
        const hours   = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const uptime  = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Status')
            .setColor(0x00FFCC)
            .addFields(
                { name: '📡 Ping',    value: `\`${client.ws.ping}ms\``,                                    inline: true },
                { name: '⏳ Uptime',  value: `\`${uptime}\``,                                              inline: true },
                { name: '💾 RAM',     value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
                { name: '🏢 Guilds',  value: `\`${client.guilds.cache.size}\``,                            inline: true },
                { name: '👥 Users',   value: `\`${client.users.cache.size}\``,                             inline: true }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        return true;
    }

    return false; // Command not handled here
}

module.exports = { handleShortcut, formatUptime };
