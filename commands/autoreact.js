/**
 * Zishi — AutoReact System
 * Reacts to keyword triggers in messages with configured emojis.
 * Fully independent from AutoMod.
 * Configurable per guild via slash commands.
 */

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

const {
    getSettings,
    saveSettings
} = require('../utils/settings');

// ==========================================
// ENSURE AUTOREACT SETTINGS EXIST
// ==========================================
function ensureAutoreactSettings(settings) {
    if (typeof settings.autoreact !== 'boolean') settings.autoreact = false;
    if (!Array.isArray(settings.autoreacts)) settings.autoreacts = [];
    return settings;
}

// ==========================================
// AUTOREACT MESSAGE HANDLER
// Called from index.js on every messageCreate
// ==========================================
async function handleAutoReact(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const settings = ensureAutoreactSettings(getSettings(message.guild.id));

    if (!settings.autoreact) return;
    if (!settings.autoreacts.length) return;

    const lower = message.content.toLowerCase();

    for (const react of settings.autoreacts) {
        if (lower.includes(react.trigger.toLowerCase())) {
            await message.react(react.emoji).catch(() => {});
        }
    }
}

// ==========================================
// SLASH COMMAND: /autoreact
// ==========================================
module.exports = {

    handleAutoReact,

    data: new SlashCommandBuilder()
        .setName('autoreact')
        .setDescription('Manage the AutoReact system')

        .addSubcommand(sub =>
            sub
                .setName('enable')
                .setDescription('Enable AutoReact for this server')
        )

        .addSubcommand(sub =>
            sub
                .setName('disable')
                .setDescription('Disable AutoReact for this server')
        )

        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Add a keyword → emoji autoreact trigger')
                .addStringOption(opt =>
                    opt
                        .setName('trigger')
                        .setDescription('Keyword to react to')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('emoji')
                        .setDescription('Emoji to react with')
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Remove an autoreact trigger')
                .addStringOption(opt =>
                    opt
                        .setName('trigger')
                        .setDescription('Trigger keyword to remove')
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription('List all autoreact triggers')
        )

        .addSubcommand(sub =>
            sub
                .setName('status')
                .setDescription('View AutoReact status')
        )

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const settings = ensureAutoreactSettings(getSettings(interaction.guild.id));
        const sub = interaction.options.getSubcommand();

        // ==========================================
        // ENABLE
        // ==========================================
        if (sub === 'enable') {
            settings.autoreact = true;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply('✅ AutoReact **enabled**.');
        }

        // ==========================================
        // DISABLE
        // ==========================================
        if (sub === 'disable') {
            settings.autoreact = false;
            saveSettings(interaction.guild.id, settings);
            return interaction.reply('❌ AutoReact **disabled**.');
        }

        // ==========================================
        // ADD
        // ==========================================
        if (sub === 'add') {
            const trigger = interaction.options.getString('trigger').toLowerCase();
            const emoji = interaction.options.getString('emoji');

            const existing = settings.autoreacts.findIndex(r => r.trigger === trigger);
            if (existing >= 0) {
                settings.autoreacts[existing].emoji = emoji;
                saveSettings(interaction.guild.id, settings);
                return interaction.reply(`✅ Updated autoreact: \`${trigger}\` → ${emoji}`);
            }

            settings.autoreacts.push({ trigger, emoji });
            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Autoreact added: \`${trigger}\` → ${emoji}`);
        }

        // ==========================================
        // REMOVE
        // ==========================================
        if (sub === 'remove') {
            const trigger = interaction.options.getString('trigger').toLowerCase();
            const before = settings.autoreacts.length;
            settings.autoreacts = settings.autoreacts.filter(r => r.trigger !== trigger);

            if (settings.autoreacts.length === before) {
                return interaction.reply(`❌ No autoreact found for trigger: \`${trigger}\``);
            }

            saveSettings(interaction.guild.id, settings);
            return interaction.reply(`✅ Removed autoreact trigger: \`${trigger}\``);
        }

        // ==========================================
        // LIST
        // ==========================================
        if (sub === 'list') {
            const embed = new EmbedBuilder()
                .setTitle('😄 AutoReact Triggers')
                .setColor(0x00FFCC)
                .setDescription(
                    settings.autoreacts.length
                        ? settings.autoreacts.map(r => `\`${r.trigger}\` → ${r.emoji}`).join('\n')
                        : 'No autoreact triggers configured.\nUse `/autoreact add` to add one.'
                );
            return interaction.reply({ embeds: [embed] });
        }

        // ==========================================
        // STATUS
        // ==========================================
        if (sub === 'status') {
            const embed = new EmbedBuilder()
                .setTitle('😄 AutoReact Status')
                .setColor(settings.autoreact ? 0x2ECC71 : 0xE74C3C)
                .addFields(
                    {
                        name: '⚡ Status',
                        value: settings.autoreact ? '✅ Enabled' : '❌ Disabled',
                        inline: true
                    },
                    {
                        name: '🔢 Triggers',
                        value: `\`${settings.autoreacts.length}\``,
                        inline: true
                    }
                );
            return interaction.reply({ embeds: [embed] });
        }
    }
};
