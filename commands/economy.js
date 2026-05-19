/**
 * Nexora Premium-Tier Economy & Gamification Subsystem
 * Storage Framework: Local Persistent JSON Database Engine (No MongoDB Dependency)
 * Architecture Support: Hybrid Slash (/) + Traditional Text Prefix Framework Matrix
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../economy.json');

// Initialize the database file if it does not exist
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 4));
}

/**
 * HELPER FUNCTIONS: FILE SYSTEM INTERACTION LAYER
 */
function getProfile(userId) {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!data[userId]) {
        data[userId] = {
            wallet: 500,        // Starting Balance
            bank: 0,
            bankSpace: 2500,    // Initial Max Bank Capacity
            inventory: {},      // Items: Quantity mapping
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

// Global Virtual Item Registry Shop Manifest
const SHOP_ITEMS = {
    laptop: { name: '💻 High-End Laptop', price: 1500, desc: 'Increases income potential from writing scripts or hacking.' },
    shield: { name: '🛡️ Kinetic Shield', price: 3000, desc: 'Protects your wallet from 1 attempted robbery.' },
    vault: { name: '🗄️ Titanium Vault Upgrade', price: 5000, desc: 'Permanently adds +5,000 to your max bank space capacity.' },
    ring: { name: '👑 Royal Signet Ring', price: 25000, desc: 'A purely luxurious token indicating absolute wealth status.' }
};

module.exports = {
    commands: [
        // 1. BALANCE
        {
            name: 'balance',
            description: 'Check your current wallet cash reserves and bank account balances.',
            options: [{ name: 'user', description: 'Target user identity profile', type: 6, required: false }],
            async run(context) {
                const isSlash = context.isCommand?.();
                const target = isSlash ? (context.options.getUser('user') || context.user) : (context.mentions.users.first() || context.author);
                
                const profile = getProfile(target.id);
                const embed = new EmbedBuilder()
                    .setTitle(`💰 Zishi Eco: ${target.username}`)
                    .setColor(0x00FFCC)
                    .addFields(
                        { name: '💵 Wallet Cash', value: `\`$${profile.wallet.toLocaleString()}\``, inline: true },
                        { name: '🏦 Safe Deposit Bank', value: `\`$${profile.bank.toLocaleString()}\` / \`$${profile.bankSpace.toLocaleString()}\``, inline: true },
                        { name: '📊 Cumulative Wealth Net Worth', value: `\`$${(profile.wallet + profile.bank).toLocaleString()}\``, inline: false }
                    ).setTimestamp();
                return isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
            }
        },

        // 2. DAILY
        {
            name: 'daily',
            description: 'Claim your daily.',
            async run(context) {
                const user = context.isCommand?.() ? context.user : context.author;
                const profile = getProfile(user.id);
                const cooldown = 86400000; // 24 hours in ms
                
                if (Date.now() - profile.lastDaily < cooldown) {
                    const remaining = cooldown - (Date.now() - profile.lastDaily);
                    const hours = Math.floor(remaining / 3600000);
                    const minutes = Math.floor((remaining % 3600000) / 60000);
                    return context.reply(`⏳ **Cooldown Active:** You can request your next allowance in \`${hours}h ${minutes}m\`.`);
                }

                const amount = 1000;
                profile.wallet += amount;
                profile.lastDaily = Date.now();
                updateProfile(user.id, profile);

                const embed = new EmbedBuilder()
                    .setTitle('📆 DailyClaimed')
                    .setDescription(`💵 You got **$1,000** Zishi Eco`)
                    .setColor(0x2ECC71);
                return context.reply({ embeds: [embed] });
            }
        },

        // 3. WORK
        {
            name: 'work',
            description: 'Perform standard production tasks to generate wallet currency.',
            async run(context) {
                const user = context.isCommand?.() ? context.user : context.author;
                const profile = getProfile(user.id);
                const cooldown = 3600000; // 1 hour
                
                if (Date.now() - profile.lastWork < cooldown) {
                    const remaining = cooldown - (Date.now() - profile.lastWork);
                    return context.reply(`⏳ **Cooldown Active:** You already claimed your daily. Rest for another \`${Math.floor(remaining / 60000)}\` minutes before returning to work.`);
                }

                const pay = Math.floor(Math.random() * 400) + 200; // $200 - $600
                const jobs = ['Software Engineer', 'Cybersecurity Analyst', 'Automated Node Operator', 'System Architect'];
                const job = jobs[Math.floor(Math.random() * jobs.length)];

                profile.wallet += pay;
                profile.lastWork = Date.now();
                updateProfile(user.id, profile);

                return context.reply(`⚙️ **Shift Complete:** You worked as an excellent **${job}** and generated \`$${pay}\` for your wallet.`);
            }
        },

        // 4. DEPOSIT
        {
            name: 'deposit',
            description: 'Move wallet cash into the secure banking grid system.',
            options: [{ name: 'amount', description: 'Amount to store or write "all"', type: 3, required: true }],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const user = isSlash ? context.user : context.author;
                const profile = getProfile(user.id);
                const input = isSlash ? context.options.getString('amount') : args?.[0];

                if (!input) return context.reply('❌ Specify an amount or write `all`.');

                let amt = 0;
                if (input.toLowerCase() === 'all') {
                    amt = profile.wallet;
                } else {
                    amt = parseInt(input);
                }

                if (isNaN(amt) || amt <= 0) return context.reply('❌ Invalid processing amount sequence.');
                if (profile.wallet < amt) return context.reply('❌ Insufficient active physical cash liquidity reserves available.');
                
                const spaceAvailable = profile.bankSpace - profile.bank;
                if (amt > spaceAvailable) amt = spaceAvailable;
                if (amt <= 0) return context.reply('❌ Your vault bank spaces have completely maximized operational threshold limit filters.');

                profile.wallet -= amt;
                profile.bank += amt;
                updateProfile(user.id, profile);

                return context.reply(`🏦 **Bank Transaction:** Secured \`$${amt.toLocaleString()}\` cash holdings deep inside your banking ledger vault safely.`);
            }
        },

        // 5. WITHDRAW
        {
            name: 'withdraw',
            description: 'Liquidate bank holdings straight back into physical wallet cash reserves.',
            options: [{ name: 'amount', description: 'Amount to extract or write "all"', type: 3, required: true }],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const user = isSlash ? context.user : context.author;
                const profile = getProfile(user.id);
                const input = isSlash ? context.options.getString('amount') : args?.[0];

                if (!input) return context.reply('❌ Specify an extraction amount sequence.');

                let amt = 0;
                if (input.toLowerCase() === 'all') {
                    amt = profile.bank;
                } else {
                    amt = parseInt(input);
                }

                if (isNaN(amt) || amt <= 0) return context.reply('❌ Invalid conversion balance parameter entry.');
                if (profile.bank < amt) return context.reply('❌ Insufficient storage vaults bank allocation records.');

                profile.bank -= amt;
                profile.wallet += amt;
                updateProfile(user.id, profile);

                return context.reply(`💵 **Bank Transaction:** Safely extracted \`$${amt.toLocaleString()}\` assets straight back into your hand-wallet layout container.`);
            }
        },

        // 6. COINFLIP
        {
            name: 'coinflip',
            description: 'Wager wallet funds on a 50/50 probability matrix algorithm coin toss.',
            options: [
                { name: 'wager', description: 'The currency amount to place on the table line', type: 4, required: true },
                { name: 'side', description: 'Heads or Tails side designation selection', type: 3, required: true, choices: [{ name: 'heads', value: 'heads' }, { name: 'tails', value: 'tails' }] }
            ],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const user = isSlash ? context.user : context.author;
                const profile = getProfile(user.id);

                let wager = isSlash ? context.options.getInteger('wager') : parseInt(args?.[0]);
                let choice = isSlash ? context.options.getString('side') : args?.[1]?.toLowerCase();

                if (!wager || isNaN(wager) || wager <= 0) return context.reply('❌ Please input a valid investment entry value scale.');
                if (profile.wallet < wager) return context.reply('❌ Your wallet lacks the requested capital reserves required to balance this bet.');
                if (!['heads', 'tails'].includes(choice)) return context.reply('❌ Operational side parameter designation must be matching: `heads` or `tails`.');

                const coinSide = Math.random() < 0.5 ? 'heads' : 'tails';
                const won = choice === coinSide;

                if (won) {
                    profile.wallet += wager;
                    updateProfile(user.id, profile);
                    return context.reply(`🪙 **Coinflip Result:** The coin landed on **${coinSide.toUpperCase()}**! You won a massive bonus payout of \`+$${wager.toLocaleString()}\`!`);
                } else {
                    profile.wallet -= wager;
                    updateProfile(user.id, profile);
                    return context.reply(`🪙 **Coinflip Result:** The coin landed on **${coinSide.toUpperCase()}**! Bad luck, your position was wiped out. Lost \`-$${wager.toLocaleString()}\`.`);
                }
            }
        },

        // 7. SLOTS
        {
            name: 'slots',
            description: 'Run structural luck indicators across localized random matching slot reels.',
            options: [{ name: 'bet', description: 'Amount to gamble', type: 4, required: true }],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const user = isSlash ? context.user : context.author;
                const profile = getProfile(user.id);
                const bet = isSlash ? context.options.getInteger('bet') : parseInt(args?.[0]);

                if (!bet || isNaN(bet) || bet <= 0) return context.reply('❌ Enter a valid wager calculation amount.');
                if (profile.wallet < bet) return context.reply('❌ Insufficient financial wallet balance assets to complete operations.');

                const reels = ['🍒', '🍋', '💎', '🍀'];
                const r1 = reels[Math.floor(Math.random() * reels.length)];
                const r2 = reels[Math.floor(Math.random() * reels.length)];
                const r3 = reels[Math.floor(Math.random() * reels.length)];

                const matchedAll = (r1 === r2 && r2 === r3);
                const matchedTwo = (r1 === r2 || r2 === r3 || r1 === r3);

                let payout = 0;
                let statusMsg = "";

                if (matchedAll) {
                    payout = bet * 4;
                    profile.wallet += payout;
                    statusMsg = `💎 **JACKPOT MATCH!** You won 4x return multipliers: \`+$${payout}\``;
                } else if (matchedTwo) {
                    payout = bet * 1.5;
                    profile.wallet += Math.floor(payout);
                    statusMsg = `✨ **Partial Alignment!** You won a stable return margin: \`+$${Math.floor(payout)}\``;
                } else {
                    profile.wallet -= bet;
                    statusMsg = `❌ **Zero Alignment Match.** The machine captured your wager token: \`-$${bet}\``;
                }

                updateProfile(user.id, profile);
                return context.reply(`🎰 **[ ${r1} | ${r2} | ${r3} ]**\n\n${statusMsg}`);
            }
        },

        // 8. CRIME
        {
            name: 'crime',
            description: 'High-risk execution attempt providing erratic extreme financial spikes.',
            async run(context) {
                const user = context.isCommand?.() ? context.user : context.author;
                const profile = getProfile(user.id);
                const cooldown = 14400000; // 4 hours

                if (Date.now() - profile.lastCrime < cooldown) {
                    return context.reply(`🚨 **Under Surveillance:** Local security authorities are tracking you. Lay low for another \`${Math.floor((cooldown - (Date.now() - profile.lastCrime)) / 60000)}\` minutes.`);
                }

                const isSuccessful = Math.random() > 0.45; // 55% win chance
                profile.lastCrime = Date.now();

                if (isSuccessful) {
                    const gain = Math.floor(Math.random() * 1500) + 800; // $800 - $2300
                    profile.wallet += gain;
                    updateProfile(user.id, profile);
                    return context.reply(`🥷 **Heist Success:** You breached an offline corporate server mainframe and transferred \`+$${gain.toLocaleString()}\` directly into your offshore account.`);
                } else {
                    const penalty = Math.floor(Math.random() * 500) + 300;
                    profile.wallet = Math.max(0, profile.wallet - penalty);
                    updateProfile(user.id, profile);
                    return context.reply(`🚨 **Heist Failure:** You triggered a local perimeter sensor silent firewall and paid \`-$${penalty}\` in extraction bail costs.`);
                }
            }
        },

        // 9. ROB
        {
            name: 'rob',
            description: 'Attempt to bypass and siphon cash holdings directly from another user wallet container.',
            options: [{ name: 'target', description: 'User profile entity to target', type: 6, required: true }],
            async run(context) {
                const isSlash = context.isCommand?.();
                const user = isSlash ? context.user : context.author;
                const target = isSlash ? context.options.getUser('target') : context.mentions.users.first();

                if (!target || target.id === user.id) return context.reply('❌ You cannot siphon assets from your own account signature identity blocks.');

                const userProfile = getProfile(user.id);
                const targetProfile = getProfile(target.id);
                const cooldown = 7200000; // 2 hours

                if (Date.now() - userProfile.lastRob < cooldown) {
                    return context.reply(`⏳ **Tracking Cooldown:** Your telemetry signatures are too hot. Wait \`${Math.floor((cooldown - (Date.now() - userProfile.lastRob)) / 60000)}\` minutes.`);
                }

                if (targetProfile.wallet < 200) return context.reply('❌ This target has insufficient active wallet cash to justify an operational run.');
                if (userProfile.wallet < 200) return context.reply('❌ You need at least \`$200\` cash in your wallet to cover operational costs if your execution fails.');

                userProfile.lastRob = Date.now();

                // Check for protective kinetic shield asset parameter checks
                if (targetProfile.inventory['shield'] && targetProfile.inventory['shield'] > 0) {
                    targetProfile.inventory['shield']--;
                    const penalty = 200;
                    userProfile.wallet = Math.max(0, userProfile.wallet - penalty);
                    targetProfile.bank += penalty; // Transfer bail fine directly to target's secure asset accounts

                    updateProfile(user.id, userProfile);
                    updateProfile(target.id, targetProfile);
                    return context.reply(`🛡️ **Countermeasures Activated:** ${target.username} had a **Kinetic Shield** active! Your infiltration attempt bounced back, destroying their shield, and fining you \`-$${penalty}\`.`);
                }

                const robSuccess = Math.random() > 0.5; // 50/50 Chance
                if (robSuccess) {
                    const maximumSteal = Math.floor(targetProfile.wallet * 0.4); // steal up to 40%
                    const stolen = Math.floor(Math.random() * maximumSteal) + 50;

                    targetProfile.wallet -= stolen;
                    userProfile.wallet += stolen;

                    updateProfile(user.id, userProfile);
                    updateProfile(target.id, targetProfile);
                    return context.reply(`💸 **Extraction Clean:** You successfully siphoned \`+$${stolen.toLocaleString()}\` out of ${target.username}'s active wallet.`);
                } else {
                    const structuralLoss = Math.floor(userProfile.wallet * 0.15); // lose 15% wallet
                    userProfile.wallet -= structuralLoss;
                    targetProfile.wallet += structuralLoss; // Victim compensation rewards layer

                    updateProfile(user.id, userProfile);
                    updateProfile(target.id, targetProfile);
                    return context.reply(`❌ **Operation Failed:** You dropped your identification documents while escaping! You paid \`-$${structuralLoss}\` to ${target.username} as settlement fines.`);
                }
            }
        },

        // 10. SHOP
        {
            name: 'shop',
            description: 'Displays all available premium utility item modifications listed across the grid catalog.',
            async run(context) {
                const embed = new EmbedBuilder()
                    .setTitle('🛒 Network Central Item Shop')
                    .setColor(0x3498DB)
                    .setDescription('Acquire tools and items to boost your productivity or secure your assets against thieves.\nUse `.buy <item_id>` or `/buy` to purchase.')
                    .setTimestamp();

                for (const [id, item] of Object.entries(SHOP_ITEMS)) {
                    embed.addFields({ name: `${item.name} [\`${id}\`]`, value: `Price: \`$${item.price.toLocaleString()}\`\n*${item.desc}*`, inline: false });
                }
                return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
            }
        },

        // 11. BUY
        {
            name: 'buy',
            description: 'Purchase an asset module catalog component using available wallet reserves.',
            options: [{ name: 'item', description: 'Item ID keyword code to purchase', type: 3, required: true }],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const user = isSlash ? context.user : context.author;
                const itemId = isSlash ? context.options.getString('item') : args?.[0]?.toLowerCase();

                if (!itemId || !SHOP_ITEMS[itemId]) return context.reply('❌ Target item designation not found. Use `.shop` to scan valid entries.');

                const profile = getProfile(user.id);
                const targetedAsset = SHOP_ITEMS[itemId];

                if (profile.wallet < targetedAsset.price) return context.reply(`❌ Insufficient physical cash balance. You need \`$${targetedAsset.price}\` to execute this request.`);

                profile.wallet -= targetedAsset.price;

                // Handle instant upgrade items vs inventory stacked modules
                if (itemId === 'vault') {
                    profile.bankSpace += 5000;
                } else {
                    profile.inventory[itemId] = (profile.inventory[itemId] || 0) + 1;
                }

                updateProfile(user.id, profile);
                return context.reply(`✅ **Transaction Processed:** Successfully purchased 1x **${targetedAsset.name}** module.`);
            }
        },

        // 12. INVENTORY
        {
            name: 'inventory',
            description: 'Inspect all owned technical properties and active power utility modules.',
            async run(context) {
                const user = context.isCommand?.() ? context.user : context.author;
                const profile = getProfile(user.id);

                const embed = new EmbedBuilder()
                    .setTitle(`🎒 Asset Inventory Ledger: ${user.username}`)
                    .setColor(0xF1C40F)
                    .setTimestamp();

                let empty = true;
                let descStr = "";

                for (const [id, qty] of Object.entries(profile.inventory)) {
                    if (qty > 0 && SHOP_ITEMS[id]) {
                        empty = false;
                        descStr += `• **${SHOP_ITEMS[id].name}** — Quantity Count: \`x${qty}\` [Code ID: \`${id}\`]\n`;
                    }
                }

                if (empty) descStr = "*Your asset profile ledger database has no entries registered.*";
                embed.setDescription(descStr);

                return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
            }
        },

        // 13. GIVE (PAY)
        {
            name: 'give',
            description: 'Transfer cash directly to another server user.',
            options: [
                { name: 'target', description: 'User profile to accept payload', type: 6, required: true },
                { name: 'amount', description: 'Amount of cash to transfer', type: 4, required: true }
            ],
            async run(context, args) {
                const isSlash = context.isCommand?.();
                const user = isSlash ? context.user : context.author;
                const target = isSlash ? context.options.getUser('target') : context.mentions.users.first();
                const amount = isSlash ? context.options.getInteger('amount') : parseInt(args?.[1]);

                if (!target || target.id === user.id) return context.reply('❌ Invalid execution profile route targets.');
                if (!amount || isNaN(amount) || amount <= 0) return context.reply('❌ Input a valid transfer capital integer payload.');

                const senderProfile = getProfile(user.id);
                if (senderProfile.wallet < amount) return context.reply('❌ Active transaction rejected due to insufficient cash liquidity balance.');

                const receiverProfile = getProfile(target.id);
                senderProfile.wallet -= amount;
                receiverProfile.wallet += amount;

                updateProfile(user.id, senderProfile);
                updateProfile(target.id, receiverProfile);

                return context.reply(`💸 **Wire Transfer Successful:** Dispatched \`$${amount.toLocaleString()}\` assets over to **${target.username}**.`);
            }
        },

        // 14. LEADERBOARD
        {
            name: 'economyleaderboard',
            description: 'Displays global community wealth rankings across server nodes.',
            async run(context) {
                if (!fs.existsSync(DB_PATH)) return context.reply('❌ System records engine empty.');

                const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
                const sorted = Object.entries(data).map(([id, prof]) => {
                    return { id, total: (prof.wallet + prof.bank) };
                }).sort((a, b) => b.total - a.total).slice(0, 10);

                const embed = new EmbedBuilder()
                    .setTitle('🏆 Global Network Wealth Rankings')
                    .setColor(0xE74C3C)
                    .setTimestamp();

                let rankStr = "";
                for (let i = 0; i < sorted.length; i++) {
                    const u = context.client.users.cache.get(sorted[i].id);
                    const tag = u ? u.username : `Ident-Hash [${sorted[i].id.slice(0, 5)}]`;
                    rankStr += `**#${i + 1}** \`${tag}\` — Net Worth value: \`$${sorted[i].total.toLocaleString()}\` \n`;
                }

                if (sorted.length === 0) rankStr = "*No profile trackers registered.*";
                embed.setDescription(rankStr);

                return context.isCommand?.() ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] });
            }
        },

        // 15. ECONOMY RESET (ADMIN ONLY)
        {
            name: 'economyreset',
            description: 'Wipes all transactional files instantly across the local ecosystem ledger.',
            permissions: [PermissionFlagsBits.Administrator],
            async run(context) {
                fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 4));
                return context.reply('🧹 **Database Purge Complete:** Re-initialized all local financial ledger files. Ecosystem balance zeroed.');
            }
        }
    ]
};
