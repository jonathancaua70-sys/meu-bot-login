module.exports = {
    name: 'migrar',
    async execute(message, args, client, dbMySQL) {
        if (!message.member.permissions.has("Administrator")) return;

        try {
            // Adicionar colunas à tabela usuarios
            await dbMySQL.query(`
                ALTER TABLE usuarios 
                ADD COLUMN IF NOT EXISTS usuario VARCHAR(50) UNIQUE AFTER id,
                ADD COLUMN IF NOT EXISTS senha VARCHAR(255) AFTER usuario,
                ADD COLUMN IF NOT EXISTS discord_id VARCHAR(50) AFTER senha
            `);

            message.reply("✅ **Migração concluída!** Colunas `usuario`, `senha` e `discord_id` adicionadas à tabela `usuarios`.");
            
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao executar migração: " + error.message);
        }
    }
};
