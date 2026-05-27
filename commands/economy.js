/**
 * Zishi Economy System
 * Slash Commands Only + No Prefix Economy Channel Support
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../economy.json');

/**
 * CHANNEL WHERE USERS CAN USE COMMANDS WITHOUT SLASH
 * Example:
 * const ECONOMY_CHANNEL_ID = '139999999999999999';
 */
const ECONOMY_CHANNEL_ID = '1509172933195595816';

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 4));
}

function getProfile(userId) {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    if (!data[userId]) {
        data[userId] = {
            wallet: 500,
            bank: 0,
            bankSpace: 2500,
            inventory: {},
            lastDaily: 0,
            lastWork: 0,
            lastRob: 0,
            lastCrime: 0
        };

        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
    }

    return data[userId];
}

function updateProfile(userId, profile) {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    data[userId] = profile;
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
}

const SHOP_ITEMS = {
    villainrole: {
        name: 'Villain Role',
        price: 10000,
        desc: 'After Getting Villain Role You Become The True Member Of The Server'
    },

    viprole: {
        name: 'Vip Role',
        price: 30000,
        desc: 'After Getting Vip Role You Get Access To Vip Futures'
    },

    ecomastery: {
        name: 'Zishi Eco Mastery Role',
        price: 50000,
        desc: 'After Getting Eco Mastery Role You Get Double Daily Coins & Weekly Eco Also'
    }
};

module.exports = {
    commands: [

        // BALANCE
        {
            name: 'bal',
            description: 'Check your balance.',
            options: [
                {
                    name: 'user',
                    description: 'Target user',
                    type: 6,
                    required: false
                }
            ],

            async run(interaction) {
                const target = interaction.options?.getUser('user') || interaction.user;

                const profile = getProfile(target.id);

                const embed = new EmbedBuilder()
                    .setTitle(`💰 Zishi Eco: ${target.username}`)
                    .setColor(0x00FFCC)
                    .addFields(
                        {
                            name: '💵 Wallet',
                            value: `\`$${profile.wallet.toLocaleString()}\``,
                            inline: true
                        },
                        {
                            name: '🏦 Bank',
                            value: `\`$${profile.bank.toLocaleString()}\` / \`$${profile.bankSpace.toLocaleString()}\``,
                            inline: true
                        },
                        {
                            name: '📊 Total',
                            value: `\`$${(profile.wallet + profile.bank).toLocaleString()}\``,
                            inline: false
                        }
                    );

                return interaction.reply({ embeds: [embed] });
            }
        },

        // DAILY
        {
            name: 'daily',
            description: 'Claim your daily reward.',

            async run(interaction) {
                const user = interaction.user;
                const profile = getProfile(user.id);

                const cooldown = 86400000;

                if (Date.now() - profile.lastDaily < cooldown) {
                    const remaining = cooldown - (Date.now() - profile.lastDaily);

                    const hours = Math.floor(remaining / 3600000);
                    const minutes = Math.floor((remaining % 3600000) / 60000);

                    return interaction.reply({
                        content: `⏳ You already claimed daily.\nCome back in \`${hours}h ${minutes}m\``,
                        ephemeral: true
                    });
                }

                const amount = 1000;

                profile.wallet += amount;
                profile.lastDaily = Date.now();

                updateProfile(user.id, profile);

                const embed = new EmbedBuilder()
                    .setTitle('📆 Daily Claimed')
                    .setDescription(`💵 You received **$1,000**`)
                    .setColor(0x2ECC71);

                return interaction.reply({ embeds: [embed] });
            }
        },

        // WORK
        {
            name: 'work',
            description: 'Work to earn money.',

            async run(interaction) {
                const user = interaction.user;
                const profile = getProfile(user.id);

                const cooldown = 3600000;

                if (Date.now() - profile.lastWork < cooldown) {
                    const remaining = cooldown - (Date.now() - profile.lastWork);

                    return interaction.reply({
                        content: `⏳ Wait \`${Math.floor(remaining / 60000)}\` more minutes.`,
                        ephemeral: true
                    });
                }

                const pay = Math.floor(Math.random() * 400) + 200;

                const jobs = [
                    'Software Engineer',
                    'Cybersecurity Analyst',
                    'System Architect',
                    'Node Operator'
                ];

                const job = jobs[Math.floor(Math.random() * jobs.length)];

                profile.wallet += pay;
                profile.lastWork = Date.now();

                updateProfile(user.id, profile);

                return interaction.reply(
                    `⚙️ You worked as **${job}** and earned \`$${pay}\``
                );
            }
        },

        // DEPOSIT
        {
            name: 'deposit',
            description: 'Deposit money into bank.',
            options: [
                {
                    name: 'amount',
                    description: 'Amount or all',
                    type: 3,
                    required: true
                }
            ],

            async run(interaction) {
                const user = interaction.user;
                const profile = getProfile(user.id);

                const input = interaction.options.getString('amount');

                let amount;

                if (input.toLowerCase() === 'all') {
                    amount = profile.wallet;
                } else {
                    amount = parseInt(input);
                }

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({
                        content: '❌ Invalid amount.',
                        ephemeral: true
                    });
                }

                if (profile.wallet < amount) {
                    return interaction.reply({
                        content: '❌ Not enough wallet cash.',
                        ephemeral: true
                    });
                }

                const available = profile.bankSpace - profile.bank;

                if (amount > available) amount = available;

                if (amount <= 0) {
                    return interaction.reply({
                        content: '❌ Bank full.',
                        ephemeral: true
                    });
                }

                profile.wallet -= amount;
                profile.bank += amount;

                updateProfile(user.id, profile);

                return interaction.reply(
                    `🏦 Deposited \`$${amount.toLocaleString()}\``
                );
            }
        },

        // WITHDRAW
        {
            name: 'withdraw',
            description: 'Withdraw money from bank.',
            options: [
                {
                    name: 'amount',
                    description: 'Amount or all',
                    type: 3,
                    required: true
                }
            ],

            async run(interaction) {
                const user = interaction.user;
                const profile = getProfile(user.id);

                const input = interaction.options.getString('amount');

                let amount;

                if (input.toLowerCase() === 'all') {
                    amount = profile.bank;
                } else {
                    amount = parseInt(input);
                }

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({
                        content: '❌ Invalid amount.',
                        ephemeral: true
                    });
                }

                if (profile.bank < amount) {
                    return interaction.reply({
                        content: '❌ Not enough bank cash.',
                        ephemeral: true
                    });
                }

                profile.bank -= amount;
                profile.wallet += amount;

                updateProfile(user.id, profile);

                return interaction.reply(
                    `💵 Withdrawn \`$${amount.toLocaleString()}\``
                );
            }
        }
    ],

    /**
     * NO PREFIX ECONOMY CHANNEL SYSTEM
     * Only works inside ECONOMY_CHANNEL_ID
     */

    async messageRun(message) {

        if (!message.guild) return;
        if (message.author.bot) return;

        if (message.channel.id !== ECONOMY_CHANNEL_ID) return;

        const args = message.content.trim().split(/ +/);
        const command = args.shift().toLowerCase();

        const fakeInteraction = {
            user: message.author,
            guild: message.guild,
            channel: message.channel,

            options: {
                getString: (name) => {
                    if (name === 'amount') return args[0];
                    return null;
                },

                getUser: () => message.mentions.users.first()
            },

            reply: async (data) => {
                return message.reply(data);
            }
        };

        const commandsMap = {
            daily: 'daily',
            bal: 'bal',
            balance: 'bal',
            work: 'work',
            deposit: 'deposit',
            withdraw: 'withdraw'
        };

        const cmdName = commandsMap[command];

        if (!cmdName) return;

        const commandData = this.commands.find(c => c.name === cmdName);

        if (!commandData) return;

        commandData.run(fakeInteraction);
    }
};
