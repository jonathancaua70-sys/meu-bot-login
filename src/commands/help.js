const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'help',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle('📋 COMANDOS DISPONÍVEIS')
            .setDescription('Aqui estão todos os comandos do bot:')
            .addFields(
                { name: '🔑 Keys', value: '`!gerar` `!vkey` `!delkey` `!keys`', inline: false },
                { name: '👤 Usuários', value: '`!info` `!addtempo` `!resetar` `!setfoto`', inline: false },
                { name: '⚙️ Sistema', value: '`!painel` `!help` `!entrar` `!sair`', inline: false }
            )
            .setFooter({ text: "XMP System", iconURL: CONFIGS.LOGO_URL })
            .setTimestamp();
        
        message.reply({ embeds: [embed] });
    }
};