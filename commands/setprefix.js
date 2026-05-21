module.exports = {
    name: 'setprefix',
    description: 'Changes server prefix.',
    permissions: [PermissionFlagsBits.Administrator],

    async run(context, args) {

        const prefix = context.isCommand?.()
            ? context.options.getString('prefix')
            : args[0];

        if (!prefix) {
            return context.reply({
                content: '❌ Usage: `setprefix !`',
                ephemeral: true
            });
        }

        // global in-memory storage (resets on restart)
        global.prefixes ??= {};
        global.prefixes[context.guild.id] = prefix;

        return context.reply({
            content: `✅ Prefix updated to **${prefix}**`
        });
    }
};
