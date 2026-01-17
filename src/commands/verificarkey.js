const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'vkey',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sem permissão!");
        const key = args[0];
        if (!key) return message.reply("❌ Uso: `!vkey XMP-XXXXX`");

        const [rows] = await dbMySQL.query("SELECT * FROM `keys` WHERE `key_code` = ?", [key]);
        if (rows.length === 0) return message.reply("❌ Key não encontrada!");

        const k = rows[0];
        const embed = new EmbedBuilder()
            .setTitle("🔍 INFO DA KEY")
            .addFields(
                { name: "Status", value: k.status, inline: true },
                { name: "Duração", value: `${k.duracao_dias} dias`, inline: true },
                { name: "Usada por", value: k.used_by || "Ninguém" }
            )
            .setColor(k.status === 'disponivel' ? 0x00FF00 : 0xFF0000);

        message.reply({ embeds: [embed] });
    }
};