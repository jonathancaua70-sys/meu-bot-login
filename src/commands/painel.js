const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    name: 'painel',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle('🔐 ATIVAÇÃO PREMIUM')
            .setDescription('Clique no botão abaixo para ativar sua Key.')
            .setImage(CONFIGS.BANNER_VENDA);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_registro').setLabel('Ativar Key').setStyle(ButtonStyle.Success).setEmoji('🔑')
        );

        message.channel.send({ embeds: [embed], components: [row] });
    }
};