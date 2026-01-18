const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'comprar_int_pre',
    async execute(message, args, client, dbMySQL) {
        try {
            const [produto] = await dbMySQL.query("SELECT * FROM produto_internal_premium LIMIT 1");
            const [keys] = await dbMySQL.query("SELECT COUNT(*) as total FROM keys_int_pre WHERE status = 'disponivel'");
            
            if (keys[0].total <= 0) return message.reply("❌ Estoque esgotado para **Internal Premium**.");

            const embed = new EmbedBuilder()
                .setTitle("👑 Comprar: Internal Premium")
                .setDescription(`${produto[0]?.descricao || 'Acesso Premium completo'}`)
                .addFields(
                    { name: "💰 Preço", value: `R$ ${produto[0]?.preco || '0.00'}`, inline: true },
                    { name: "📦 Estoque", value: `\`${keys[0].total}\` un.`, inline: true }
                )
                .setColor("#FFD700");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_int_pre').setLabel('🛒 Comprar').setStyle(ButtonStyle.Success)
            );

            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (e) { console.error(e); }
    }
};