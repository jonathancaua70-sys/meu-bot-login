const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'gerar',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        const dias = parseInt(args[0]) || 30;
        const quantidade = parseInt(args[1]) || 1;
        
        let keysGeradas = [];
        for (let i = 0; i < quantidade; i++) {
            const keyGerada = "XMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
            await dbMySQL.query("INSERT INTO `keys` (`key_code`, `duracao_dias`) VALUES (?, ?)", [keyGerada, dias]);
            keysGeradas.push(keyGerada);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle("🔑 KEYS GERADAS")
            .setDescription(`${keysGeradas.map(k => `\`${k}\``).join('\n')}`)
            .setFooter({ text: `Gerado por ${message.author.tag}`, iconURL: CONFIGS.LOGO_URL });
        
        enviarLog(message.client, "🔑 KEYS GERADAS", `Admin: ${message.author.tag}`, 0x7D26CD, CONFIGS.LOGO_URL);
        message.reply({ embeds: [embed] });
    }
};