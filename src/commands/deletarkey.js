const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'deletarkey',
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão: Apenas administradores podem deletar estoque
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para deletar keys do sistema!");
        }

        const keyAlvo = args[0];
        if (!keyAlvo) {
            return message.reply("❌ **Uso correto:**\n`!deletarkey XMP-XXXXX` (Para uma key específica)\n`!deletarkey ALL` (Para apagar todas as disponíveis)");
        }

        // 2. Lista das tabelas onde as keys podem estar
        const tabelasEstoque = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
        let totalDeletado = 0;

        try {
            if (keyAlvo.toUpperCase() === 'ALL') {
                // Lógica para deletar TODAS as chaves que ainda estão 'disponivel'
                for (const tabela of tabelasEstoque) {
                    const [result] = await dbMySQL.query(
                        `DELETE FROM \`${tabela}\` WHERE \`status\` = 'disponivel'`
                    );
                    totalDeletado += result.affectedRows;
                }
            } else {
                // Lógica para deletar uma KEY ESPECÍFICA em qualquer tabela
                for (const tabela of tabelasEstoque) {
                    const [result] = await dbMySQL.query(
                        `DELETE FROM \`${tabela}\` WHERE \`codigo\` = ?`, 
                        [keyAlvo]
                    );
                    
                    if (result.affectedRows > 0) {
                        totalDeletado = result.affectedRows;
                        break; // Para o loop assim que encontrar e deletar
                    }
                }
            }

            // 3. Feedback do resultado
            if (totalDeletado === 0) {
                return message.reply("❌ Nenhuma key disponível foi encontrada com esses critérios.");
            }

            console.log(`[LOG] ${totalDeletado} key(s) deletada(s) por ${message.author.tag}`); //
            return message.reply(`✅ **Sucesso!** Foram removidas \`${totalDeletado}\` key(s) das tabelas de estoque.`);

        } catch (error) {
            console.error("Erro ao deletar key:", error);
            return message.reply("❌ **Erro no banco de dados:** Não foi possível acessar as tabelas de keys.");
        }
    }
};