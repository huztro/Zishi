const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');

const LEVEL_DB =
    path.join(__dirname, '../levels.json');

if (!fs.existsSync(LEVEL_DB)) {

    fs.writeFileSync(
        LEVEL_DB,
        JSON.stringify({}, null, 4)
    );
}

function getLevels() {

    return JSON.parse(
        fs.readFileSync(LEVEL_DB, 'utf8')
    );
}

function saveLevels(data) {

    fs.writeFileSync(
        LEVEL_DB,
        JSON.stringify(data, null, 4)
    );
}

module.exports = (client) => {

    client.on(Events.MessageCreate, async (message) => {

        if (!message.guild) return;
        if (message.author.bot) return;

        const data = getLevels();

        if (!data[message.author.id]) {

            data[message.author.id] = {
                xp: 0,
                level: 1
            };
        }

        const profile =
            data[message.author.id];

        const xpGain =
            Math.floor(Math.random() * 15) + 5;

        profile.xp += xpGain;

        const neededXP =
            profile.level * 100;

        if (profile.xp >= neededXP) {

            profile.level += 1;
            profile.xp = 0;

            message.channel.send({
                content:
                    `🎉 ${message.author} leveled up to level ${profile.level}!`
            });
        }

        saveLevels(data);
    });
};
