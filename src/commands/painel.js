const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    name: 'painel',
    // Ajustado para receber os parâmetros na ordem correta do seu index.js
    async execute(message, args, client, dbMySQL, enviarLog) {
        
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle('👤 Criar Nova Conta')
            .setDescription('Clique no botão abaixo para criar sua conta XMP com usuário, senha e key de ativação.')
            // Aqui ele tenta pegar o Banner do .env ou usa uma cor sólida se não existir
            .setImage(process.env.BANNER_VENDA || null) 
            .setFooter({ text: "Sistema de Gerenciamento XMP" })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_registro') // Esse ID ativa o Modal que está no index.js
                .setLabel('Criar Conta')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👤')
        );

        // Deleta a mensagem do comando (!painel) para o canal ficar limpo
        message.delete().catch(() => {}); 

        message.channel.send({ embeds: [embed], components: [row] });
    }
};
