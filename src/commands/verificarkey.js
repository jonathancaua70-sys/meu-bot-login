const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'vkey',
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para verificar detalhes de keys!");
        }

        const key = args[0];
        if (!key) return message.reply("❌ Uso correto: `!vkey XMP-XXXXX`平衡");

        // Lista das suas tabelas de produtos
        const tabelas = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
        
        let keyEncontrada = null;
        let painelNome = "";

        try {
            // 2. Varredura: O bot testa a key em cada tabela
            for (const tabela of tabelas) {
                const [rows] = await dbMySQL.query(`SELECT * FROM \`${tabela}\` WHERE \`codigo\` = ?`, [key]);
                
                if (rows.length > 0) {
                    keyEncontrada = rows[0];
                    painelNome = tabela.replace('keys_', '').toUpperCase(); // Ex: EXT_PRE
                    break; // Para de procurar se achar
                }
            }
            
            if (!keyEncontrada) {
                return message.reply("❌ Essa key não existe em nenhuma das tabelas de painéis.");
            }

            const k = keyEncontrada;

            // 3. Montagem da Embed com informações detalhadas
            const embed = new EmbedBuilder()
                .setTitle("🔍 DETALHES TÉCNICOS DA LICENÇA")
                .setThumbnail(process.env.LOGO_URL || null)
                .addFields(
                    { name: "🔑 Código", value: `\`${k.codigo}\``, inline: false },
                    { name: "📦 Painel Alvo", value: `\`${painelNome}\``, inline: true },
                    { name: "📊 Status", value: `\`${k.status.toUpperCase()}\``, inline: true },
                    { name: "⏰ Duração", value: `\`${k.dias} dias\``, inline: true },
                    { name: "📅 Criada em", value: `\`${new Date(k.data_criacao).toLocaleDateString('pt-BR')}\``, inline: false },
                    { name: "👤 Usada por", value: `\`${k.usada_por || "Ninguém ainda"}\``, inline: false }
                )
                .setColor(k.status === 'disponivel' ? 0x00FF00 : 0xFF0000)
                .setTimestamp()
                .setFooter({ text: `Banco de Dados: defaultdb | Tabela: keys_${painelNome.toLowerCase()}` });

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao verificar key:", error);
            return message.reply("❌ Erro técnico ao consultar as tabelas do MySQL.");
        }
    }
};