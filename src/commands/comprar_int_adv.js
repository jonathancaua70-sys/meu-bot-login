const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'comprar_int_adv',
    async execute(message, args, client, dbMySQL) {
        try {
            // 1. Busca os dados do produto na tabela específica que criamos
            const [produto] = await dbMySQL.query("SELECT * FROM produto_internal_advanced LIMIT 1");
            
            // 2. Verifica se existem keys disponíveis na sua tabela de estoque
            const [keys] = await dbMySQL.query("SELECT COUNT(*) as total FROM keys_int_adv WHERE status = 'disponivel'");
            const estoque = keys[0].total;

            if (estoque <= 0) {
                return message.reply("❌ Desculpe, o estoque de **Internal Advanced** está esgotado no momento!");
            }

            const embed = new EmbedBuilder()
                .setTitle("🛒 Adquirir: Internal Advanced")
                .setDescription(`${produto[0]?.descricao || 'Acesso completo ao Internal Advanced com suporte.'}`)
                .addFields(
                    { name: "💰 Preço", value: `R$ ${produto[0]?.preco || '0.00'}`, inline: true },
                    { name: "📦 Estoque", value: `\`${estoque}\` unidades`, inline: true }
                )
                .setColor("#5865F2")
                .setFooter({ text: "Clique abaixo para iniciar o pagamento seguro." });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('processar_compra_int_adv')
                        .setLabel('🛒 Comprar Agora')
                        .setStyle(ButtonStyle.Success)
                );

            await message.channel.send({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error("Erro ao carregar produto:", error);
            message.reply("❌ Erro ao conectar com o banco de dados da Aiven.");
        }
    }
};