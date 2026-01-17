const { EmbedBuilder } = require("discord.js");

async function enviarLog(client, titulo, descricao, cor, LOGO_URL) {
    const canalID = "1455285942108553246"; 
    const canal = client.channels.cache.get(canalID); 
    if (!canal) return;

    const embed = new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(descricao)
        .setColor(cor)
        .setTimestamp()
        .setFooter({ text: "XMP Monitoramento", iconURL: LOGO_URL });

    try { await canal.send({ embeds: [embed] }); } catch (err) { console.error(err); }
}

module.exports = { enviarLog };