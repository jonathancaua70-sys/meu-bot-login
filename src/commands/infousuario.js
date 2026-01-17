const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'info',
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para ver informações de usuários!");
        }

        const usuario = args[0];
        if (!usuario) return message.reply("❌ Uso correto: `!info nome_do_usuario` ou `ID_Discord`平衡");

        try {
            // 2. Busca os dados na tabela 'usuarios'
            const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
            
            if (rows.length === 0) {
                return message.reply(`❌ O usuário **${usuario}** não existe no banco de dados.`);
            }

            const user = rows[0];

            // Formatação amigável do plano
            const planoNome = user.plano ? user.plano.toUpperCase().replace('_', ' ') : "NENHUM";

            // 3. Montagem da Embed
            const embed = new EmbedBuilder()
                .setColor(0x7D26CD)
                .setTitle(`👤 Gerenciamento: ${user.usuario}`)
                .setThumbnail(user.foto_url || process.env.LOGO_URL || null)
                .addFields(
                    { name: "📦 Plano Ativo", value: `\`${planoNome}\``, inline: false },
                    { name: "📅 Expira em", value: user.expiracao ? `\`${new Date(user.expiracao).toLocaleDateString('pt-BR')} ${new Date(user.expiracao).toLocaleTimeString('pt-BR')}\`` : "`Expirado/Sem plano`", inline: true },
                    { name: "🆕 Cliente desde", value: `\`${new Date(user.created_at).toLocaleDateString('pt-BR')}\``, inline: true },
                    { name: "💻 HWID", value: `\`${user.hwid_vinculado || "Não vinculado"}\``, inline: false },
                    { name: "🌐 Endereço IP", value: `\`${user.ip_vinculado || "Sem registro"}\``, inline: false }
                )
                .setFooter({ text: "Database: defaultdb | Sistema XMP" })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao buscar info do usuário:", error);
            return message.reply("❌ Erro ao consultar o banco de dados.");
        }
    }
};