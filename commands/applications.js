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

// =========================
// BUTTON HANDLER
// Called from index.js for all button interactions
// Handles: apply_<appID> buttons
// =========================
async function handleApplicationButton(interaction) {
    const { customId } = interaction;

    // Only handle apply_<appID> buttons — not apply_staff_giveaway or other reserved IDs
    if (!customId.startsWith('apply_')) return false;
    if (customId === 'apply_staff_giveaway') return false;

    const appID = customId.replace('apply_', '');
    const template = applicationsTemplates.get(appID);

    if (!template) {
        return interaction.reply({
            content: '❌ This application template no longer exists.',
            ephemeral: true
        });
    }

    // Build a modal with up to 5 questions (Discord modals support max 5 components)
    const modal = new ModalBuilder()
        .setCustomId(`app_modal_${appID}`)
        .setTitle(template.title.slice(0, 45)); // Discord title max 45 chars

    const questions = template.questions.slice(0, 5);
    for (let i = 0; i < questions.length; i++) {
        const input = new TextInputBuilder()
            .setCustomId(`app_q${i}`)
            .setLabel(questions[i].slice(0, 45))
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
    }

    return interaction.showModal(modal);
}

// =========================
// MODAL HANDLER
// Called from index.js for all modal submissions
// Handles: app_modal_<appID> submissions
// =========================
async function handleApplicationModal(interaction) {
    if (!interaction.customId.startsWith('app_modal_')) return false;

    const appID = interaction.customId.replace('app_modal_', '');
    const template = applicationsTemplates.get(appID);

    const answers = [];
    const questions = template ? template.questions.slice(0, 5) : [];
    for (let i = 0; i < questions.length; i++) {
        try {
            answers.push(interaction.fields.getTextInputValue(`app_q${i}`));
        } catch {
            answers.push('*(no answer)*');
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`📋 New Application — ${template ? template.title : 'Unknown'}`)
        .setColor(0x5865F2)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '👤 Applicant', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: false },
            ...questions.map((q, i) => ({
                name: `❓ ${q.slice(0, 256)}`,
                value: answers[i] || '*(no answer)*',
                inline: false
            }))
        )
        .setTimestamp();

    // Try to find an applications or staff log channel
    const logChannel = interaction.guild.channels.cache.find(
        c => c.name.includes('application') ||
             c.name.includes('staff-log') ||
             c.name.includes('mod-log')
    );

    if (logChannel) {
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    return interaction.reply({
        content: '✅ Your application has been submitted! The team will review it shortly.',
        ephemeral: true
    });
}

const applicationCommands = [

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

module.exports = {
    commands: applicationCommands,
    handleApplicationButton,
    handleApplicationModal
};
