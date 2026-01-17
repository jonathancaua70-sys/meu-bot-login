module.exports = {
    name: 'ready',
    once: true, // Este evento só deve rodar uma vez ao ligar
    execute(client) {
        console.log('-------------------------------------------');
        console.log(`✅ BOT ONLINE: ${client.user.tag}`);
        console.log(`📊 Servidores: ${client.guilds.cache.size}`);
        console.log(`👥 Usuários monitorados: ${client.users.cache.size}`);
        console.log('-------------------------------------------');

        // Define o status do bot (pode ser: PLAYING, WATCHING, LISTENING, STREAMING)
        client.user.setActivity('XMP System | !help', { type: 0 }); // 0 = PLAYING
    },
};