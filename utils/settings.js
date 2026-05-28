const fs = require('fs');
const path = require('path');

const SETTINGS_DB =
path.join(__dirname, '../data/guildSettings.json');

if (!fs.existsSync(SETTINGS_DB)) {
    fs.writeFileSync(
        SETTINGS_DB,
        JSON.stringify({}, null, 4)
    );
}

function getSettings(guildId) {

    const data =
        JSON.parse(
            fs.readFileSync(SETTINGS_DB, 'utf8')
        );

    if (!data[guildId]) {

        data[guildId] = {
            leveling: false,
            automod: false,
            autoreact: false,
            badwords: [],
            autoreacts: [],
            automodConfig: {
                enabled: false,
                spamFilter: true,
                capsFilter: true,
                mentionFilter: true,
                linkFilter: false,
                badwordFilter: true,
                spamThreshold: 5,
                spamWindow: 5000,
                capsThreshold: 70,
                mentionThreshold: 5,
                logChannel: null
            }
        };

        fs.writeFileSync(
            SETTINGS_DB,
            JSON.stringify(data, null, 4)
        );
    }

    return data[guildId];
}

function saveSettings(guildId, settings) {

    const data =
        JSON.parse(
            fs.readFileSync(SETTINGS_DB, 'utf8')
        );

    data[guildId] = settings;

    fs.writeFileSync(
        SETTINGS_DB,
        JSON.stringify(data, null, 4)
    );
}

module.exports = {
    getSettings,
    saveSettings
};
