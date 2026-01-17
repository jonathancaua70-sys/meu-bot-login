const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'deletarkey',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sem permissão!");
        const key = args[0];
        if (!key) return message.reply("❌ Uso: `!deletarkey XMP-XXXXX`");

        const [result] = await dbMySQL.query("DELETE FROM `keys` WHERE `key_code` = ?", [key]);
        if (result.affectedRows === 0) return message.reply("❌ Key não encontrada!");

        enviarLog(message.client, "🗑️ KEY DELETADA", `Admin: ${message.author.tag}\nKey: ${key}`, 0xFF0000, CONFIGS.LOGO_URL);
        message.reply(`✅ Key \`${key}\` deletada!`);
    }
};