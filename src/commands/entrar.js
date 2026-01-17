const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    name: 'entrar',
    async execute(message) {
        const canalVoz = message.member.voice.channel;

        if (!canalVoz) {
            return message.reply("❌ Você precisa estar em um canal de voz para eu entrar!");
        }

        joinVoiceChannel({
            channelId: canalVoz.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        message.reply(`✅ Conectado ao canal **${canalVoz.name}**!`);
    }
};