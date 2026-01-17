const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'addtempo',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sem permissão!");
        const usuario = args[0];
        const dias = parseInt(args[1]);
        if (!usuario || !dias) return message.reply("❌ Uso: `!addtempo usuario dias`");

        const [rows] = await dbMySQL.query("SELECT expiracao FROM usuarios WHERE usuario = ?", [usuario]);
        if (rows.length === 0) return message.reply("❌ Usuário não encontrado!");

        await dbMySQL.query("UPDATE usuarios SET expiracao = DATE_ADD(expiracao, INTERVAL ? DAY) WHERE usuario = ?", [dias, usuario]);
        enviarLog(message.client, "⏰ TEMPO ADICIONADO", `Admin: ${message.author.tag}\nUsuário: ${usuario}\nDias: +${dias}`, 0x00FFFF, CONFIGS.LOGO_URL);
        message.reply(`✅ Adicionado **${dias} dias** para **${usuario}**!`);
    }
};