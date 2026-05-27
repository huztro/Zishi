const { Events } = require('discord.js');

module.exports = (client) => {

    client.on(Events.MessageCreate, async (message) => {

        if (!message.guild) return;
        if (message.author.bot) return;

        // React if bot is pinged
        if (message.mentions.has(client.user)) {

            try {

                await message.react('👑');

            } catch (err) {}
        }
    });
};
