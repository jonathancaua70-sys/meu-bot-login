const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'deletarkey',
    // Ajustado para (message, args, client, dbMySQL) conforme seu index.js
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão de Administrador
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para deletar keys!");
        }

        const key = args[0];
        if (!key) return message.reply("❌ Uso correto: `!deletarkey XMP-XXXXX` ou `!deletarkey ALL` para limpar tudo.");

        try {
            let query;
            let params;

            // Opção extra: Deletar todas as keys disponíveis de uma vez
            if (key.toLowerCase() === 'all') {
                query = "DELETE FROM `keys` WHERE `status` = 'disponivel'";
                params = [];
            } else {
                query = "DELETE FROM `keys` WHERE `key_code` = ?";
                params = [key];
            }

            const [result] = await dbMySQL.query(query, params);

            // 2. Verifica se algo foi realmente deletado
            if (result.affectedRows === 0) {
                return message.reply("❌ Nenhuma key encontrada com esse código ou não há keys disponíveis para deletar.");
            }

            // 3. Feedback visual e log no console
            console.log(`[LOG] ${result.affectedRows} key(s) deletada(s) por ${message.author.tag}`);
            
            return message.reply(`✅ Sucesso! \`${result.affectedRows}\` key(s) removida(s) do banco de dados.`);

        } catch (error) {
            console.error("Erro ao deletar key:", error);
            return message.reply("❌ Erro ao acessar o banco de dados da Aiven.");
        }
    }
};