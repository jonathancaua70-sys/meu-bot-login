const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'resetar',
    // Sincronizado com o seu index.js (recebendo dbMySQL como 4º argumento)
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão de Administrador
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para realizar o reset de hardware!");
        }

        const userReset = args[0];
        if (!userReset) {
            return message.reply("❌ Uso correto: `!resetar nome_do_usuario`.");
        }

        try {
            // 2. Verifica se o usuário existe antes de tentar o reset
            const [check] = await dbMySQL.query("SELECT usuario FROM usuarios WHERE usuario = ?", [userReset]);
            
            if (check.length === 0) {
                return message.reply(`❌ O usuário **${userReset}** não foi encontrado no banco de dados.`);
            }

            // 3. Executa o Reset: Limpa HWID e IP (Nomes de colunas padronizados)
            // Definir como NULL permite que o software capture os novos dados no próximo login
            await dbMySQL.query(
                "UPDATE usuarios SET hwid = NULL, ip = NULL WHERE usuario = ?", 
                [userReset]
            );

            // 4. Log e Feedback
            console.log(`[LOG] HWID/IP de ${userReset} resetado por ${message.author.tag}`);
            
            return message.reply(`✅ **Sucesso!**\n💻 O hardware e IP de **${userReset}** foram limpos.\n🔓 O próximo login será vinculado automaticamente à nova máquina.`);

        } catch (error) {
            console.error("Erro ao resetar HWID:", error);
            return message.reply("❌ Erro ao acessar o banco de dados para realizar o reset. Verifique a conexão.");
        }
    }
};