/**
 * PREMIUM APPLICATION SYSTEM
 * BUTTON + MODAL VERSION
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
    ChannelType
} = require('discord.js');

// Runtime DB
global.applicationsTemplates = global.applicationsTemplates || new Map();

const applicationsTemplates = global.applicationsTemplates;
const activeCollectorUsers = new Set();

module.exports = [

    // ==================================================
    // CREATE APPLICATION
    // ==================================================
    {
        name: 'createapplication',
        description: 'Create a premium application template.',
        permissions: [PermissionFlagsBits.Administrator],

        async run(context) {

            const author = context.isCommand?.()
                ? context.user
                : context.author;

            const channel = context.channel;

            if (activeCollectorUsers.has(author.id)) {
                return context.reply({
                    content: '❌ You already have an active setup.',
                    ephemeral: true
                });
            }

            activeCollectorUsers.add(author.id);

            try {

                const filter = m => m.author.id === author.id;

                // TITLE
                await channel.send('📝 Send application title.');

                const titleCollected = await channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 60000
                });

                const title = titleCollected.first().content;

                // DESCRIPTION
                await channel.send('📄 Send application description.');

                const descCollected = await channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 60000
                });

                const description = descCollected.first().content;

                // QUESTIONS
                await channel.send(
                    '❓ Send 5 questions separated with `|`'
                );

                const qCollected = await channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 120000
                });

                const questions = qCollected.first().content
                    .split('|')
                    .map(q => q.trim());

                if (questions.length !== 5) {
                    activeCollectorUsers.delete(author.id);

                    return channel.send(
                        '❌ You must provide exactly 5 questions.'
                    );
                }

                const appID = Math.floor(
                    100000 + Math.random() * 900000
                ).toString();

                applicationsTemplates.set(appID, {
                    title,
                    description,
                    questions
                });

                activeCollectorUsers.delete(author.id);

                const embed = new EmbedBuilder()
                    .setColor('#111111')
                    .setTitle('✅ Application Created')
                    .setDescription(
                        `Application ID: \`${appID}\`\n\nUse:\n\`!sendapplication ${appID}\``
                    );

                return channel.send({ embeds: [embed] });

            } catch (err) {

                activeCollectorUsers.delete(author.id);

                return channel.send(
                    '❌ Setup timed out.'
                );
            }
        }
    },

    // ==================================================
    // SEND APPLICATION
    // ==================================================
    {
        name: 'sendapplication',
        description: 'Send application embed.',
        permissions: [PermissionFlagsBits.Administrator],

        options: [
            {
                name: 'id',
                description: 'Application ID',
                type: 3,
                required: true
            }
        ],

        async run(context, args) {

            const appID = context.isCommand?.()
                ? context.options.getString('id')
                : args[0];

            if (!appID) {
                return context.reply({
                    content: '❌ Provide app ID.',
                    ephemeral: true
                });
            }

            const template = applicationsTemplates.get(appID);

            if (!template) {
                return context.reply({
                    content: '❌ Invalid application ID.',
                    ephemeral: true
                });
            }

            // BUTTON
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`apply_${appID}`)
                    .setLabel('Apply Now')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary)
            );

            // EMBED
            const embed = new EmbedBuilder()
                .setColor('#111111')
                .setTitle(template.title)
                .setDescription(template.description)
                .addFields({
                    name: '📌 Application',
                    value: 'Click the button below to apply.'
                })
                .setFooter({
                    text: `Application ID: ${appID}`
                })
                .setTimestamp();

            return context.channel.send({
                embeds: [embed],
                components: [row]
            });
        }
    }
];
