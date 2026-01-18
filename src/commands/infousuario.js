const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'info',
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão Administrativa
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para ver informações de usuários!");
        }

        const usuarioBusca = args[0];
        if (!usuarioBusca) return message.reply("❌ Uso correto: `!info nome_do_usuario`.");

        try {
            // 2. Busca os dados usando os nomes reais das colunas
            const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ?", [usuarioBusca]);
            
            if (rows.length === 0) {
                return message.reply(`❌ O usuário **${usuarioBusca}** não existe no banco de dados.`);
            }

            const user = rows[0];

            // Formatação do plano (ex: keys_ext_pre vira EXT PRE)
            const planoNome = user.plano_ativo ? user.plano_ativo.replace('keys_', '').toUpperCase().replace('_', ' ') : "NENHUM";

            // 3. Montagem da Embed Profissional
            const embed = new EmbedBuilder()
                .setColor(0x7D26CD)
                .setTitle(`👤 Gerenciamento de Usuário: ${user.usuario}`)
                .addFields(
                    { name: "📦 Plano Ativo", value: `\`${planoNome}\``, inline: false },
                    { name: "📅 Expira em", value: user.data_expiracao ? `\`${new Date(user.data_expiracao).toLocaleString('pt-BR')}\`` : "`Sem plano`", inline: true },
                    { name: "📝 Registrado em", value: `\`${new Date(user.data_registro).toLocaleDateString('pt-BR')}\``, inline: true },
                    { name: "💻 HWID", value: `\`${user.hwid || "Não vinculado"}\``, inline: false },
                    { name: "🌐 Endereço IP", value: `\`${user.ip || "Sem registro"}\``, inline: false },
                    { name: "🎫 Key de Origem", value: `\`${user.key_usada || "N/A"}\``, inline: false }
                )
                .setFooter({ text: "Database: Aiven | Sistema Auth XMP" })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao buscar info:", error); //
            return message.reply("❌ Erro ao consultar o banco de dados. Verifique os nomes das colunas.");
        }
    }
};