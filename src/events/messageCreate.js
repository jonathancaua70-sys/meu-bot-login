module.exports = {
    name: 'messageCreate',
    async execute(message, client, dbMySQL, enviarLog, CONFIGS) {
        const PREFIXO = "!";
        if (!message.content.startsWith(PREFIXO) || message.author.bot) return;

        const args = message.content.slice(PREFIXO.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            await command.execute(message, args, dbMySQL, enviarLog, CONFIGS);
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao executar o comando.");
        }
    }
};