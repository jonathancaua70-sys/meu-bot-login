const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'resetar',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Sem permissão!");
        }
        const userReset = args[0];
        if (!userReset) return message.reply("❌ Uso: `!resetar usuario`");
        
        await dbMySQL.query("UPDATE usuarios SET hwid_vinculado = NULL WHERE usuario = ?", [userReset]);
        enviarLog(message.client, "🔄 HWID RESETADO", `Admin: ${message.author.tag}\nUsuário: ${userReset}`, 0x00FF00, CONFIGS.LOGO_URL);
        message.reply(`✅ HWID de **${userReset}** resetado com sucesso!`);
    }
};