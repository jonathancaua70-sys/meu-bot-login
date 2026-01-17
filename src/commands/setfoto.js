const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'setfoto',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sem permissão!");
        const user = args[0];
        const foto = args[1];
        if (!user || !foto) return message.reply("❌ Uso: `!setfoto usuario link`");

        await dbMySQL.query("UPDATE usuarios SET foto_url = ? WHERE usuario = ?", [foto, user]);
        message.reply(`✅ Foto de **${user}** atualizada!`);
    }
};