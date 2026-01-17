const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'info',
    // Sincronizado com: (message, args, client, dbMySQL)
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para ver informações de usuários!");
        }

        const usuario = args[0];
        if (!usuario) return message.reply("❌ Uso correto: `!info nome_do_usuario`");

        try {
            // 2. Busca todos os dados na tabela 'usuarios' que você criou
            const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
            
            if (rows.length === 0) {
                return message.reply(`❌ O usuário **${usuario}** não existe no banco de dados.`);
            }

            const user = rows[0];

            // 3. Montagem da Embed com os dados reais do banco
            const embed = new EmbedBuilder()
                .setColor(0x7D26CD)
                .setTitle(`👤 Detalhes do Usuário: ${user.usuario}`)
                .setThumbnail(user.foto_url || process.env.LOGO_URL || null)
                .addFields(
                    { name: "📅 Expira em", value: `\`${new Date(user.expiracao).toLocaleDateString('pt-BR')}\``, inline: true },
                    { name: "🆕 Criado em", value: `\`${new Date(user.created_at).toLocaleDateString('pt-BR')}\``, inline: true },
                    { name: "💻 HWID", value: `\`${user.hwid_vinculado || "Nenhum vinculado"}\``, inline: false },
                    { name: "🌐 Último IP", value: `\`${user.ip_vinculado || "Nenhum registrado"}\``, inline: false }
                )
                .setFooter({ text: "Sistema de Gerenciamento XMP", iconURL: process.env.LOGO_URL })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao buscar info do usuário:", error);
            return message.reply("❌ Erro ao consultar o banco de dados da Aiven.");
        }
    }
};