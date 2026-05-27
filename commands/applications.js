/**
 * PREMIUM APPLICATION SYSTEM
 * FULL SLASH COMMAND VERSION
 */

const {
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SlashCommandBuilder
} = require('discord.js');

// Runtime DB
global.applicationsTemplates =
    global.applicationsTemplates || new Map();

const applicationsTemplates =
    global.applicationsTemplates;

module.exports = [

    // ==================================================
    // CREATE APPLICATION
    // ==================================================
    {
        data: new SlashCommandBuilder()
            .setName('createapplication')
            .setDescription(
                'Create a premium application template.'
            )
            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )
            .addStringOption(option =>
                option
                    .setName('title')
                    .setDescription(
                        'Application title'
                    )
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('description')
                    .setDescription(
                        'Application description'
                    )
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('question1')
                    .setDescription('Question 1')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('question2')
                    .setDescription('Question 2')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('question3')
                    .setDescription('Question 3')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('question4')
                    .setDescription('Question 4')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('question5')
                    .setDescription('Question 5')
                    .setRequired(true)
            ),

        async run(interaction) {

            const title =
                interaction.options.getString('title');

            const description =
                interaction.options.getString(
                    'description'
                );

            const questions = [
                interaction.options.getString(
                    'question1'
                ),
                interaction.options.getString(
                    'question2'
                ),
                interaction.options.getString(
                    'question3'
                ),
                interaction.options.getString(
                    'question4'
                ),
                interaction.options.getString(
                    'question5'
                )
            ];

            const appID = Math.floor(
                100000 + Math.random() * 900000
            ).toString();

            applicationsTemplates.set(appID, {
                title,
                description,
                questions
            });

            const embed = new EmbedBuilder()
                .setColor('#111111')
                .setTitle('✅ Application Created')
                .setDescription(
                    `Application ID: \`${appID}\`\n\nUse:\n\`/sendapplication id:${appID}\``
                )
                .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }
    },

    // ==================================================
    // SEND APPLICATION
    // ==================================================
    {
        data: new SlashCommandBuilder()
            .setName('sendapplication')
            .setDescription(
                'Send application embed.'
            )
            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription(
                        'Application ID'
                    )
                    .setRequired(true)
            ),

        async run(interaction) {

            const appID =
                interaction.options.getString('id');

            const template =
                applicationsTemplates.get(appID);

            if (!template) {
                return interaction.reply({
                    content:
                        '❌ Invalid application ID.',
                    ephemeral: true
                });
            }

            // BUTTON
            const row =
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`apply_${appID}`)
                        .setLabel('Apply Now')
                        .setEmoji('📋')
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

            // EMBED
            const embed = new EmbedBuilder()
                .setColor('#111111')
                .setTitle(template.title)
                .setDescription(
                    template.description
                )
                .addFields({
                    name: '📌 Application',
                    value:
                        'Click the button below to apply.'
                })
                .setFooter({
                    text: `Application ID: ${appID}`
                })
                .setTimestamp();

            await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({
                content:
                    '✅ Application panel sent.',
                ephemeral: true
            });
        }
    }
];
