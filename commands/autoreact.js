const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require('discord.js');

const {
    getSettings,
    saveSettings
} = require('../utils/settings');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('autoreact')
        .setDescription('Manage autoreact')

        .addSubcommand(sub =>
            sub
                .setName('enable')
                .setDescription('Enable autoreact')
        )

        .addSubcommand(sub =>
            sub
                .setName('disable')
                .setDescription('Disable autoreact')
        )

        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Add autoreact')

                .addStringOption(opt =>
                    opt
                        .setName('message')
                        .setDescription('Trigger message')
                        .setRequired(true)
                )

                .addStringOption(opt =>
                    opt
                        .setName('emoji')
                        .setDescription('Emoji')
                        .setRequired(true)
                )
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        const settings =
            getSettings(interaction.guild.id);

        const sub =
            interaction.options.getSubcommand();

        if (sub === 'enable') {

            settings.autoreact = true;

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                '✅ Autoreact enabled.'
            );
        }

        if (sub === 'disable') {

            settings.autoreact = false;

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                '❌ Autoreact disabled.'
            );
        }

        if (sub === 'add') {

            const message =
                interaction.options.getString('message');

            const emoji =
                interaction.options.getString('emoji');

            settings.autoreacts.push({
                trigger: message.toLowerCase(),
                emoji
            });

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                `✅ Autoreact added.\nTrigger: \`${message}\`\nEmoji: ${emoji}`
            );
        }
    }
};
