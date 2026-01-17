const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'addtempo',
    // Sincronizado com: (message, args, client, dbMySQL)
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para usar este comando!");
        }

        const usuario = args[0];
        const dias = parseInt(args[1]);

        if (!usuario || isNaN(dias)) {
            return message.reply("❌ Uso correto: `!addtempo usuario dias` (ex: `!addtempo joao 30`)");
        }

        try {
            // 2. Verifica se o usuário existe na tabela 'usuarios'
            const [rows] = await dbMySQL.query("SELECT expiracao FROM usuarios WHERE usuario = ?", [usuario]);
            
            if (rows.length === 0) {
                return message.reply(`❌ O usuário **${usuario}** não foi encontrado no banco de dados.`);
            }

            // 3. Adiciona o tempo à data de expiração atual
            // Usamos DATE_ADD para manipular a coluna 'expiracao' que você criou
            await dbMySQL.query(
                "UPDATE usuarios SET expiracao = DATE_ADD(expiracao, INTERVAL ? DAY) WHERE usuario = ?", 
                [dias, usuario]
            );

            // 4. Feedback visual
            console.log(`[LOG] ${dias} dias adicionados para ${usuario} por ${message.author.tag}`);
            
            return message.reply({
                content: `✅ Sucesso! Foram adicionados **${dias} dias** de licença para o usuário **${usuario}**.`
            });

        } catch (error) {
            console.error("Erro ao adicionar tempo:", error);
            return message.reply("❌ Erro ao processar a alteração no banco de dados da Aiven.");
        }
    }
};