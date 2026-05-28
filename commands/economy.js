/**
 * Zishi Economy System
 * Supports BOTH Slash Commands AND Prefix Commands (!)
 */

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../economy.json');

// Economy channel for no-prefix usage (optional, set to null to disable)
const ECONOMY_CHANNEL_ID = '1509293693687828583';

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

// ==========================================
// HYBRID REPLY HELPER
// ==========================================
async function ecoReply(ctx, data) {
    if (ctx.isCommand?.()) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(data);
        return ctx.reply(data);
    }
    const content = typeof data === 'string' ? data : data.content;
    const embeds = typeof data === 'object' ? data.embeds : undefined;
    return ctx.channel.send({ content, embeds });
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
        desc: 'After Getting Vip Role You Get Access To Vip Features'
    },
    ecomastery: {
        name: 'Zishi Eco Mastery Role',
        price: 50000,
        desc: 'After Getting Eco Mastery Role You Get Double Daily Coins & Weekly Eco Also'
    }
};

module.exports = {
    commands: [

        // ==========================================
        // BALANCE
        // ==========================================
        {
            name: 'bal',
            description: 'Check your balance.',
            options: [
                { name: 'user', description: 'Target user', type: 6, required: false }
            ],
            async run(ctx, args) {
                let target;
                if (ctx.isCommand?.()) {
                    target = ctx.options.getUser('user') || ctx.user;
                } else {
                    target = ctx.mentions?.users?.first() || ctx.author;
                }

                const profile = getProfile(target.id);

                const embed = new EmbedBuilder()
                    .setTitle(`💰 Zishi Eco: ${target.username}`)
                    .setColor(0x00FFCC)
                    .addFields(
                        { name: '💵 Wallet', value: `\`$${profile.wallet.toLocaleString()}\``, inline: true },
                        { name: '🏦 Bank', value: `\`$${profile.bank.toLocaleString()}\` / \`$${profile.bankSpace.toLocaleString()}\``, inline: true },
                        { name: '📊 Total', value: `\`$${(profile.wallet + profile.bank).toLocaleString()}\``, inline: false }
                    );

                return ecoReply(ctx, { embeds: [embed] });
            }
        },

        // ==========================================
        // DAILY
        // ==========================================
        {
            name: 'daily',
            description: 'Claim your daily reward.',
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const cooldown = 86400000;

                if (Date.now() - profile.lastDaily < cooldown) {
                    const remaining = cooldown - (Date.now() - profile.lastDaily);
                    const hours = Math.floor(remaining / 3600000);
                    const minutes = Math.floor((remaining % 3600000) / 60000);
                    return ecoReply(ctx, {
                        content: `⏳ You already claimed daily. Come back in \`${hours}h ${minutes}m\``,
                        ephemeral: true
                    });
                }

                profile.wallet += 1000;
                profile.lastDaily = Date.now();
                updateProfile(user.id, profile);

                const embed = new EmbedBuilder()
                    .setTitle('📆 Daily Claimed')
                    .setDescription('💵 You received **$1,000**')
                    .setColor(0x2ECC71);

                return ecoReply(ctx, { embeds: [embed] });
            }
        },

        // ==========================================
        // WORK
        // ==========================================
        {
            name: 'work',
            description: 'Work to earn money.',
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const cooldown = 3600000;

                if (Date.now() - profile.lastWork < cooldown) {
                    const remaining = cooldown - (Date.now() - profile.lastWork);
                    return ecoReply(ctx, {
                        content: `⏳ Wait \`${Math.floor(remaining / 60000)}\` more minutes.`,
                        ephemeral: true
                    });
                }

                const pay = Math.floor(Math.random() * 400) + 200;
                const jobs = ['Software Engineer', 'Cybersecurity Analyst', 'System Architect', 'Node Operator', 'Data Scientist', 'DevOps Engineer'];
                const job = jobs[Math.floor(Math.random() * jobs.length)];

                profile.wallet += pay;
                profile.lastWork = Date.now();
                updateProfile(user.id, profile);

                return ecoReply(ctx, `⚙️ You worked as **${job}** and earned \`$${pay}\``);
            }
        },

        // ==========================================
        // DEPOSIT
        // ==========================================
        {
            name: 'deposit',
            description: 'Deposit money into bank.',
            options: [
                { name: 'amount', description: 'Amount or all', type: 3, required: true }
            ],
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const input = ctx.isCommand?.() ? ctx.options.getString('amount') : args?.[0];

                if (!input) return ecoReply(ctx, { content: '❌ Provide an amount.', ephemeral: true });

                let amount = input.toLowerCase() === 'all' ? profile.wallet : parseInt(input);

                if (isNaN(amount) || amount <= 0) return ecoReply(ctx, { content: '❌ Invalid amount.', ephemeral: true });
                if (profile.wallet < amount) return ecoReply(ctx, { content: '❌ Not enough wallet cash.', ephemeral: true });

                const available = profile.bankSpace - profile.bank;
                if (amount > available) amount = available;
                if (amount <= 0) return ecoReply(ctx, { content: '❌ Bank is full.', ephemeral: true });

                profile.wallet -= amount;
                profile.bank += amount;
                updateProfile(user.id, profile);

                return ecoReply(ctx, `🏦 Deposited \`$${amount.toLocaleString()}\``);
            }
        },

        // ==========================================
        // WITHDRAW
        // ==========================================
        {
            name: 'withdraw',
            description: 'Withdraw money from bank.',
            options: [
                { name: 'amount', description: 'Amount or all', type: 3, required: true }
            ],
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const input = ctx.isCommand?.() ? ctx.options.getString('amount') : args?.[0];

                if (!input) return ecoReply(ctx, { content: '❌ Provide an amount.', ephemeral: true });

                let amount = input.toLowerCase() === 'all' ? profile.bank : parseInt(input);

                if (isNaN(amount) || amount <= 0) return ecoReply(ctx, { content: '❌ Invalid amount.', ephemeral: true });
                if (profile.bank < amount) return ecoReply(ctx, { content: '❌ Not enough bank cash.', ephemeral: true });

                profile.bank -= amount;
                profile.wallet += amount;
                updateProfile(user.id, profile);

                return ecoReply(ctx, `💵 Withdrawn \`$${amount.toLocaleString()}\``);
            }
        },

        // ==========================================
        // ROB
        // ==========================================
        {
            name: 'rob',
            description: 'Attempt to rob another user\'s wallet.',
            options: [
                { name: 'user', description: 'Target user', type: 6, required: true }
            ],
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const cooldown = 1800000;

                if (Date.now() - profile.lastRob < cooldown) {
                    const remaining = cooldown - (Date.now() - profile.lastRob);
                    return ecoReply(ctx, {
                        content: `⏳ Rob cooldown: \`${Math.ceil(remaining / 60000)}m\` remaining.`,
                        ephemeral: true
                    });
                }

                let target;
                if (ctx.isCommand?.()) {
                    target = ctx.options.getUser('user');
                } else {
                    target = ctx.mentions?.users?.first();
                }

                if (!target || target.id === user.id) return ecoReply(ctx, { content: '❌ Invalid target.', ephemeral: true });

                const targetProfile = getProfile(target.id);
                if (targetProfile.wallet < 100) return ecoReply(ctx, { content: '❌ Target has less than $100 in their wallet.', ephemeral: true });

                profile.lastRob = Date.now();
                const success = Math.random() < 0.45;

                if (success) {
                    const stolen = Math.floor(targetProfile.wallet * (Math.random() * 0.3 + 0.1));
                    profile.wallet += stolen;
                    targetProfile.wallet -= stolen;
                    updateProfile(user.id, profile);
                    updateProfile(target.id, targetProfile);

                    return ecoReply(ctx, {
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('🦹 Robbery Successful!')
                                .setDescription(`You stole **$${stolen.toLocaleString()}** from ${target.username}!`)
                                .setColor(0x2ECC71)
                        ]
                    });
                } else {
                    const fine = Math.floor(profile.wallet * 0.15);
                    profile.wallet = Math.max(0, profile.wallet - fine);
                    updateProfile(user.id, profile);

                    return ecoReply(ctx, {
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('🚔 Robbery Failed!')
                                .setDescription(`You got caught and paid a **$${fine.toLocaleString()}** fine.`)
                                .setColor(0xE74C3C)
                        ]
                    });
                }
            }
        },

        // ==========================================
        // GAMBLE
        // ==========================================
        {
            name: 'gamble',
            description: 'Gamble a sum of money.',
            options: [
                { name: 'amount', description: 'Amount to gamble', type: 3, required: true }
            ],
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const input = ctx.isCommand?.() ? ctx.options.getString('amount') : args?.[0];

                if (!input) return ecoReply(ctx, { content: '❌ Provide an amount.', ephemeral: true });

                let amount = input.toLowerCase() === 'all' ? profile.wallet : parseInt(input);

                if (isNaN(amount) || amount <= 0) return ecoReply(ctx, { content: '❌ Invalid amount.', ephemeral: true });
                if (profile.wallet < amount) return ecoReply(ctx, { content: '❌ Not enough wallet cash.', ephemeral: true });

                const roll = Math.random();
                let resultText, color;

                if (roll < 0.05) {
                    const winnings = amount * 3;
                    profile.wallet += winnings;
                    resultText = `🎰 **JACKPOT!** You won **$${winnings.toLocaleString()}**! (3x)`;
                    color = 0xFFD700;
                } else if (roll < 0.45) {
                    profile.wallet += amount;
                    resultText = `✅ You won **$${amount.toLocaleString()}**!`;
                    color = 0x2ECC71;
                } else {
                    profile.wallet -= amount;
                    resultText = `❌ You lost **$${amount.toLocaleString()}**.`;
                    color = 0xE74C3C;
                }

                updateProfile(user.id, profile);

                return ecoReply(ctx, {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🎲 Gamble Result')
                            .setDescription(resultText)
                            .addFields({ name: '💰 New Balance', value: `\`$${profile.wallet.toLocaleString()}\`` })
                            .setColor(color)
                    ]
                });
            }
        },

        // ==========================================
        // SHOP
        // ==========================================
        {
            name: 'shop',
            description: 'View the item shop.',
            async run(ctx, args) {
                const embed = new EmbedBuilder()
                    .setTitle('🛒 Zishi Item Shop')
                    .setColor(0x00FFCC)
                    .setDescription(
                        'Use `/buy <item>` or `!buy <item>` to purchase.\n\n' +
                        Object.entries(SHOP_ITEMS)
                            .map(([key, item]) => `**${item.name}** — \`$${item.price.toLocaleString()}\`\n> ${item.desc}\n> ID: \`${key}\``)
                            .join('\n\n')
                    );

                return ecoReply(ctx, { embeds: [embed] });
            }
        },

        // ==========================================
        // BUY
        // ==========================================
        {
            name: 'buy',
            description: 'Buy an item from the shop.',
            options: [
                { name: 'item', description: 'Item ID to buy', type: 3, required: true }
            ],
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const itemKey = ctx.isCommand?.() ? ctx.options.getString('item')?.toLowerCase() : args?.[0]?.toLowerCase();

                if (!itemKey) return ecoReply(ctx, { content: '❌ Provide an item ID.', ephemeral: true });

                const item = SHOP_ITEMS[itemKey];
                if (!item) return ecoReply(ctx, { content: `❌ Item \`${itemKey}\` not found. Use \`/shop\` to see available items.`, ephemeral: true });

                if (profile.wallet < item.price) {
                    return ecoReply(ctx, { content: `❌ You need \`$${item.price.toLocaleString()}\` but only have \`$${profile.wallet.toLocaleString()}\`.`, ephemeral: true });
                }

                profile.wallet -= item.price;
                profile.inventory[itemKey] = (profile.inventory[itemKey] || 0) + 1;
                updateProfile(user.id, profile);

                return ecoReply(ctx, {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ Purchase Successful')
                            .setDescription(`You bought **${item.name}** for \`$${item.price.toLocaleString()}\`!`)
                            .addFields({ name: '💰 Remaining Balance', value: `\`$${profile.wallet.toLocaleString()}\`` })
                            .setColor(0x2ECC71)
                    ]
                });
            }
        },

        // ==========================================
        // SELL
        // ==========================================
        {
            name: 'sell',
            description: 'Sell an item from your inventory.',
            options: [
                { name: 'item', description: 'Item ID to sell', type: 3, required: true }
            ],
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);
                const itemKey = ctx.isCommand?.() ? ctx.options.getString('item')?.toLowerCase() : args?.[0]?.toLowerCase();

                if (!itemKey) return ecoReply(ctx, { content: '❌ Provide an item ID.', ephemeral: true });

                const item = SHOP_ITEMS[itemKey];
                if (!item) return ecoReply(ctx, { content: `❌ Item \`${itemKey}\` not found.`, ephemeral: true });

                if (!profile.inventory[itemKey] || profile.inventory[itemKey] < 1) {
                    return ecoReply(ctx, { content: `❌ You don't own any \`${item.name}\`.`, ephemeral: true });
                }

                const sellPrice = Math.floor(item.price * 0.5);
                profile.inventory[itemKey]--;
                if (profile.inventory[itemKey] === 0) delete profile.inventory[itemKey];
                profile.wallet += sellPrice;
                updateProfile(user.id, profile);

                return ecoReply(ctx, {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('💸 Item Sold')
                            .setDescription(`Sold **${item.name}** for \`$${sellPrice.toLocaleString()}\` (50% of buy price).`)
                            .addFields({ name: '💰 New Balance', value: `\`$${profile.wallet.toLocaleString()}\`` })
                            .setColor(0xF39C12)
                    ]
                });
            }
        },

        // ==========================================
        // INVENTORY
        // ==========================================
        {
            name: 'inventory',
            description: 'View your inventory.',
            options: [
                { name: 'user', description: 'Target user', type: 6, required: false }
            ],
            async run(ctx, args) {
                let target;
                if (ctx.isCommand?.()) {
                    target = ctx.options.getUser('user') || ctx.user;
                } else {
                    target = ctx.mentions?.users?.first() || ctx.author;
                }

                const profile = getProfile(target.id);
                const items = Object.entries(profile.inventory);

                const embed = new EmbedBuilder()
                    .setTitle(`🎒 ${target.username}'s Inventory`)
                    .setColor(0x9B59B6)
                    .setDescription(
                        items.length
                            ? items.map(([key, qty]) => {
                                const item = SHOP_ITEMS[key];
                                return `**${item ? item.name : key}** × ${qty}`;
                            }).join('\n')
                            : '🪹 Inventory is empty.'
                    );

                return ecoReply(ctx, { embeds: [embed] });
            }
        },

        // ==========================================
        // TRANSFER
        // ==========================================
        {
            name: 'transfer',
            description: 'Transfer money to another user.',
            options: [
                { name: 'user', description: 'Target user', type: 6, required: true },
                { name: 'amount', description: 'Amount to transfer', type: 4, required: true }
            ],
            async run(ctx, args) {
                const user = ctx.isCommand?.() ? ctx.user : ctx.author;
                const profile = getProfile(user.id);

                let target, amount;
                if (ctx.isCommand?.()) {
                    target = ctx.options.getUser('user');
                    amount = ctx.options.getInteger('amount');
                } else {
                    target = ctx.mentions?.users?.first();
                    amount = parseInt(args?.[1]);
                }

                if (!target || target.id === user.id) return ecoReply(ctx, { content: '❌ Invalid target.', ephemeral: true });
                if (!amount || amount <= 0) return ecoReply(ctx, { content: '❌ Invalid amount.', ephemeral: true });
                if (profile.wallet < amount) return ecoReply(ctx, { content: '❌ Not enough wallet cash.', ephemeral: true });

                const targetProfile = getProfile(target.id);
                profile.wallet -= amount;
                targetProfile.wallet += amount;
                updateProfile(user.id, profile);
                updateProfile(target.id, targetProfile);

                return ecoReply(ctx, {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('💸 Transfer Complete')
                            .addFields(
                                { name: '📤 Sent', value: `\`$${amount.toLocaleString()}\``, inline: true },
                                { name: '📥 To', value: target.username, inline: true },
                                { name: '💰 Your Balance', value: `\`$${profile.wallet.toLocaleString()}\``, inline: false }
                            )
                            .setColor(0x3498DB)
                    ]
                });
            }
        },

        // ==========================================
        // ECO LEADERBOARD
        // ==========================================
        {
            name: 'ecolb',
            description: 'View the economy leaderboard (top 10 richest users).',
            async run(ctx, args) {
                const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

                const sorted = Object.entries(data)
                    .map(([id, p]) => ({ id, total: (p.wallet || 0) + (p.bank || 0) }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);

                let desc = '';
                const client = ctx.client || ctx.guild?.client;
                for (let i = 0; i < sorted.length; i++) {
                    const u = await client?.users.fetch(sorted[i].id).catch(() => null);
                    desc += `**#${i + 1}** ${u ? u.username : 'Unknown'} — \`$${sorted[i].total.toLocaleString()}\`\n`;
                }

                return ecoReply(ctx, {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('💰 Economy Leaderboard')
                            .setDescription(desc || 'No data.')
                            .setColor(0xFFD700)
                    ]
                });
            }
        }

    ], // end commands array

    // ==========================================
    // PREFIX COMMAND HANDLER
    // Called from index.js messageCreate event
    // ==========================================
    async handlePrefix(message, commandName, args) {
        if (!message.guild) return false;

        const aliases = {
            balance: 'bal',
            inv: 'inventory',
            lb: 'ecolb',
            leaderboard: 'ecolb'
        };

        const resolvedName = aliases[commandName] || commandName;
        const cmd = this.commands.find(c => c.name === resolvedName);
        if (!cmd) return false;

        try {
            await cmd.run(message, args);
        } catch (err) {
            console.error(`[Economy Prefix Error] ${commandName}:`, err);
            message.reply({ content: '❌ Command failed.' }).catch(() => {});
        }

        return true;
    },

    // ==========================================
    // ECONOMY CHANNEL SYSTEM (no-prefix, channel-specific)
    // Only works inside ECONOMY_CHANNEL_ID
    // ==========================================
    async messageRun(message) {
        if (!message.guild) return;
        if (message.author.bot) return;
        if (!ECONOMY_CHANNEL_ID) return;
        if (message.channel.id !== ECONOMY_CHANNEL_ID) return;

        const args = message.content.trim().split(/ +/);
        const command = args.shift().toLowerCase();

        const commandsMap = {
            daily: 'daily',
            bal: 'bal',
            balance: 'bal',
            work: 'work',
            deposit: 'deposit',
            withdraw: 'withdraw',
            rob: 'rob',
            gamble: 'gamble',
            shop: 'shop',
            buy: 'buy',
            sell: 'sell',
            inventory: 'inventory',
            inv: 'inventory',
            transfer: 'transfer',
            ecolb: 'ecolb',
            leaderboard: 'ecolb'
        };

        const cmdName = commandsMap[command];
        if (!cmdName) return;

        const commandData = this.commands.find(c => c.name === cmdName);
        if (!commandData) return;

        commandData.run(message, args);
    }
};
