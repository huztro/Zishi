/**
 * Nexora Premium-Tier Fun & Games Command Suite
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Client Framework
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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

const JOKES = [
    { setup: 'Why don\'t scientists trust atoms?', punchline: 'Because they make up everything!' },
    { setup: 'Why did the scarecrow win an award?', punchline: 'Because he was outstanding in his field!' },
    { setup: 'I told my wife she was drawing her eyebrows too high.', punchline: 'She looked surprised.' },
    { setup: 'What do you call a fake noodle?', punchline: 'An impasta!' },
    { setup: 'Why can\'t you give Elsa a balloon?', punchline: 'Because she\'ll let it go!' },
    { setup: 'What do you call cheese that isn\'t yours?', punchline: 'Nacho cheese!' },
    { setup: 'Why did the bicycle fall over?', punchline: 'Because it was two-tired!' },
    { setup: 'What do you call a sleeping dinosaur?', punchline: 'A dino-snore!' },
    { setup: 'Why don\'t eggs tell jokes?', punchline: 'They\'d crack each other up!' },
    { setup: 'What do you call a fish without eyes?', punchline: 'A fsh!' },
    { setup: 'Why did the math book look so sad?', punchline: 'Because it had too many problems.' },
    { setup: 'What do you call a bear with no teeth?', punchline: 'A gummy bear!' },
    { setup: 'Why did the golfer bring an extra pair of pants?', punchline: 'In case he got a hole in one!' },
    { setup: 'What do you call a lazy kangaroo?', punchline: 'A pouch potato!' },
    { setup: 'Why did the tomato turn red?', punchline: 'Because it saw the salad dressing!' }
];

const QUOTES = [
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
    { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
    { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
    { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
    { text: 'Spread love everywhere you go. Let no one ever come to you without leaving happier.', author: 'Mother Teresa' },
    { text: 'When you reach the end of your rope, tie a knot in it and hang on.', author: 'Franklin D. Roosevelt' },
    { text: 'Always remember that you are absolutely unique. Just like everyone else.', author: 'Margaret Mead' },
    { text: 'Do not go where the path may lead, go instead where there is no path and leave a trail.', author: 'Ralph Waldo Emerson' },
    { text: 'You will face many defeats in life, but never let yourself be defeated.', author: 'Maya Angelou' },
    { text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela' },
    { text: 'In the end, it\'s not the years in your life that count. It\'s the life in your years.', author: 'Abraham Lincoln' },
    { text: 'Never let the fear of striking out keep you from playing the game.', author: 'Babe Ruth' },
    { text: 'Life is either a daring adventure or nothing at all.', author: 'Helen Keller' },
    { text: 'Many of life\'s failures are people who did not realize how close they were to success when they gave up.', author: 'Thomas A. Edison' }
];

const TRIVIA = [
    { question: 'What is the capital of Australia?', answer: 'Canberra', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'] },
    { question: 'How many sides does a hexagon have?', answer: '6', options: ['5', '6', '7', '8'] },
    { question: 'What is the chemical symbol for gold?', answer: 'Au', options: ['Go', 'Gd', 'Au', 'Ag'] },
    { question: 'Which planet is known as the Red Planet?', answer: 'Mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
    { question: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello'] },
    { question: 'What is the largest ocean on Earth?', answer: 'Pacific Ocean', options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'] },
    { question: 'In what year did World War II end?', answer: '1945', options: ['1943', '1944', '1945', '1946'] },
    { question: 'What is the hardest natural substance on Earth?', answer: 'Diamond', options: ['Gold', 'Iron', 'Diamond', 'Quartz'] },
    { question: 'How many bones are in the adult human body?', answer: '206', options: ['196', '206', '216', '226'] },
    { question: 'What language has the most native speakers in the world?', answer: 'Mandarin Chinese', options: ['English', 'Spanish', 'Hindi', 'Mandarin Chinese'] }
];

const RIDDLES = [
    { question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', answer: 'An echo' },
    { question: 'The more you take, the more you leave behind. What am I?', answer: 'Footsteps' },
    { question: 'I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. What am I?', answer: 'A map' },
    { question: 'What has hands but can\'t clap?', answer: 'A clock' },
    { question: 'What gets wetter the more it dries?', answer: 'A towel' },
    { question: 'I\'m light as a feather, yet the strongest man can\'t hold me for more than a few minutes. What am I?', answer: 'Breath' },
    { question: 'What has a head and a tail but no body?', answer: 'A coin' },
    { question: 'The more you have of it, the less you see. What is it?', answer: 'Darkness' },
    { question: 'What can travel around the world while staying in a corner?', answer: 'A stamp' },
    { question: 'I have branches, but no fruit, trunk, or leaves. What am I?', answer: 'A bank' }
];

const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];

const HANGMAN_WORDS = [
    'javascript', 'discord', 'programming', 'keyboard', 'monitor', 'algorithm',
    'database', 'network', 'server', 'client', 'function', 'variable',
    'interface', 'framework', 'library', 'module', 'component', 'developer',
    'software', 'hardware', 'internet', 'browser', 'protocol', 'security'
];

const FLIP_MAP = {
    a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ',
    i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd',
    q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x',
    y: 'ʎ', z: 'z', A: '∀', B: 'q', C: 'Ɔ', D: 'p', E: 'Ǝ', F: 'Ⅎ',
    G: 'פ', H: 'H', I: 'I', J: 'ɾ', K: 'ʞ', L: '˥', M: 'W', N: 'N',
    O: 'O', P: 'd', Q: 'Q', R: 'ɹ', S: 'S', T: '┴', U: '∩', V: 'Λ',
    W: 'M', X: 'X', Y: '⅄', Z: 'Z', '0': '0', '1': 'Ɩ', '2': 'ᄅ',
    '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'L', '8': '8',
    '9': '6', '.': '˙', ',': '\'', '\'': ',', '!': '¡', '?': '¿',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{',
    '<': '>', '>': '<', '&': '⅋', '_': '‾'
};

// Active hangman sessions: Map<channelId, { word, guessed, wrong, maxWrong }>
const hangmanSessions = new Map();

// Active trivia sessions: Map<channelId, { answer, timeout }>
const triviaSessions = new Map();

// ==========================================
// HELPER UTILITIES
// ==========================================
function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getAuthor(context) {
    return context.isCommand?.() ? context.user : context.author;
}

function sendReply(context, payload) {
    return context.isCommand?.()
        ? context.reply(payload)
        : context.channel.send(payload);
}

function buildHangmanDisplay(word, guessed) {
    return word.split('').map(l => (guessed.has(l) ? `**${l}**` : '\\_')).join(' ');
}

const HANGMAN_ART = [
    '```\n  +---+\n      |\n      |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n      |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n  |   |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|   |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n /    |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n      |\n      |\n=========```'
];

// ==========================================
// COMMAND EXPORTS
// ==========================================
module.exports = [

    // 1. RPS — Rock Paper Scissors with button interactions
    {
        name: 'rps',
        description: 'Challenge the bot to a game of Rock, Paper, Scissors!',
        options: [],
        async run(context) {
            const author = getAuthor(context);

            const embed = createFunEmbed('Rock Paper Scissors', '🪨 **Rock**, 📄 **Paper**, or ✂️ **Scissors**?\nMake your choice below!', author);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Danger)
            );

            const choices = ['rock', 'paper', 'scissors'];
            const choiceEmoji = { rock: '🪨', paper: '📄', scissors: '✂️' };

            const msg = await (context.isCommand?.()
                ? context.reply({ embeds: [embed], components: [row], fetchReply: true })
                : context.channel.send({ embeds: [embed], components: [row] }));

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === author.id,
                time: 30000,
                max: 1
            });

            collector.on('collect', async i => {
                const playerChoice = i.customId.replace('rps_', '');
                const botChoice = getRandom(choices);

                let result;
                if (playerChoice === botChoice) {
                    result = "🤝 **It's a tie!**";
                } else if (
                    (playerChoice === 'rock' && botChoice === 'scissors') ||
                    (playerChoice === 'paper' && botChoice === 'rock') ||
                    (playerChoice === 'scissors' && botChoice === 'paper')
                ) {
                    result = '🏆 **You win!**';
                } else {
                    result = '💀 **Bot wins!**';
                }

                const resultEmbed = createFunEmbed('Rock Paper Scissors — Result',
                    `> **Your choice:** ${choiceEmoji[playerChoice]} ${playerChoice}\n> **Bot's choice:** ${choiceEmoji[botChoice]} ${botChoice}\n\n${result}`,
                    author
                );

                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Danger).setDisabled(true)
                );

                await i.update({ embeds: [resultEmbed], components: [disabledRow] });
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    const timeoutEmbed = createFunEmbed('Rock Paper Scissors', '⏰ **Time\'s up!** You didn\'t make a choice in time.', author);
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Primary).setDisabled(true),
                        new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Danger).setDisabled(true)
                    );
                    msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
                }
            });
        }
    },

    // 2. DICE — Roll 1–6 dice
    {
        name: 'dice',
        description: 'Roll between 1 and 6 dice and see your results.',
        options: [{ name: 'count', description: 'Number of dice to roll (1–6)', type: 4, required: false }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            let count = isSlash
                ? (context.options.getInteger('count') ?? 1)
                : (parseInt(args?.[0], 10) || 1);

            if (count < 1 || count > 6) {
                return sendReply(context, { content: '❌ Please specify between **1** and **6** dice.', ephemeral: true });
            }

            const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
            const faces = rolls.map(r => DICE_FACES[r - 1]).join('  ');
            const total = rolls.reduce((a, b) => a + b, 0);

            const embed = createFunEmbed('Dice Roll',
                `🎲 **Rolling ${count} ${count === 1 ? 'die' : 'dice'}...**\n\n${faces}\n\n> **Values:** \`${rolls.join(', ')}\`\n> **Total:** \`${total}\``,
                author
            );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 3. COIN — Flip a coin
    {
        name: 'coin',
        description: 'Flip a coin and get heads or tails.',
        options: [],
        async run(context) {
            const author = getAuthor(context);
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
            const emoji = result === 'Heads' ? '🪙' : '🔵';

            const embed = createFunEmbed('Coin Flip',
                `${emoji} The coin landed on... **${result}!**`,
                author
            );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 4. 8BALL — Magic 8 ball
    {
        name: '8ball',
        description: 'Ask the Magic 8 Ball a yes/no question.',
        options: [{ name: 'question', description: 'Your yes/no question', type: 3, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            const question = isSlash
                ? context.options.getString('question')
                : args?.join(' ');

            if (!question) {
                return sendReply(context, { content: '❌ Please provide a question to ask the Magic 8 Ball.', ephemeral: true });
            }

            const response = getRandom(EIGHT_BALL_RESPONSES);

            const embed = createFunEmbed('🎱 Magic 8 Ball', null, author)
                .addFields(
                    { name: '❓ Question', value: `> ${question}`, inline: false },
                    { name: '🎱 The 8 Ball Says...', value: `> ${response}`, inline: false }
                );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 5. CHOOSE — Pick a random option from user input
    {
        name: 'choose',
        description: 'Let the bot pick a random option from your list (separate with commas).',
        options: [{ name: 'options', description: 'Comma-separated list of choices', type: 3, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            const rawInput = isSlash
                ? context.options.getString('options')
                : args?.join(' ');

            if (!rawInput) {
                return sendReply(context, { content: '❌ Please provide at least two options separated by commas.', ephemeral: true });
            }

            const choices = rawInput.split(',').map(s => s.trim()).filter(Boolean);

            if (choices.length < 2) {
                return sendReply(context, { content: '❌ Please provide at least **2** options separated by commas.\n> Example: `pizza, sushi, tacos`', ephemeral: true });
            }

            const chosen = getRandom(choices);
            const listDisplay = choices.map((c, i) => `> \`${i + 1}.\` ${c}`).join('\n');

            const embed = createFunEmbed('Random Choice',
                `**Options provided:**\n${listDisplay}\n\n🎯 **I choose:** \`${chosen}\``,
                author
            );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 6. FLIP — Flip text upside down
    {
        name: 'flip',
        description: 'Flip your text upside down.',
        options: [{ name: 'text', description: 'The text to flip upside down', type: 3, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            const input = isSlash
                ? context.options.getString('text')
                : args?.join(' ');

            if (!input) {
                return sendReply(context, { content: '❌ Please provide some text to flip.', ephemeral: true });
            }

            const flipped = input
                .split('')
                .map(c => FLIP_MAP[c] || c)
                .reverse()
                .join('');

            const embed = createFunEmbed('Text Flipper', null, author)
                .addFields(
                    { name: '📝 Original', value: `> ${input}`, inline: false },
                    { name: '🙃 Flipped', value: `> ${flipped}`, inline: false }
                );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 7. REVERSE — Reverse text backwards
    {
        name: 'reverse',
        description: 'Reverse your text backwards.',
        options: [{ name: 'text', description: 'The text to reverse', type: 3, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            const input = isSlash
                ? context.options.getString('text')
                : args?.join(' ');

            if (!input) {
                return sendReply(context, { content: '❌ Please provide some text to reverse.', ephemeral: true });
            }

            const reversed = input.split('').reverse().join('');

            const embed = createFunEmbed('Text Reverser', null, author)
                .addFields(
                    { name: '📝 Original', value: `> ${input}`, inline: false },
                    { name: '🔄 Reversed', value: `> ${reversed}`, inline: false }
                );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 8. JOKE — Tell a random joke
    {
        name: 'joke',
        description: 'Get a random joke to brighten your day.',
        options: [],
        async run(context) {
            const author = getAuthor(context);
            const joke = getRandom(JOKES);

            const embed = createFunEmbed('Random Joke', null, author)
                .addFields(
                    { name: '😏 Setup', value: `> ${joke.setup}`, inline: false },
                    { name: '😂 Punchline', value: `> ${joke.punchline}`, inline: false }
                );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 9. QUOTE — Random inspirational quote
    {
        name: 'quote',
        description: 'Get a random inspirational quote.',
        options: [],
        async run(context) {
            const author = getAuthor(context);
            const quote = getRandom(QUOTES);

            const embed = createFunEmbed('Inspirational Quote',
                `*"${quote.text}"*\n\n— **${quote.author}**`,
                author
            );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 10. TRIVIA — Ask a trivia question with button answers
    {
        name: 'trivia',
        description: 'Answer a random trivia question. You have 30 seconds!',
        options: [],
        async run(context) {
            const author = getAuthor(context);
            const channel = context.channel;

            if (triviaSessions.has(channel.id)) {
                return sendReply(context, { content: '⚠️ There is already an active trivia question in this channel. Answer it first!', ephemeral: true });
            }

            const q = getRandom(TRIVIA);
            const shuffled = [...q.options].sort(() => Math.random() - 0.5);
            const labels = ['A', 'B', 'C', 'D'];

            const optionsDisplay = shuffled.map((opt, i) => `> **${labels[i]}.** ${opt}`).join('\n');

            const embed = createFunEmbed('Trivia Time!',
                `❓ **${q.question}**\n\n${optionsDisplay}\n\n⏰ You have **30 seconds** to answer!`,
                author
            );

            const row = new ActionRowBuilder().addComponents(
                shuffled.map((opt, i) =>
                    new ButtonBuilder()
                        .setCustomId(`trivia_${i}_${opt === q.answer ? 'correct' : 'wrong'}`)
                        .setLabel(labels[i])
                        .setStyle(ButtonStyle.Secondary)
                )
            );

            const msg = await (context.isCommand?.()
                ? context.reply({ embeds: [embed], components: [row], fetchReply: true })
                : channel.send({ embeds: [embed], components: [row] }));

            const timeout = setTimeout(() => {
                triviaSessions.delete(channel.id);
                const timeoutEmbed = createFunEmbed('Trivia — Time\'s Up!',
                    `⏰ Nobody answered in time!\n\n✅ **Correct answer:** \`${q.answer}\``,
                    author
                );
                const disabledRow = new ActionRowBuilder().addComponents(
                    shuffled.map((_, i) =>
                        new ButtonBuilder()
                            .setCustomId(`trivia_done_${i}`)
                            .setLabel(labels[i])
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    )
                );
                msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
            }, 30000);

            triviaSessions.set(channel.id, { answer: q.answer, timeout, msg, shuffled, labels, author });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.customId.startsWith('trivia_') && !i.customId.startsWith('trivia_done_'),
                time: 30000,
                max: 1
            });

            collector.on('collect', async i => {
                clearTimeout(timeout);
                triviaSessions.delete(channel.id);

                const isCorrect = i.customId.endsWith('_correct');
                const resultEmbed = createFunEmbed('Trivia — Result',
                    isCorrect
                        ? `✅ **Correct!** Well done, ${i.user}!\n\n> **Answer:** \`${q.answer}\``
                        : `❌ **Wrong!** Better luck next time, ${i.user}.\n\n> **Correct answer:** \`${q.answer}\``,
                    author
                );

                const disabledRow = new ActionRowBuilder().addComponents(
                    shuffled.map((opt, idx) =>
                        new ButtonBuilder()
                            .setCustomId(`trivia_done_${idx}`)
                            .setLabel(labels[idx])
                            .setStyle(opt === q.answer ? ButtonStyle.Success : ButtonStyle.Danger)
                            .setDisabled(true)
                    )
                );

                await i.update({ embeds: [resultEmbed], components: [disabledRow] });
            });
        }
    },

    // 11. SLOTS — Slot machine game
    {
        name: 'slots',
        description: 'Spin the slot machine and try your luck!',
        options: [],
        async run(context) {
            const author = getAuthor(context);

            const spin = () => [getRandom(SLOT_SYMBOLS), getRandom(SLOT_SYMBOLS), getRandom(SLOT_SYMBOLS)];
            const reels = spin();
            const display = reels.join(' ｜ ');

            let result, color;
            if (reels[0] === reels[1] && reels[1] === reels[2]) {
                if (reels[0] === '💎') {
                    result = '💎 **JACKPOT! Three Diamonds! You\'re a legend!**';
                    color = 0x00FFFF;
                } else if (reels[0] === '7️⃣') {
                    result = '7️⃣ **TRIPLE SEVENS! Massive win!**';
                    color = 0xFFD700;
                } else {
                    result = `🎉 **Three of a kind! ${reels[0]} ${reels[0]} ${reels[0]} — You win!**`;
                    color = 0x2ECC71;
                }
            } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
                result = '🔔 **Two of a kind — Small win!**';
                color = 0xF39C12;
            } else {
                result = '💸 **No match — Better luck next time!**';
                color = 0xE74C3C;
            }

            const embed = createFunEmbed('🎰 Slot Machine', null, author)
                .setColor(color)
                .addFields(
                    { name: '🎰 Reels', value: `\`\`\`\n[ ${display} ]\n\`\`\``, inline: false },
                    { name: '📊 Result', value: result, inline: false }
                );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 12. HANGMAN — Hangman word game
    {
        name: 'hangman',
        description: 'Start a game of Hangman! Guess letters to reveal the word.',
        options: [],
        async run(context) {
            const author = getAuthor(context);
            const channel = context.channel;

            if (hangmanSessions.has(channel.id)) {
                const session = hangmanSessions.get(channel.id);
                const display = buildHangmanDisplay(session.word, session.guessed);
                const wrongDisplay = session.wrong.length ? session.wrong.join(', ') : 'None';

                const embed = createFunEmbed('Hangman — Already Active!',
                    `${HANGMAN_ART[session.wrong.length]}\n\n**Word:** ${display}\n\n> ❌ **Wrong guesses (${session.wrong.length}/${session.maxWrong}):** \`${wrongDisplay}\`\n\nType a single letter in chat to guess!`,
                    author
                );
                return sendReply(context, { embeds: [embed] });
            }

            const word = getRandom(HANGMAN_WORDS);
            const session = { word, guessed: new Set(), wrong: [], maxWrong: 6 };
            hangmanSessions.set(channel.id, session);

            const display = buildHangmanDisplay(word, session.guessed);

            const embed = createFunEmbed('Hangman — New Game!',
                `${HANGMAN_ART[0]}\n\n**Word:** ${display} *(${word.length} letters)*\n\n> ❌ **Wrong guesses (0/${session.maxWrong}):** \`None\`\n\nType a **single letter** in chat to guess! You have **6 wrong guesses** before the man is hanged.`,
                author
            );

            await sendReply(context, { embeds: [embed] });

            const collector = channel.createMessageCollector({
                filter: m => !m.author.bot && m.content.length === 1 && /[a-zA-Z]/.test(m.content),
                time: 120000
            });

            collector.on('collect', async m => {
                const s = hangmanSessions.get(channel.id);
                if (!s) return collector.stop('ended');

                const letter = m.content.toLowerCase();

                if (s.guessed.has(letter)) {
                    return m.reply(`⚠️ You already guessed **${letter}**! Try a different letter.`).catch(() => {});
                }

                s.guessed.add(letter);

                if (s.word.includes(letter)) {
                    const newDisplay = buildHangmanDisplay(s.word, s.guessed);
                    const isWon = s.word.split('').every(l => s.guessed.has(l));

                    if (isWon) {
                        hangmanSessions.delete(channel.id);
                        collector.stop('won');
                        const winEmbed = createFunEmbed('Hangman — You Won! 🎉',
                            `${HANGMAN_ART[s.wrong.length]}\n\n✅ **${m.author} guessed the word!**\n\n> **Word:** \`${s.word}\``,
                            author
                        );
                        return channel.send({ embeds: [winEmbed] });
                    }

                    const updateEmbed = createFunEmbed('Hangman — Correct! ✅',
                        `${HANGMAN_ART[s.wrong.length]}\n\n**Word:** ${newDisplay}\n\n> ✅ **Correct!** \`${letter}\` is in the word.\n> ❌ **Wrong guesses (${s.wrong.length}/${s.maxWrong}):** \`${s.wrong.length ? s.wrong.join(', ') : 'None'}\``,
                        author
                    );
                    return channel.send({ embeds: [updateEmbed] });
                } else {
                    s.wrong.push(letter);
                    const newDisplay = buildHangmanDisplay(s.word, s.guessed);

                    if (s.wrong.length >= s.maxWrong) {
                        hangmanSessions.delete(channel.id);
                        collector.stop('lost');
                        const loseEmbed = createFunEmbed('Hangman — Game Over! 💀',
                            `${HANGMAN_ART[s.maxWrong]}\n\n💀 **The man has been hanged!**\n\n> **The word was:** \`${s.word}\``,
                            author
                        );
                        return channel.send({ embeds: [loseEmbed] });
                    }

                    const updateEmbed = createFunEmbed('Hangman — Wrong Guess! ❌',
                        `${HANGMAN_ART[s.wrong.length]}\n\n**Word:** ${newDisplay}\n\n> ❌ **Wrong!** \`${letter}\` is not in the word.\n> ❌ **Wrong guesses (${s.wrong.length}/${s.maxWrong}):** \`${s.wrong.join(', ')}\``,
                        author
                    );
                    return channel.send({ embeds: [updateEmbed] });
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    const s = hangmanSessions.get(channel.id);
                    if (s) {
                        hangmanSessions.delete(channel.id);
                        const timeoutEmbed = createFunEmbed('Hangman — Time\'s Up! ⏰',
                            `⏰ **The game timed out!**\n\n> **The word was:** \`${s.word}\``,
                            author
                        );
                        channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
                    }
                }
            });
        }
    },

    // 13. RIDDLE — Random riddle
    {
        name: 'riddle',
        description: 'Get a random riddle. Can you figure it out?',
        options: [],
        async run(context) {
            const author = getAuthor(context);
            const riddle = getRandom(RIDDLES);

            const embed = createFunEmbed('🧩 Riddle',
                `**${riddle.question}**\n\n||💡 **Answer:** ${riddle.answer}||`,
                author
            ).setFooter({ text: `Requested by ${author.username} • Click the spoiler to reveal the answer!`, iconURL: author.displayAvatarURL({ dynamic: true }) });

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 14. RATE — Rate something 1–10 randomly
    {
        name: 'rate',
        description: 'Let the bot rate something out of 10.',
        options: [{ name: 'thing', description: 'What do you want to rate?', type: 3, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            const thing = isSlash
                ? context.options.getString('thing')
                : args?.join(' ');

            if (!thing) {
                return sendReply(context, { content: '❌ Please tell me what you want to rate.', ephemeral: true });
            }

            const rating = Math.floor(Math.random() * 11);
            const bar = '█'.repeat(rating) + '░'.repeat(10 - rating);

            let verdict;
            if (rating <= 2) verdict = '💀 Absolutely terrible.';
            else if (rating <= 4) verdict = '😬 Not great, not terrible.';
            else if (rating <= 6) verdict = '😐 Decent, I suppose.';
            else if (rating <= 8) verdict = '😊 Pretty good!';
            else if (rating === 9) verdict = '🔥 Excellent!';
            else verdict = '🌟 **PERFECT SCORE!**';

            const embed = createFunEmbed(`Rating: ${thing}`,
                `> **Score:** \`${rating}/10\`\n> **Bar:** \`[${bar}]\`\n\n${verdict}`,
                author
            );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 15. SHIP — Ship two users with compatibility percentage
    {
        name: 'ship',
        description: 'Ship two users and see their compatibility percentage!',
        options: [
            { name: 'user1', description: 'First user to ship', type: 6, required: true },
            { name: 'user2', description: 'Second user to ship', type: 6, required: false }
        ],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            let user1, user2;

            if (isSlash) {
                user1 = context.options.getUser('user1');
                user2 = context.options.getUser('user2') || author;
            } else {
                const mentions = context.mentions?.users;
                user1 = mentions?.first();
                user2 = mentions?.size >= 2 ? [...mentions.values()][1] : author;
                if (!user1) {
                    return sendReply(context, { content: '❌ Please mention at least one user to ship.\n> Example: `.ship @user1 @user2`', ephemeral: true });
                }
            }

            // Deterministic-ish score based on combined IDs so same pair always gets same result
            const seed = (BigInt(user1.id) + BigInt(user2.id)) % 101n;
            const score = Number(seed);
            const bar = '❤️'.repeat(Math.round(score / 10)) + '🖤'.repeat(10 - Math.round(score / 10));

            let verdict;
            if (score <= 10) verdict = '💔 Absolutely no chemistry...';
            else if (score <= 30) verdict = '😬 It\'s a stretch, but maybe?';
            else if (score <= 50) verdict = '🤔 There\'s potential here!';
            else if (score <= 70) verdict = '💕 A solid match!';
            else if (score <= 90) verdict = '💖 Great compatibility!';
            else verdict = '💞 **SOULMATES!** A perfect match!';

            const shipName = user1.username.slice(0, Math.ceil(user1.username.length / 2)) +
                             user2.username.slice(Math.floor(user2.username.length / 2));

            const embed = createFunEmbed('💘 Ship Calculator', null, author)
                .addFields(
                    { name: '👫 The Couple', value: `> ${user1} **+** ${user2}`, inline: false },
                    { name: '💑 Ship Name', value: `> \`${shipName}\``, inline: true },
                    { name: '📊 Compatibility', value: `> \`${score}%\``, inline: true },
                    { name: '❤️ Love Meter', value: `> ${bar}`, inline: false },
                    { name: '💬 Verdict', value: `> ${verdict}`, inline: false }
                );

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 16. KISS — Kiss someone
    {
        name: 'kiss',
        description: 'Send a kiss to someone special! 💋',
        options: [{ name: 'user', description: 'The user you want to kiss', type: 6, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            const target = isSlash
                ? context.options.getUser('user')
                : context.mentions?.users.first();

            if (!target) {
                return sendReply(context, { content: '❌ Please mention a user to kiss.\n> Example: `.kiss @user`', ephemeral: true });
            }

            if (target.id === author.id) {
                const embed = createFunEmbed('Kiss 💋',
                    `😂 ${author} tried to kiss themselves... that\'s one way to show self-love!`,
                    author
                );
                return sendReply(context, { embeds: [embed] });
            }

            const kissGifs = [
                'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
                'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
                'https://media.giphy.com/media/zkppEMFvRX5FC/giphy.gif',
                'https://media.giphy.com/media/nyGFcsP0kAobm/giphy.gif',
                'https://media.giphy.com/media/11e0gE4zBBFgCs/giphy.gif'
            ];

            const embed = createFunEmbed('Kiss 💋',
                `💋 **${author.username}** kissed **${target.username}**! How sweet! 😍`,
                author
            ).setImage(getRandom(kissGifs));

            return sendReply(context, { embeds: [embed] });
        }
    },

    // 17. HUG — Hug someone
    {
        name: 'hug',
        description: 'Give someone a warm hug! 🤗',
        options: [{ name: 'user', description: 'The user you want to hug', type: 6, required: true }],
        async run(context, args) {
            const isSlash = context.isCommand?.();
            const author = getAuthor(context);

            const target = isSlash
                ? context.options.getUser('user')
                : context.mentions?.users.first();

            if (!target) {
                return sendReply(context, { content: '❌ Please mention a user to hug.\n> Example: `.hug @user`', ephemeral: true });
            }

            if (target.id === author.id) {
                const embed = createFunEmbed('Hug 🤗',
                    `🥺 ${author} hugged themselves... we all need a little self-care sometimes! 💙`,
                    author
                );
                return sendReply(context, { embeds: [embed] });
            }

            const hugGifs = [
                'https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif',
                'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
                'https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif',
                'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif',
                'https://media.giphy.com/media/ZQN9jsRWp1M76/giphy.gif'
            ];

            const embed = createFunEmbed('Hug 🤗',
                `🤗 **${author.username}** gave **${target.username}** a big warm hug! Spread the love! 💙`,
                author
            ).setImage(getRandom(hugGifs));

            return sendReply(context, { embeds: [embed] });
        }
    }
];
