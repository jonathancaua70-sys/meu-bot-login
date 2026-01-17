const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'resetar',
    // Sincronizado com o seu index.js: (message, args, client, dbMySQL)
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão de Administrador
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para realizar o reset de hardware!");
        }

        const userReset = args[0];
        if (!userReset) return message.reply("❌ Uso correto: `!resetar nome_do_usuario`平衡");

        try {
            // 2. Verifica se o usuário existe antes de tentar o update
            const [check] = await dbMySQL.query("SELECT usuario FROM usuarios WHERE usuario = ?", [userReset]);
            
            if (check.length === 0) {
                return message.reply(`❌ O usuário **${userReset}** não foi encontrado no banco de dados.`);
            }

            // 3. Executa o Reset: Limpa HWID e IP vinculados
            // Isso permite que o usuário use o cheat em uma máquina nova/diferente
            await dbMySQL.query(
                "UPDATE usuarios SET hwid_vinculado = NULL, ip_vinculado = NULL WHERE usuario = ?", 
                [userReset]
            );

            // 4. Feedback no Console/Log
            console.log(`[LOG] HWID/IP de ${userReset} resetado por ${message.author.tag}`);
            
            return message.reply(`✅ O hardware (HWID) e IP de **${userReset}** foram resetados. O próximo login deste usuário será vinculado à máquina que ele utilizar.`);

        } catch (error) {
            console.error("Erro ao resetar HWID:", error);
            return message.reply("❌ Erro ao acessar o banco de dados da Aiven para realizar o reset.");
        }
    }
};