const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'comprar_ext_adv',
    async execute(message, args, client, dbMySQL) {
        try {
            const [produto] = await dbMySQL.query("SELECT * FROM produto_external_advanced LIMIT 1");
            const [keys] = await dbMySQL.query("SELECT COUNT(*) as total FROM keys_ext_adv WHERE status = 'disponivel'");
            
            if (keys[0].total <= 0) return message.reply("❌ Estoque esgotado para **External Advanced**.");

            const embed = new EmbedBuilder()
                .setTitle("⚙️ Comprar: External Advanced")
                .setDescription(`${produto[0]?.descricao || 'Acesso External Advanced'}`)
                .addFields(
                    { name: "💰 Preço", value: `R$ ${produto[0]?.preco || '0.00'}`, inline: true },
                    { name: "📦 Estoque", value: `\`${keys[0].total}\` un.`, inline: true }
                )
                .setColor("#9B59B6");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_ext_adv').setLabel('🛒 Comprar').setStyle(ButtonStyle.Success)
            );

            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (e) { console.error(e); }
    }
};