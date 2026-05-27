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
        .setName('automod')
        .setDescription('Manage automod')

        .addSubcommand(sub =>
            sub
                .setName('enable')
                .setDescription('Enable automod')
        )

        .addSubcommand(sub =>
            sub
                .setName('disable')
                .setDescription('Disable automod')
        )

        .addSubcommand(sub =>
            sub
                .setName('badwords-add')
                .setDescription('Add badword')
                .addStringOption(opt =>
                    opt
                        .setName('word')
                        .setDescription('Word')
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

            settings.automod = true;

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                '✅ Automod enabled.'
            );
        }

        if (sub === 'disable') {

            settings.automod = false;

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                '❌ Automod disabled.'
            );
        }

        if (sub === 'badwords-add') {

            const word =
                interaction.options.getString('word');

            settings.badwords.push(word);

            saveSettings(
                interaction.guild.id,
                settings
            );

            return interaction.reply(
                `✅ Added badword: \`${word}\``
            );
        }
    }
};
