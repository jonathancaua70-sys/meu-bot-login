const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'listarkeys',
    async execute(message, args, client, dbMySQL) {
        
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Permissão negada.");
        }

        try {
            // Consulta a quantidade de chaves 'disponiveis' em cada tabela
            const [extAdv] = await dbMySQL.query("SELECT COUNT(*) as total FROM keys_ext_adv WHERE status = 'disponivel'");
            const [extPre] = await dbMySQL.query("SELECT COUNT(*) as total FROM keys_ext_pre WHERE status = 'disponivel'");
            const [intAdv] = await dbMySQL.query("SELECT COUNT(*) as total FROM keys_int_adv WHERE status = 'disponivel'");
            const [intPre] = await dbMySQL.query("SELECT COUNT(*) as total FROM keys_int_pre WHERE status = 'disponivel'");

            const embed = new EmbedBuilder()
                .setColor(0x7D26CD)
                .setTitle("📊 ESTOQUE ATUAL DE LICENÇAS")
                .setDescription("Quantidade de chaves prontas para uso:")
                .addFields(
                    { name: "🟦 External Advanced", value: `\`${extAdv[0].total} un.\``, inline: true },
                    { name: "🟪 External Premium", value: `\`${extPre[0].total} un.\``, inline: true },
                    { name: "\n", value: "\n" }, // Espaçador
                    { name: "🟧 Internal Advanced", value: `\`${intAdv[0].total} un.\``, inline: true },
                    { name: "🟥 Internal Premium", value: `\`${intPre[0].total} un.\``, inline: true }
                )
                .setFooter({ text: "Sistema de Vendas XMP" })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao listar estoque:", error);
            return message.reply("❌ Erro ao consultar tabelas de estoque.");
        }
    }
};