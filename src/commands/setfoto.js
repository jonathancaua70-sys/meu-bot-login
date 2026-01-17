const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'setfoto',
    // Sincronizado com: (message, args, client, dbMySQL)
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão de Administrador
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para alterar fotos de usuários!");
        }

        const usuario = args[0];
        const fotoUrl = args[1];

        // 2. Validação dos Argumentos
        if (!usuario || !fotoUrl) {
            return message.reply("❌ Uso correto: `!setfoto usuario link_da_imagem`\nExemplo: `!setfoto joao https://site.com/foto.png`平衡");
        }

        // Validação simples de link
        if (!fotoUrl.startsWith('http')) {
            return message.reply("❌ O link da foto deve ser uma URL válida (começando com http ou https).");
        }

        try {
            // 3. Verifica se o usuário existe antes de atualizar
            const [check] = await dbMySQL.query("SELECT usuario FROM usuarios WHERE usuario = ?", [usuario]);
            
            if (check.length === 0) {
                return message.reply(`❌ O usuário **${usuario}** não foi encontrado no banco de dados.`);
            }

            // 4. Atualiza a coluna foto_url na tabela 'usuarios'
            await dbMySQL.query(
                "UPDATE usuarios SET foto_url = ? WHERE usuario = ?", 
                [fotoUrl, usuario]
            );

            // 5. Feedback visual
            console.log(`[LOG] Foto do usuário ${usuario} atualizada por ${message.author.tag}`);
            
            return message.reply({
                content: `✅ Sucesso! A foto de perfil do usuário **${usuario}** foi atualizada.`
            });

        } catch (error) {
            console.error("Erro ao definir foto:", error);
            return message.reply("❌ Erro ao acessar o banco de dados da Aiven.");
        }
    }
};