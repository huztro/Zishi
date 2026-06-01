/**
 * Autoresponder System
 * Automatically replies to configured keyword triggers in messages.
 * Configurable per guild via slash commands.
 * Supports exact match and contains match modes.
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

// =========================
// SETTINGS HELPERS
// =========================
function ensureAutoresponderSettings(settings) {
    if (typeof settings.autoresponder !== 'boolean') settings.autoresponder = false;
    if (!Array.isArray(settings.autoresponders)) settings.autoresponders = [];
    return settings;
}

// =========================
// MESSAGE HANDLER
// Called from index.js on every messageCreate
// =========================
async function handleAutoresponder(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const settings = ensureAutoresponderSettings(getSettings(message.guild.id));

    if (!settings.autoresponder) return;
    if (!settings.autoresponders.length) return;

    const lower = message.content.toLowerCase();

    for (const entry of settings.autoresponders) {
        const trigger = entry.trigger.toLowerCase();
        const matched = entry.exact
            ? lower === trigger
            : lower.includes(trigger);

        if (matched) {
            await message.channel.send(entry.response).catch(() => {});
            // Only fire the first matching trigger to avoid spam
            break;
        }
    }
}

// =========================
// SLASH COMMAND MODULE
// =========================
module.exports = {

    handleAutoresponder,

    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Manage the autoresponder system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Add a new autoresponder trigger.')
                .addStringOption(opt =>
                    opt.setName('trigger')
                        .setDescription('The keyword or phrase to trigger on')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('response')
                        .setDescription('The message the bot will reply with')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('match')
                        .setDescription('Match mode: "contains" (default) or "exact"')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Contains (default)', value: 'contains' },
                            { name: 'Exact match', value: 'exact' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Remove an autoresponder trigger.')
                .addStringOption(opt =>
                    opt.setName('trigger')
                        .setDescription('The trigger keyword to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription('List all autoresponder triggers for this server.')
        )
        .addSubcommand(sub =>
            sub
                .setName('toggle')
                .setDescription('Enable or disable the autoresponder system.')
                .addStringOption(opt =>
                    opt.setName('state')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('clear')
                .setDescription('Remove all autoresponder triggers for this server.')
        ),

    async execute(interaction) {

        const sub = interaction.options.getSubcommand();
        const settings = ensureAutoresponderSettings(getSettings(interaction.guild.id));

        // ---- TOGGLE ----
        if (sub === 'toggle') {
            const state = interaction.options.getString('state');
            settings.autoresponder = state === 'enable';
            saveSettings(interaction.guild.id, settings);

            return interaction.reply({
                content: `✅ Autoresponder has been **${state === 'enable' ? 'enabled' : 'disabled'}**.`,
                ephemeral: true
            });
        }

        // ---- ADD ----
        if (sub === 'add') {
            const trigger = interaction.options.getString('trigger');
            const response = interaction.options.getString('response');
            const matchMode = interaction.options.getString('match') || 'contains';

            // Check for duplicate trigger
            const exists = settings.autoresponders.some(
                e => e.trigger.toLowerCase() === trigger.toLowerCase()
            );

            if (exists) {
                return interaction.reply({
                    content: `❌ A trigger for \`${trigger}\` already exists. Remove it first with \`/autoresponder remove\`.`,
                    ephemeral: true
                });
            }

            if (settings.autoresponders.length >= 50) {
                return interaction.reply({
                    content: '❌ You have reached the maximum of 50 autoresponder triggers.',
                    ephemeral: true
                });
            }

            settings.autoresponders.push({
                trigger,
                response,
                exact: matchMode === 'exact'
            });

            saveSettings(interaction.guild.id, settings);

            const embed = new EmbedBuilder()
                .setTitle('✅ Autoresponder Added')
                .setColor(0x2ECC71)
                .addFields(
                    { name: '🔑 Trigger', value: `\`${trigger}\``, inline: true },
                    { name: '📝 Response', value: response.length > 200 ? response.slice(0, 200) + '...' : response, inline: false },
                    { name: '🔍 Match Mode', value: matchMode === 'exact' ? 'Exact match' : 'Contains', inline: true }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ---- REMOVE ----
        if (sub === 'remove') {
            const trigger = interaction.options.getString('trigger');
            const before = settings.autoresponders.length;

            settings.autoresponders = settings.autoresponders.filter(
                e => e.trigger.toLowerCase() !== trigger.toLowerCase()
            );

            if (settings.autoresponders.length === before) {
                return interaction.reply({
                    content: `❌ No trigger found for \`${trigger}\`.`,
                    ephemeral: true
                });
            }

            saveSettings(interaction.guild.id, settings);

            return interaction.reply({
                content: `✅ Removed autoresponder trigger: \`${trigger}\``,
                ephemeral: true
            });
        }

        // ---- LIST ----
        if (sub === 'list') {
            const list = settings.autoresponders;

            if (list.length === 0) {
                return interaction.reply({
                    content: '📭 No autoresponder triggers configured. Use `/autoresponder add` to create one.',
                    ephemeral: true
                });
            }

            const lines = list.map((e, i) => {
                const mode = e.exact ? '`exact`' : '`contains`';
                const preview = e.response.length > 60 ? e.response.slice(0, 60) + '...' : e.response;
                return `**${i + 1}.** \`${e.trigger}\` → ${preview} *(${mode})*`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`🤖 Autoresponder Triggers — ${interaction.guild.name}`)
                .setDescription(lines.join('\n'))
                .setColor(0x3498DB)
                .setFooter({
                    text: `${list.length}/50 triggers configured • System: ${settings.autoresponder ? '✅ Enabled' : '❌ Disabled'}`
                })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ---- CLEAR ----
        if (sub === 'clear') {
            settings.autoresponders = [];
            saveSettings(interaction.guild.id, settings);

            return interaction.reply({
                content: '✅ All autoresponder triggers have been cleared.',
                ephemeral: true
            });
        }
    }
};
