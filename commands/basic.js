/**
 * Nexora Premium Basic Utilities Subsystem (5 Master Commands)
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Client Framework
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// Helper to build the uniform premium dark-mode embed design matching Capture.PNG
function createPremiumEmbed(title, description, executioner) {
    return new EmbedBuilder()
        .setTitle(`💎 ${title}`)
        .setDescription(description)
        .setColor(0x1A1C1E) // Premium dark background color
        .setFooter({ 
            text: `Action by ${executioner.username}`, 
            iconURL: executioner.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
}

// Unified target user lookup helper supporting both text mentions and slash options
async function parseTargetUser(interactionOrMsg, args) {
    if (interactionOrMsg.isCommand?.()) return interactionOrMsg.options.getUser('user');
    if (interactionOrMsg.mentions.users.first()) return interactionOrMsg.mentions.users.first();
    if (args && args[0]) {
        try { return await interactionOrMsg.client.users.fetch(args[0]); } catch { return null; }
    }
    return null;
}

module.exports = [
    // 1. AVATAR
    {
        name: 'avatar',
        description: 'Displays the target user\'s profile avatar image with download links.',
        options: [{ name: 'user', description: 'The user whose avatar you want to see', type: 6, required: false }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const target = await parseTargetUser(context, args) || (isSlash ? context.user : context.author);
            const author = isSlash ? context.user : context.author;

            const avatarPng = target.displayAvatarURL({ extension: 'png', size: 2048 });
            const avatarJpeg = target.displayAvatarURL({ extension: 'jpeg', size: 2048 });
            const avatarWebp = target.displayAvatarURL({ extension: 'webp', size: 2048 });

            const embed = createPremiumEmbed('User Avatar Profile', `✨ **Full resolution image render for** ${target}\n\n🔗 **Download Formats:**\n> [[PNG](${avatarPng})] • [[JPEG](${avatarJpeg})] • [[WEBP](${avatarWebp})]`, author)
                .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }));

            return isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 2. SERVER INFO (Aliases: serverinfo, si)
    {
        name: 'serverinfo',
        description: 'Displays deep technical layout statistics for the current server.',
        options: [],
        async run(context) {
            const isSlash = context.isCommand?.();
            const guild = context.guild;
            const author = isSlash ? context.user : context.author;

            // Fetch guild owner identity safely
            const owner = await guild.fetchOwner();
            const totalMembers = guild.memberCount;
            const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
            const totalRoles = guild.roles.cache.size;
            const boostCount = guild.premiumSubscriptionCount || 0;

            const embed = createPremiumEmbed('Server Architecture Info', '', author)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
                .addFields(
                    { name: '🏢 Guild Properties', value: `> **Name:** ${guild.name}\n> **ID:** \`${guild.id}\`\n> **Owner:** ${owner} (\`${owner.user.tag}\`)`, inline: false },
                    { name: '👥 Network Demographics', value: `> **Total Members:** \`${totalMembers.toLocaleString()}\`\n> **Roles:** \`${totalRoles}\` roles`, inline: true },
                    { name: '📡 Channel Layout', value: `> **Text Nodes:** \`${textChannels}\` \n> **Voice Streams:** \`${voiceChannels}\``, inline: true },
                    { name: '🚀 Server Power Boosts', value: `> **Boost Count:** \`${boostCount}\` Boosts\n> **Tier Level:** \`Tier ${guild.premiumTier}\``, inline: false }
                );

            return isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 2.1 SERVER INFO SHORT ALIAS (si)
    {
        name: 'si',
        description: 'Alias shortcut for the serverinfo command.',
        options: [],
        async run(context) {
            const serverinfoCommand = module.exports.find(cmd => cmd.name === 'serverinfo');
            return serverinfoCommand.run(context, null);
        }
    },

    // 3. USER INFO (Aliases: userinfo, ui)
    {
        name: 'userinfo',
        description: 'Returns granular profile registration metadata metrics for a user.',
        options: [{ name: 'user', description: 'The member whose profile stats you want to view', type: 6, required: false }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const target = await parseTargetUser(context, args) || (isSlash ? context.user : context.author);
            const author = isSlash ? context.user : context.author;

            const member = await context.guild.members.fetch(target.id).catch(() => null);
            if (!member) {
                return context.reply({ content: '❌ **Lookup Error:** Profile does not exist inside this server guild context.', ephemeral: true });
            }

            const joinedTimestamp = Math.floor(member.joinedTimestamp / 1000);
            const createdTimestamp = Math.floor(target.createdTimestamp / 1000);
            const rolesList = member.roles.cache
                .filter(role => role.id !== context.guild.roles.everyone.id)
                .map(role => role.toString())
                .join(', ') || 'None';

            const embed = createPremiumEmbed('User Metadata Profile', '', author)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
                .addFields(
                    { name: '👤 Identity Profile', value: `> **Mention:** ${target}\n> **Tag:** \`${target.tag}\`\n> **ID:** \`${target.id}\``, inline: false },
                    { name: '⏳ Platform Milestones', value: `> **Created Account:** <t:${createdTimestamp}:R> (<t:${createdTimestamp}:f>)\n> **Joined Server:** <t:${joinedTimestamp}:R> (<t:${joinedTimestamp}:f>)`, inline: false },
                    { name: '🛡️ Local Guild Privileges', value: `> **Top Role:** ${member.roles.highest}\n> **Roles:** ${rolesList}`, inline: false }
                );

            return isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 3.1 USER INFO SHORT ALIAS (ui)
    {
        name: 'ui',
        description: 'Alias shortcut for the userinfo command.',
        options: [{ name: 'user', description: 'The member whose profile stats you want to view', type: 6, required: false }],
        async run(context, args) {
            const userinfoCommand = module.exports.find(cmd => cmd.name === 'userinfo');
            return userinfoCommand.run(context, args);
        }
    },

    // 4. SAY (Echo message)
    {
        name: 'say',
        description: 'Echoes a plain text message through the bot.',
        options: [{ name: 'message', description: 'The text message you want the bot to say', type: 3, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const rawMessage = isSlash ? context.options.getString('message') : args?.join(' ');

            if (!rawMessage) {
                return context.reply({ content: '❌ **Input Error:** Please specify a text message sequence.', ephemeral: true });
            }

            // If prefix, delete the author's trigger message to make it clean
            if (!isSlash) {
                await context.delete().catch(() => {});
            }

            return isSlash ? context.reply({ content: rawMessage }) : context.channel.send({ content: rawMessage });
        }
    },

    // 5. EMBED (Send custom stylized embed cards)
    {
        name: 'embed',
        description: 'Sends a custom stylized embed card with your chosen color, title, and description.',
        options: [
            { name: 'color', description: 'Hex code color (e.g. #FF0000)', type: 3, required: true },
            { name: 'title', description: 'The title header of the card', type: 3, required: true },
            { name: 'description', description: 'The main body text of the card', type: 3, required: true }
        ],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = isSlash ? context.user : context.author;

            let colorHex, title, description;
            if (isSlash) {
                colorHex = context.options.getString('color');
                title = context.options.getString('title');
                description = context.options.getString('description');
            } else {
                colorHex = args?.[0];
                // For prefix parsing: !embed <color> | <title> | <description>
                const textArgs = args?.slice(1).join(' ').split('|');
                title = textArgs?.[0]?.trim();
                description = textArgs?.[1]?.trim();
            }

            if (!colorHex || !title || !description) {
                const errorHelp = '❌ **Format Error:** Use the proper format:\n> Prefix: `.embed <hex_color> | <title> | <description>`\n> Slash: `/embed color:<hex_color> title:<title> description:<description>`';
                return isSlash ? context.reply({ content: errorHelp, ephemeral: true }) : context.reply(errorHelp);
            }

            // Parse hex color safely, fallback to default if invalid
            let resolvedColor = parseInt(colorHex.replace('#', ''), 16);
            if (isNaN(resolvedColor)) resolvedColor = 0x1A1C1E;

            const customEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(resolvedColor)
                .setFooter({ 
                    text: `Card created by ${author.username}`, 
                    iconURL: author.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            // If prefix, delete the trigger message
            if (!isSlash) {
                await context.delete().catch(() => {});
            }

            return isSlash ? context.reply({ embeds: [customEmbed] }) : context.channel.send({ embeds: [customEmbed] });
        }
    }
];
