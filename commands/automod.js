const {
    Events,
    PermissionFlagsBits
} = require('discord.js');

module.exports = (client) => {

    const bannedWords = [
        'shit',
        'discord.gg/',
        'fuck',
        'nigger',
        'bkl'
    ];

    client.on(Events.MessageCreate, async (message) => {

        if (!message.guild) return;
        if (message.author.bot) return;

        // Ignore admins/mods
        if (
            message.member.permissions.has(
                PermissionFlagsBits.ManageMessages
            )
        ) return;

        const content =
            message.content.toLowerCase();

        // =========================
        // ANTI LINK
        // =========================

        const linkRegex =
            /(https?:\/\/|discord\.gg\/|www\.)/i;

        if (linkRegex.test(content)) {

            await message.delete()
                .catch(() => {});

            return message.channel.send({
                content:
                    `🚫 ${message.author} Links are not allowed.`
            });
        }

        // =========================
        // BAD WORD FILTER
        // =========================

        const found =
            bannedWords.find(word =>
                content.includes(word)
            );

        if (found) {

            await message.delete()
                .catch(() => {});

            return message.channel.send({
                content:
                    `🛡️ ${message.author} Watch your language.`
            });
        }
    });
};
