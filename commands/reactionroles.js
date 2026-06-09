/**
 * Zishi — Reaction Roles System
 * Commands:
 *   /rr create  <message_id> <emoji> <role>   — Bind a reaction→role on an existing message
 *   /rr remove  <message_id> <emoji>          — Remove a single reaction→role binding
 *   /rr list    <message_id>                  — List all bindings on a message
 *   /rr panel   <title> <description>         — Post a new reaction-role panel in this channel
 *   /rr clear   <message_id>                  — Remove ALL bindings from a message
 *   /rr info                                  — Show guild-wide reaction role stats
 *
 * Storage: data/reactionroles.json
 * Format : { "<guildId>": { "<messageId>": { "<emoji>": "<roleId>" } } }
 *
 * Reaction events (handleReactionAdd / handleReactionRemove) are called from index.js.
 */

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// DATABASE HELPERS
// ─────────────────────────────────────────────
const DB_PATH = path.join(__dirname, '../data/reactionroles.json');

function loadDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
}

/** Return the emoji key used for storage (normalise custom emojis to their ID). */
function emojiKey(emoji) {
    // Custom emoji: <:name:id> or <a:name:id>  →  store as "id"
    const match = emoji.match(/<a?:[^:]+:(\d+)>/);
    if (match) return match[1];
    // Unicode emoji — store as-is
    return emoji.trim();
}

// ─────────────────────────────────────────────
// SLASH COMMAND DEFINITION
// ─────────────────────────────────────────────
const data = new SlashCommandBuilder()
    .setName('rr')
    .setDescription('Reaction Roles — assign roles when members react to messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

    // /rr create
    .addSubcommand(sub =>
        sub.setName('create')
            .setDescription('Bind a reaction to a role on an existing message')
            .addStringOption(opt =>
                opt.setName('message_id')
                    .setDescription('ID of the target message')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('emoji')
                    .setDescription('Emoji to react with (unicode or custom)')
                    .setRequired(true)
            )
            .addRoleOption(opt =>
                opt.setName('role')
                    .setDescription('Role to assign when this emoji is reacted')
                    .setRequired(true)
            )
    )

    // /rr remove
    .addSubcommand(sub =>
        sub.setName('remove')
            .setDescription('Remove a single reaction→role binding from a message')
            .addStringOption(opt =>
                opt.setName('message_id')
                    .setDescription('ID of the target message')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('emoji')
                    .setDescription('Emoji binding to remove')
                    .setRequired(true)
            )
    )

    // /rr list
    .addSubcommand(sub =>
        sub.setName('list')
            .setDescription('List all reaction→role bindings on a message')
            .addStringOption(opt =>
                opt.setName('message_id')
                    .setDescription('ID of the target message')
                    .setRequired(true)
            )
    )

    // /rr panel
    .addSubcommand(sub =>
        sub.setName('panel')
            .setDescription('Post a new reaction-role panel message in this channel')
            .addStringOption(opt =>
                opt.setName('title')
                    .setDescription('Panel title')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('description')
                    .setDescription('Panel description (use \\n for new lines)')
                    .setRequired(true)
            )
    )

    // /rr clear
    .addSubcommand(sub =>
        sub.setName('clear')
            .setDescription('Remove ALL reaction→role bindings from a message')
            .addStringOption(opt =>
                opt.setName('message_id')
                    .setDescription('ID of the target message')
                    .setRequired(true)
            )
    )

    // /rr info
    .addSubcommand(sub =>
        sub.setName('info')
            .setDescription('Show reaction role stats for this server')
    );

// ─────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────
async function execute(interaction) {
    const sub      = interaction.options.getSubcommand();
    const guildId  = interaction.guild.id;
    const db       = loadDB();

    if (!db[guildId]) db[guildId] = {};

    // ── /rr create ──────────────────────────────
    if (sub === 'create') {
        const messageId = interaction.options.getString('message_id');
        const rawEmoji  = interaction.options.getString('emoji');
        const role      = interaction.options.getRole('role');
        const key       = emojiKey(rawEmoji);

        // Validate the message exists in this channel
        let targetMsg;
        try {
            targetMsg = await interaction.channel.messages.fetch(messageId);
        } catch {
            return interaction.reply({
                content: '❌ Could not find that message in **this channel**. Make sure you run this command in the same channel as the target message.',
                ephemeral: true
            });
        }

        // Guard: managed / bot roles
        if (role.managed || role.id === interaction.guild.id) {
            return interaction.reply({
                content: '❌ That role cannot be assigned (it is managed by an integration or is @everyone).',
                ephemeral: true
            });
        }

        // Guard: bot role hierarchy
        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: `❌ My highest role is below **${role.name}**. Move my role above it first.`,
                ephemeral: true
            });
        }

        if (!db[guildId][messageId]) db[guildId][messageId] = {};
        db[guildId][messageId][key] = role.id;
        saveDB(db);

        // Add the reaction to the message so users know what to click
        try {
            await targetMsg.react(rawEmoji);
        } catch {
            // Non-fatal — the binding is saved even if we can't react
        }

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('✅ Reaction Role Created')
                    .setColor(0x2ECC71)
                    .addFields(
                        { name: '📩 Message', value: `[Jump to message](${targetMsg.url})`, inline: true },
                        { name: '😀 Emoji',   value: rawEmoji,                              inline: true },
                        { name: '🎭 Role',    value: `${role}`,                             inline: true }
                    )
                    .setFooter({ text: 'Members who react will receive this role.' })
            ],
            ephemeral: true
        });
    }

    // ── /rr remove ──────────────────────────────
    if (sub === 'remove') {
        const messageId = interaction.options.getString('message_id');
        const rawEmoji  = interaction.options.getString('emoji');
        const key       = emojiKey(rawEmoji);

        if (!db[guildId][messageId] || !db[guildId][messageId][key]) {
            return interaction.reply({
                content: '❌ No binding found for that emoji on that message.',
                ephemeral: true
            });
        }

        delete db[guildId][messageId][key];
        if (Object.keys(db[guildId][messageId]).length === 0) {
            delete db[guildId][messageId];
        }
        saveDB(db);

        // Try to remove the bot's own reaction
        try {
            const ch  = interaction.channel;
            const msg = await ch.messages.fetch(messageId);
            const rxn = msg.reactions.cache.find(r => emojiKey(r.emoji.toString()) === key);
            if (rxn) await rxn.users.remove(interaction.client.user.id);
        } catch { /* non-fatal */ }

        return interaction.reply({
            content: `✅ Removed reaction role binding for ${rawEmoji} on message \`${messageId}\`.`,
            ephemeral: true
        });
    }

    // ── /rr list ────────────────────────────────
    if (sub === 'list') {
        const messageId = interaction.options.getString('message_id');
        const bindings  = db[guildId][messageId];

        if (!bindings || Object.keys(bindings).length === 0) {
            return interaction.reply({
                content: '❌ No reaction roles are configured for that message.',
                ephemeral: true
            });
        }

        const lines = Object.entries(bindings).map(([emoji, roleId]) => {
            const role = interaction.guild.roles.cache.get(roleId);
            const roleName = role ? `<@&${roleId}>` : `\`${roleId}\` *(deleted)*`;
            // Reconstruct display emoji: if it's a snowflake ID, it's a custom emoji
            const displayEmoji = /^\d+$/.test(emoji)
                ? (interaction.guild.emojis.cache.get(emoji)?.toString() ?? `\`:${emoji}:\``)
                : emoji;
            return `${displayEmoji} → ${roleName}`;
        });

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🎭 Reaction Roles — Message \`${messageId}\``)
                    .setDescription(lines.join('\n'))
                    .setColor(0x5865F2)
                    .setFooter({ text: `${lines.length} binding(s)` })
            ],
            ephemeral: true
        });
    }

    // ── /rr panel ───────────────────────────────
    if (sub === 'panel') {
        const title       = interaction.options.getString('title');
        const description = interaction.options.getString('description').replace(/\\n/g, '\n');

        const panelEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(0x5865F2)
            .setFooter({ text: 'React below to receive your roles!' })
            .setTimestamp();

        const panelMsg = await interaction.channel.send({ embeds: [panelEmbed] });

        // Initialise an empty binding entry so /rr create can target it
        db[guildId][panelMsg.id] = {};
        saveDB(db);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('✅ Panel Created')
                    .setColor(0x2ECC71)
                    .setDescription(
                        `Panel posted! Now use \`/rr create\` with message ID \`${panelMsg.id}\` to add reaction roles.\n\n` +
                        `[Jump to panel](${panelMsg.url})`
                    )
            ],
            ephemeral: true
        });
    }

    // ── /rr clear ───────────────────────────────
    if (sub === 'clear') {
        const messageId = interaction.options.getString('message_id');

        if (!db[guildId][messageId] || Object.keys(db[guildId][messageId]).length === 0) {
            return interaction.reply({
                content: '❌ No reaction roles found for that message.',
                ephemeral: true
            });
        }

        const count = Object.keys(db[guildId][messageId]).length;
        delete db[guildId][messageId];
        saveDB(db);

        // Remove all bot reactions from the message
        try {
            const msg = await interaction.channel.messages.fetch(messageId);
            await msg.reactions.removeAll();
        } catch { /* non-fatal */ }

        return interaction.reply({
            content: `✅ Cleared **${count}** reaction role binding(s) from message \`${messageId}\`.`,
            ephemeral: true
        });
    }

    // ── /rr info ────────────────────────────────
    if (sub === 'info') {
        const guildData  = db[guildId] || {};
        const msgCount   = Object.keys(guildData).length;
        const totalBinds = Object.values(guildData).reduce((acc, m) => acc + Object.keys(m).length, 0);

        const lines = Object.entries(guildData)
            .filter(([, binds]) => Object.keys(binds).length > 0)
            .map(([msgId, binds]) => `\`${msgId}\` — ${Object.keys(binds).length} binding(s)`);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📊 Reaction Roles — Server Stats')
                    .setColor(0x5865F2)
                    .addFields(
                        { name: '📩 Messages with RR', value: `\`${msgCount}\``,   inline: true },
                        { name: '🔗 Total Bindings',   value: `\`${totalBinds}\``, inline: true }
                    )
                    .setDescription(lines.length ? lines.join('\n') : '*No reaction roles configured yet.*')
                    .setFooter({ text: 'Use /rr create to add reaction roles.' })
            ],
            ephemeral: true
        });
    }
}

// ─────────────────────────────────────────────
// REACTION EVENT HANDLERS  (called from index.js)
// ─────────────────────────────────────────────

/**
 * Called on messageReactionAdd.
 * Assigns the bound role to the reacting member.
 */
async function handleReactionAdd(reaction, user) {
    if (user.bot) return;
    if (!reaction.message.guild) return;

    // Fetch partial reaction / message if needed
    if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
        try { await reaction.message.fetch(); } catch { return; }
    }

    const guildId   = reaction.message.guild.id;
    const messageId = reaction.message.id;
    const db        = loadDB();

    const bindings = db[guildId]?.[messageId];
    if (!bindings) return;

    const key    = emojiKey(reaction.emoji.toString());
    const roleId = bindings[key];
    if (!roleId) return;

    try {
        const member = await reaction.message.guild.members.fetch(user.id);
        if (!member.roles.cache.has(roleId)) {
            await member.roles.add(roleId, 'Reaction Role');
        }
    } catch (err) {
        console.warn(`[ReactionRoles] Could not add role ${roleId} to ${user.tag}: ${err.message}`);
    }
}

/**
 * Called on messageReactionRemove.
 * Removes the bound role from the member.
 */
async function handleReactionRemove(reaction, user) {
    if (user.bot) return;
    if (!reaction.message.guild) return;

    if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
        try { await reaction.message.fetch(); } catch { return; }
    }

    const guildId   = reaction.message.guild.id;
    const messageId = reaction.message.id;
    const db        = loadDB();

    const bindings = db[guildId]?.[messageId];
    if (!bindings) return;

    const key    = emojiKey(reaction.emoji.toString());
    const roleId = bindings[key];
    if (!roleId) return;

    try {
        const member = await reaction.message.guild.members.fetch(user.id);
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId, 'Reaction Role removed');
        }
    } catch (err) {
        console.warn(`[ReactionRoles] Could not remove role ${roleId} from ${user.tag}: ${err.message}`);
    }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
    data,
    execute,
    handleReactionAdd,
    handleReactionRemove
};
