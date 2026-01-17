const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'deletarkey',
    async execute(message, args, client, dbMySQL) {
        
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para deletar keys!");
        }

        const key = args[0];
        if (!key) return message.reply("❌ Uso correto: `!deletarkey XMP-XXXXX` ou `!deletarkey ALL` para limpar todas as disponíveis.");

        const tabelas = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
        let totalDeletado = 0;

        try {
            if (key.toLowerCase() === 'all') {
                // Loop para limpar o status 'disponivel' de todas as 4 tabelas
                for (const tabela of tabelas) {
                    const [result] = await dbMySQL.query(`DELETE FROM \`${tabela}\` WHERE \`status\` = 'disponivel'`);
                    totalDeletado += result.affectedRows;
                }
            } else {
                // Busca e deleta a key específica em qualquer uma das tabelas
                for (const tabela of tabelas) {
                    const [result] = await dbMySQL.query(`DELETE FROM \`${tabela}\` WHERE \`codigo\` = ?`, [key]);
                    if (result.affectedRows > 0) {
                        totalDeletado = result.affectedRows;
                        break; // Para o loop se achar e deletar
                    }
                }
            }

            if (totalDeletado === 0) {
                return message.reply("❌ Nenhuma key encontrada para deletar nas tabelas de painéis.");
            }

            console.log(`[LOG] ${totalDeletado} key(s) deletada(s) por ${message.author.tag}`);
            return message.reply(`✅ Sucesso! \`${totalDeletado}\` key(s) removida(s) das tabelas de estoque.`);

        } catch (error) {
            console.error("Erro ao deletar key:", error);
            return message.reply("❌ Erro ao acessar as tabelas do MySQL.");
        }
    }
};