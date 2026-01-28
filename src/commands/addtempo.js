const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'addtempo',
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão de Admin
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para usar este comando!");
        }

        const usuarioNome = args[0];
        const dias = parseInt(args[1]);

        if (!usuarioNome || isNaN(dias)) {
            return message.reply("❌ Uso correto: `!addtempo usuario dias` (ex: `!addtempo joao 30`)");
        }

        try {
            // 2. Verifica se o usuário existe (usando os nomes novos das colunas)
            const [rows] = await dbMySQL.query("SELECT data_expiracao, plano_ativo FROM usuarios WHERE usuario = ?", [usuarioNome]);
            
            if (rows.length === 0) {
                return message.reply(`❌ O usuário **${usuarioNome}** não foi encontrado.`);
            }

            // 3. Atualização Inteligente
            // Ajustado para 'data_expiracao' conforme a nova estrutura
            await dbMySQL.query(
                `UPDATE usuarios SET 
                 data_expiracao = IF(data_expiracao > NOW(), DATE_ADD(data_expiracao, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY)) 
                 WHERE usuario = ?`, 
                [dias, dias, usuarioNome]
            );

            console.log(`[LOG] ${dias} dias adicionados para ${usuarioNome} por ${message.author.tag}`);
            
            return message.reply(`✅ **Tempo Adicionado!**\n👤 Usuário: \`${usuarioNome}\`\n➕ Dias: \`${dias}\`\n📅 A validade foi estendida com sucesso.`);

        } catch (error) {
            console.error("Erro ao adicionar tempo:", error);
            return message.reply("❌ Erro ao processar a alteração no banco de dados.");
        }
    }
};