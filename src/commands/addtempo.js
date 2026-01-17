const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'addtempo',
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão de Admin
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para usar este comando!");
        }

        const usuario = args[0];
        const dias = parseInt(args[1]);

        if (!usuario || isNaN(dias)) {
            return message.reply("❌ Uso correto: `!addtempo usuario dias` (ex: `!addtempo joao 30`)");
        }

        try {
            // 2. Verifica se o usuário existe
            const [rows] = await dbMySQL.query("SELECT expiracao, plano FROM usuarios WHERE usuario = ?", [usuario]);
            
            if (rows.length === 0) {
                return message.reply(`❌ O usuário **${usuario}** não foi encontrado no banco de dados.`);
            }

            // 3. Atualização Inteligente
            // Se a expiração for menor que AGORA, ele começa de agora. Se for maior, ele soma.
            await dbMySQL.query(
                `UPDATE usuarios SET 
                 expiracao = IF(expiracao > NOW(), DATE_ADD(expiracao, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY)) 
                 WHERE usuario = ?`, 
                [dias, dias, usuario]
            );

            // 4. Log e Feedback
            console.log(`[LOG] ${dias} dias adicionados para ${usuario} por ${message.author.tag}`);
            
            return message.reply(`✅ **Tempo Adicionado!**\n👤 Usuário: \`${usuario}\`\n➕ Dias: \`${dias}\`\n📅 A nova data foi calculada com sucesso.`);

        } catch (error) {
            console.error("Erro ao adicionar tempo:", error);
            return message.reply("❌ Erro ao processar a alteração no banco de dados.");
        }
    }
};