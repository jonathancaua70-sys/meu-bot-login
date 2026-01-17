const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Dentro de algum comando seu:
const embed = new EmbedBuilder()
    .setTitle("🛒 ATIVAÇÃO DE LICENÇA")
    .setDescription("Clique no botão abaixo para resgatar sua key e criar sua conta.")
    .setColor(0x7D26CD);

const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('abrir_registro')
        .setLabel('Resgatar Key')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔑')
);

message.channel.send({ embeds: [embed], components: [row] });