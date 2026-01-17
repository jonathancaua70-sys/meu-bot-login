require("dotenv").config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const dbMySQL = require('./src/database/db.js'); // Ajuste o caminho se necessário
const { iniciarAPI } = require('./src/api/server.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- FUNÇÃO DE LOGS NO DISCORD ---
// Se você criar uma variável LOG_CHANNEL_ID no Render, os logs vão para esse canal.
const enviarLog = async (client, titulo, descricao, cor = 0x7D26CD) => {
    const canalLog = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (!canalLog) return;

    const embed = new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(descricao)
        .setColor(cor)
        .setTimestamp();
    
    canalLog.send({ embeds: [embed] });
};

// --- CARREGAR COMANDOS ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, "src/commands"); // Caminho da sua pasta de comandos
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.name) {
        client.commands.set(command.name, command);
        console.log(`✅ Comando carregado: ${file}`);
    }
}

// --- GATEWAY DE MENSAGENS ---
client.on("messageCreate", async (message) => {
    const PREFIXO = "!";
    if (!message.content.startsWith(PREFIXO) || message.author.bot) return;

    const args = message.content.slice(PREFIXO.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        // Envia exatamente os parâmetros que os arquivos de comando esperam
        await command.execute(message, args, client, dbMySQL, enviarLog);
    } catch (error) {
        console.error("Erro no comando:", error);
        message.reply("❌ Houve um erro interno ao processar este comando!");
    }
});

// --- INICIALIZAÇÃO ---
client.once("ready", () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);
    
    // Inicia a API de login junto com o Bot na mesma porta
    // Passamos o db, a função de log e o client para a API poder interagir com o Discord
    iniciarAPI(dbMySQL, enviarLog, client);
});

client.login(process.env.TOKEN);