const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'info',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sem permissão!");
        const usuario = args[0];
        if (!usuario) return message.reply("❌ Uso: `!info usuario`");

        const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
        if (rows.length === 0) return message.reply("❌ Usuário não encontrado!");

        const user = rows[0];
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle(`👤 INFO: ${user.usuario}`)
            .setThumbnail(user.foto_url || CONFIGS.LOGO_URL)
            .addFields(
                { name: "📅 Expira em", value: new Date(user.expiracao).toLocaleDateString('pt-BR'), inline: true },
                { name: "💻 HWID", value: user.hwid_vinculado || "Não vinculado" }
            );

        message.reply({ embeds: [embed] });
    }
};