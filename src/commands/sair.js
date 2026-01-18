const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    name: 'sair',
    async execute(message, args, dbMySQL, enviarLog, CONFIGS) {
        const connection = getVoiceConnection(message.guild.id);

        if (connection) {
            connection.destroy();
            enviarLog(message.client, "🔈 BOT SAIU DA CALL", `Admin: ${message.author.tag}`, 0xFF0000, CONFIGS.LOGO_URL);
            message.reply("👋 Saí da call!");
        } else {
            message.reply("❌ Eu não estou em nenhum canal de voz!");
        }
    }
};