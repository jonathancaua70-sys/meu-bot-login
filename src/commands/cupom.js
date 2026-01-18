const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'cupom',
    async execute(message, args, client, dbMySQL) {
        // Apenas ADMs podem gerenciar cupons
        if (!message.member.permissions.has("Administrator")) return;

        const subcomando = args[0]?.toLowerCase();

        try {
            // --- SUBCOMANDO: CRIAR ---
            if (subcomando === 'criar') {
                const codigo = args[1]?.toUpperCase();
                const porcentagem = parseInt(args[2]);
                const usos = parseInt(args[3]) || 10;

                if (!codigo || isNaN(porcentagem)) {
                    return message.reply("❌ **Uso:** `!cupom criar <NOME> <PORCENTAGEM> [USOS]`\nEx: `!cupom criar NATAL10 10 50`.");
                }

                await dbMySQL.query(
                    "INSERT INTO cupons (codigo, desconto_porcentagem, usos_restantes) VALUES (?, ?, ?)",
                    [codigo, porcentagem, usos]
                );
                return message.reply(`✅ **Cupom \`${codigo}\` criado!**\nDesconto: \`${porcentagem}%\`\nLimite de usos: \`${usos}\``);
            }

            // --- SUBCOMANDO: LISTAR ---
            if (subcomando === 'listar') {
                const [rows] = await dbMySQL.query("SELECT * FROM cupons WHERE usos_restantes > 0");
                
                if (rows.length === 0) return message.reply("⚠️ Não há cupons ativos no momento.");

                const embed = new EmbedBuilder()
                    .setTitle("🎟️ Cupons Ativos")
                    .setColor("#7D26CD")
                    .setDescription(rows.map(c => `**${c.codigo}** - ${c.desconto_porcentagem}% off (${c.usos_restantes} usos rest.)`).join('\n'));

                return message.channel.send({ embeds: [embed] });
            }

            // --- SUBCOMANDO: DELETAR ---
            if (subcomando === 'deletar') {
                const codigo = args[1]?.toUpperCase();
                if (!codigo) return message.reply("❌ Digite o nome do cupom para deletar.");

                await dbMySQL.query("DELETE FROM cupons WHERE codigo = ?", [codigo]);
                return message.reply(`🗑️ Cupom \`${codigo}\` removido com sucesso.`);
            }

            // --- AJUDA ---
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🎫 Gerenciamento de Cupons")
                        .addFields(
                            { name: "✨ Criar", value: "`!cupom criar <NOME> <%> <USOS>`" },
                            { name: "📜 Listar", value: "`!cupom listar`" },
                            { name: "🗑️ Deletar", value: "`!cupom deletar <NOME>`" }
                        )
                        .setColor("#7D26CD")
                ]
            });

        } catch (error) {
            console.error(error);
            if (error.code === 'ER_DUP_ENTRY') return message.reply("❌ Este código de cupom já existe!");
            message.reply("❌ Erro ao processar comando de cupom no banco de dados.");
        }
    }
};