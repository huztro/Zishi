/**
 * Zishi Premium-Tier Dynamic Staff Application System
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Client Framework
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// Runtime memory databases for applications
const applicationsTemplates = new Map(); 
const activeCollectorUsers = new Set();  

module.exports = [
    // 1. CREATE APPLICATION
    {
        name: 'createapplication',
        description: 'Constructs a new staff application template dynamically via chat.',
        permissions: [PermissionFlagsBits.Administrator],
        options: [],
        async run(context) {
            const author = context.isCommand?.() ? context.user : context.author;
            const channel = context.channel;

            if (activeCollectorUsers.has(author.id)) {
                return context.reply({ content: '❌ You already have an active setup session running somewhere.', ephemeral: true });
            }

            activeCollectorUsers.add(author.id);
            if (context.isCommand?.()) await context.reply({ content: '🏗️ **Application Setup Initialized!** Look below.', ephemeral: true });

            try {
                const filter = m => m.author.id === author.id;

                // Step 1: Title
                await channel.send(`📝 **Step 1/3:** Please type the **Title** of your application (e.g., \`Staff Application\`).`);
                const collectedTitle = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
                const title = collectedTitle.first().content;

                // Step 2: Description
                await channel.send(`📄 **Step 2/3:** Please type the **Description / Instructions** for this application.`);
                const collectedDesc = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
                const description = collectedDesc.first().content;

                // Step 3: Questions
                await channel.send(`❓ **Step 3/3:** Please type exactly **5 questions**, separating each question with a vertical bar symbol ( \`|\` ).\n\n*Example:* \`How old are you? | Why do you want to join? | What is your timezone? | Any experience? | Why should we pick you?\``);
                const collectedQuestions = await channel.awaitMessages({ filter, max: 1, time: 120000, errors: ['time'] });
                const questionsArray = collectedQuestions.first().content.split('|').map(q => q.trim());

                if (questionsArray.length !== 5) {
                    activeCollectorUsers.delete(author.id);
                    return channel.send('❌ **Setup Failed:** You must provide exactly **5** questions separated by a `|`. Please run the command again.');
                }

                // Generate a random unique 6-digit template ID
                const appID = Math.floor(100000 + Math.random() * 900000).toString();

                applicationsTemplates.set(appID, {
                    title,
                    description,
                    questions: questionsArray,
                    createdBy: author.tag
                });

                activeCollectorUsers.delete(author.id);

                const successEmbed = new EmbedBuilder()
                    .setTitle('💎Template Registered')
                    .setColor(0x1A1C1E)
                    .addFields(
                        { name: '🆔 Unique Template ID', value: `> \`${appID}\``, inline: false },
                        { name: '📋 Application Title', value: `> ${title}`, inline: true },
                        { name: '👥 Created By', value: `> \`${author.tag}\``, inline: true },
                        { name: '🚀 How to Deploy', value: `> Use command: \`!sendapplication ${appID}\` or \`/sendapplication ${appID}\``, inline: false }
                    )
                    .setFooter({ text: `Authorized by ${author.username}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();

                return channel.send({ embeds: [successEmbed] });

            } catch (err) {
                activeCollectorUsers.delete(author.id);
                return channel.send('⏳ **Setup Timed Out:** You took too long to respond. Setup cancelled.');
            }
        }
    },

    // 2. SEND APPLICATION
    {
        name: 'sendapplication',
        description: 'Deploys a created application template card to the chat channel.',
        permissions: [PermissionFlagsBits.Administrator],
        options: [{ name: 'id', description: 'The unique 6-digit application template ID', type: 3, required: true }],
        async run(context, args) {
            const appID = context.isCommand?.() ? context.options.getString('id') : args[0];
            if (!appID) return context.reply({ content: '❌ Please specify the application template ID.', ephemeral: true });

            const template = applicationsTemplates.get(appID);
            if (!template) return context.reply({ content: '❌ No application template found matching that ID register.', ephemeral: true });

            const author = context.isCommand?.() ? context.user : context.author;
            const deployEmbed = new EmbedBuilder()
                .setTitle(`💎 Nexora Careers | ${template.title}`)
                .setDescription(`${template.description}\n\n💬 **Instructions:** To start filling out your answers, type:\n\`!apply ${appID}\``)
                .setColor(0x1A1C1E)
                .setFooter({ text: `Template ID: ${appID} | Managed by ${author.username}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            return context.isCommand?.() ? context.reply({ embeds: [deployEmbed] }) : context.channel.send({ embeds: [deployEmbed] });
        }
    },

    // 3. LIST APPLICATIONS
    {
        name: 'listapplications',
        description: 'Lists all available registered application template configurations.',
        permissions: [PermissionFlagsBits.ModerateMembers],
        options: [],
        async run(context) {
            const author = context.isCommand?.() ? context.user : context.author;

            if (applicationsTemplates.size === 0) {
                return context.reply({ content: '📂 **Database Empty:** No active application configurations found.', ephemeral: true });
            }

            let listString = '';
            applicationsTemplates.forEach((value, key) => {
                listString += `🆔 **ID:** \`${key}\` ➜ **Title:** \`${value.title}\` (By: ${value.createdBy})\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('💎 Nexora Matrix | Application Templates')
                .setDescription(listString)
                .setColor(0x1A1C1E)
                .setFooter({ text: `Authorized by ${author.username}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    },

    // 4. DELETE APPLICATION
    {
        name: 'deleteapplication',
        description: 'Removes an application template out of the database.',
        permissions: [PermissionFlagsBits.Administrator],
        options: [{ name: 'id', description: 'The unique 6-digit application template ID to destroy', type: 3, required: true }],
        async run(context, args) {
            const appID = context.isCommand?.() ? context.options.getString('id') : args[0];
            if (!appID) return context.reply({ content: '❌ Missing target configuration reference key.', ephemeral: true });

            if (!applicationsTemplates.has(appID)) {
                return context.reply({ content: '❌ Template ID does not match any current records.', ephemeral: true });
            }

            applicationsTemplates.delete(appID);
            const author = context.isCommand?.() ? context.user : context.author;
            
            const embed = new EmbedBuilder()
                .setTitle('💎 Nexora Matrix | Configuration Revoked')
                .setDescription(`> **Template ID:** \`${appID}\` was completely purged from database records.`)
                .setColor(0x1A1C1E)
                .setFooter({ text: `Cleared by ${author.username}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
        }
    }
];
