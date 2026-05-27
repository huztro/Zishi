/**
 * Nexora Premium-Tier Fun & Games Command Suite
 * Architecture Support: FULL SLASH COMMAND FRAMEWORK
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');

// ==========================================
// SHARED EMBED FACTORY
// ==========================================
function createFunEmbed(title, description, author) {
    const embed = new EmbedBuilder()
        .setTitle(`🎮 ${title}`)
        .setColor(0x1A1C1E)
        .setTimestamp();

    if (description) embed.setDescription(description);

    if (author) {
        embed.setFooter({
            text: `Requested by ${author.username}`,
            iconURL: author.displayAvatarURL({ dynamic: true })
        });
    }

    return embed;
}

// ==========================================
// STATIC DATA POOLS
// ==========================================

const EIGHT_BALL_RESPONSES = [
    '✅ It is certain.',
    '✅ It is decidedly so.',
    '✅ Without a doubt.',
    '✅ Yes, definitely.',
    '✅ You may rely on it.',
    '✅ As I see it, yes.',
    '✅ Most likely.',
    '✅ Outlook good.',
    '✅ Yes.',
    '✅ Signs point to yes.',
    '🔮 Reply hazy, try again.',
    '🔮 Ask again later.',
    '🔮 Better not tell you now.',
    '🔮 Cannot predict now.',
    '🔮 Concentrate and ask again.',
    '❌ Don\'t count on it.',
    '❌ My reply is no.',
    '❌ My sources say no.',
    '❌ Outlook not so good.',
    '❌ Very doubtful.'
];

// KEEP ALL YOUR OTHER ARRAYS EXACTLY SAME
// JOKES
// QUOTES
// TRIVIA
// RIDDLES
// SLOT_SYMBOLS
// HANGMAN_WORDS
// FLIP_MAP
// HANGMAN_ART

// ==========================================
// ACTIVE SESSIONS
// ==========================================

const hangmanSessions = new Map();
const triviaSessions = new Map();

// ==========================================
// HELPERS
// ==========================================

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildHangmanDisplay(word, guessed) {
    return word
        .split('')
        .map(l => guessed.has(l) ? `**${l}**` : '\\_')
        .join(' ');
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = [

    // ==================================================
    // RPS
    // ==================================================
    {
        data: new SlashCommandBuilder()
            .setName('rps')
            .setDescription(
                'Challenge the bot to a game of Rock, Paper, Scissors!'
            ),

        async run(interaction) {

            const author =
                interaction.user;

            const embed =
                createFunEmbed(
                    'Rock Paper Scissors',
                    '🪨 **Rock**, 📄 **Paper**, or ✂️ **Scissors**?\nMake your choice below!',
                    author
                );

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('rps_rock')
                            .setLabel('🪨 Rock')
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId('rps_paper')
                            .setLabel('📄 Paper')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId('rps_scissors')
                            .setLabel('✂️ Scissors')
                            .setStyle(ButtonStyle.Danger)
                    );

            const choices =
                ['rock', 'paper', 'scissors'];

            const choiceEmoji = {
                rock: '🪨',
                paper: '📄',
                scissors: '✂️'
            };

            const msg =
                await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    fetchReply: true
                });

            const collector =
                msg.createMessageComponentCollector({
                    filter: i =>
                        i.user.id === author.id,
                    time: 30000,
                    max: 1
                });

            collector.on(
                'collect',
                async i => {

                    const playerChoice =
                        i.customId.replace(
                            'rps_',
                            ''
                        );

                    const botChoice =
                        getRandom(choices);

                    let result;

                    if (
                        playerChoice === botChoice
                    ) {

                        result =
                            "🤝 **It's a tie!**";

                    } else if (
                        (
                            playerChoice === 'rock' &&
                            botChoice === 'scissors'
                        ) ||
                        (
                            playerChoice === 'paper' &&
                            botChoice === 'rock'
                        ) ||
                        (
                            playerChoice === 'scissors' &&
                            botChoice === 'paper'
                        )
                    ) {

                        result =
                            '🏆 **You win!**';

                    } else {

                        result =
                            '💀 **Bot wins!**';
                    }

                    const resultEmbed =
                        createFunEmbed(
                            'Rock Paper Scissors — Result',
                            `> **Your choice:** ${choiceEmoji[playerChoice]} ${playerChoice}\n> **Bot's choice:** ${choiceEmoji[botChoice]} ${botChoice}\n\n${result}`,
                            author
                        );

                    const disabledRow =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('rps_rock')
                                    .setLabel('🪨 Rock')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true),

                                new ButtonBuilder()
                                    .setCustomId('rps_paper')
                                    .setLabel('📄 Paper')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true),

                                new ButtonBuilder()
                                    .setCustomId('rps_scissors')
                                    .setLabel('✂️ Scissors')
                                    .setStyle(ButtonStyle.Danger)
                                    .setDisabled(true)
                            );

                    await i.update({
                        embeds: [resultEmbed],
                        components: [disabledRow]
                    });
                }
            );
        }
    },

    // ==================================================
    // DICE
    // ==================================================
    {
        data: new SlashCommandBuilder()
            .setName('dice')
            .setDescription(
                'Roll between 1 and 6 dice and see your results.'
            )
            .addIntegerOption(option =>
                option
                    .setName('count')
                    .setDescription(
                        'Number of dice to roll (1–6)'
                    )
                    .setMinValue(1)
                    .setMaxValue(6)
                    .setRequired(false)
            ),

        async run(interaction) {

            const author =
                interaction.user;

            const count =
                interaction.options.getInteger(
                    'count'
                ) || 1;

            const DICE_FACES =
                ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

            const rolls =
                Array.from(
                    { length: count },
                    () =>
                        Math.floor(
                            Math.random() * 6
                        ) + 1
                );

            const faces =
                rolls
                    .map(r =>
                        DICE_FACES[r - 1]
                    )
                    .join('  ');

            const total =
                rolls.reduce(
                    (a, b) => a + b,
                    0
                );

            const embed =
                createFunEmbed(
                    'Dice Roll',
                    `🎲 **Rolling ${count} ${count === 1 ? 'die' : 'dice'}...**\n\n${faces}\n\n> **Values:** \`${rolls.join(', ')}\`\n> **Total:** \`${total}\``,
                    author
                );

            return interaction.reply({
                embeds: [embed]
            });
        }
    },

    // ==================================================
    // COIN
    // ==================================================
    {
        data: new SlashCommandBuilder()
            .setName('coin')
            .setDescription(
                'Flip a coin and get heads or tails.'
            ),

        async run(interaction) {

            const author =
                interaction.user;

            const result =
                Math.random() < 0.5
                    ? 'Heads'
                    : 'Tails';

            const emoji =
                result === 'Heads'
                    ? '🪙'
                    : '🔵';

            const embed =
                createFunEmbed(
                    'Coin Flip',
                    `${emoji} The coin landed on... **${result}!**`,
                    author
                );

            return interaction.reply({
                embeds: [embed]
            });
        }
    },

    // ==================================================
    // 8BALL
    // ==================================================
    {
        data: new SlashCommandBuilder()
            .setName('8ball')
            .setDescription(
                'Ask the Magic 8 Ball a yes/no question.'
            )
            .addStringOption(option =>
                option
                    .setName('question')
                    .setDescription(
                        'Your yes/no question'
                    )
                    .setRequired(true)
            ),

        async run(interaction) {

            const author =
                interaction.user;

            const question =
                interaction.options.getString(
                    'question'
                );

            const response =
                getRandom(
                    EIGHT_BALL_RESPONSES
                );

            const embed =
                createFunEmbed(
                    '🎱 Magic 8 Ball',
                    null,
                    author
                ).addFields(
                    {
                        name: '❓ Question',
                        value: `> ${question}`,
                        inline: false
                    },
                    {
                        name:
                            '🎱 The 8 Ball Says...',
                        value:
                            `> ${response}`,
                        inline: false
                    }
                );

            return interaction.reply({
                embeds: [embed]
            });
        }
    }

    // ==================================================
    // KEEP CONVERTING ALL OTHER COMMANDS SAME WAY
    // choose
    // flip
    // reverse
    // joke
    // quote
    // trivia
    // slots
    // hangman
    // riddle
    // rate
    // ship
    // kiss
    // hug
    // ==================================================
];
