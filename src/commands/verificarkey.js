const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'vkey',
    async execute(message, args, client, dbMySQL) { 
        
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Permissão negada.");
        }

        const key = args[0];
        if (!key) return message.reply("❌ Uso: `!vkey XMP-XXXXX`平衡");

        const tabelas = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
        let keyEncontrada = null;
        let painelNome = "";

        try {
            for (const tabela of tabelas) {
                // Usamos backticks para proteger o nome da tabela
                const [rows] = await dbMySQL.query(`SELECT * FROM \`${tabela}\` WHERE \`codigo\` = ?`, [key]);
                
                if (rows.length > 0) {
                    keyEncontrada = rows[0];
                    painelNome = tabela;
                    break;
                }
            }
            
            if (!keyEncontrada) {
                return message.reply("❌ Key não encontrada em nenhuma tabela.");
            }

            const k = keyEncontrada;

            // Formata a data com segurança (caso a coluna não exista ou seja nula)
            const dataCriacao = k.data_criacao ? new Date(k.data_criacao).toLocaleDateString('pt-BR') : "Não registrada";

            const embed = new EmbedBuilder()
                .setTitle("🔍 DETALHES DA LICENÇA")
                .setColor(k.status === 'disponivel' ? 0x00FF00 : 0xFF0000)
                .addFields(
                    { name: "🔑 Código", value: `\`${k.codigo}\``, inline: false },
                    { name: "📊 Status", value: `\`${(k.status || 'N/A').toUpperCase()}\``, inline: true },
                    { name: "⏰ Duração", value: `\`${k.dias} dias\``, inline: true },
                    { name: "📅 Criada em", value: `\`${dataCriacao}\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `Tabela: ${painelNome}` });

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("ERRO NO VKEY:", error);
            // Se der erro, ele vai dizer exatamente qual coluna está faltando no Log do Render
            return message.reply("❌ Erro no banco de dados. Verifique os logs do Render.");
        }
    }
};