const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'vkey',
    // Sincronizado com seu index.js: (message, args, client, dbMySQL)
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para verificar detalhes de keys!");
        }

        const key = args[0];
        if (!key) return message.reply("❌ Uso correto: `!vkey XMP-XXXXX`平衡");

        try {
            // 2. Busca a key exata no banco da Aiven
            const [rows] = await dbMySQL.query("SELECT * FROM `keys` WHERE `key_code` = ?", [key]);
            
            if (rows.length === 0) {
                return message.reply("❌ Essa key não existe no banco de dados.");
            }

            const k = rows[0];

            // 3. Montagem da Embed de detalhes
            const embed = new EmbedBuilder()
                .setTitle("🔍 INFORMAÇÕES TÉCNICAS DA KEY")
                .setThumbnail(process.env.LOGO_URL || null)
                .addFields(
                    { name: "🔑 Código", value: `\`${k.key_code}\``, inline: false },
                    { name: "📊 Status", value: `\`${k.status.toUpperCase()}\``, inline: true },
                    { name: "⏰ Duração", value: `\`${k.duracao_dias} dias\``, inline: true },
                    { name: "📅 Criada em", value: `\`${new Date(k.created_at).toLocaleDateString('pt-BR')}\``, inline: false },
                    { name: "👤 Usada por", value: `\`${k.used_by || "Ninguém ainda"}\``, inline: false }
                )
                .setColor(k.status === 'disponivel' ? 0x00FF00 : 0xFF0000)
                .setTimestamp()
                .setFooter({ text: "Consulta de Licenças XMP" });

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao verificar key:", error);
            return message.reply("❌ Erro ao consultar o banco de dados.");
        }
    }
};