const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'keys',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sem permissão!");
        const status = args[0] || 'disponivel';
        const [rows] = await dbMySQL.query("SELECT * FROM `keys` WHERE status = ? LIMIT 20", [status]);

        if (rows.length === 0) return message.reply("❌ Nenhuma key encontrada.");

        const lista = rows.map((k, i) => `${i+1}. \`${k.key_code}\` (${k.duracao_dias}d)`).join('\n');
        const embed = new EmbedBuilder()
            .setTitle(`🔑 KEYS ${status.toUpperCase()}`)
            .setDescription(lista)
            .setColor(0x7D26CD);

        message.reply({ embeds: [embed] });
    }
};