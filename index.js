require("dotenv").config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const dbMySQL = require('./src/database/db.js');
const { iniciarAPI } = require('./src/api/server.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- FUNÇÃO DE LOGS ---
const enviarLog = async (client, titulo, descricao, cor = 0x7D26CD) => {
    try {
        const canalLog = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
        if (!canalLog) return;

        const embed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descricao)
            .setColor(cor)
            .setTimestamp();
        
        await canalLog.send({ embeds: [embed] });
    } catch (err) {
        console.error("Erro ao enviar log para o canal:", err.message);
    }
};

// --- CARREGAR COMANDOS ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, "src/commands");
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.name) {
            client.commands.set(command.name, command);
            console.log(`✅ Comando carregado: ${file}`);
        }
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
        // Passa o dbMySQL e enviarLog para os comandos
        await command.execute(message, args, client, dbMySQL, enviarLog);
    } catch (error) {
        console.error(`Erro ao executar comando ${commandName}:`, error);
        message.reply("❌ Ocorreu um erro ao processar este comando no banco de dados.");
    }
});

// --- GATEWAY DE INTERAÇÕES (BOTÕES E MODAIS) ---
client.on("interactionCreate", async (interaction) => {
    try {
        const eventHandler = require('./src/events/interactionCreate.js');
        await eventHandler.execute(interaction, client, dbMySQL, enviarLog);
    } catch (error) {
        console.error("Erro ao processar interação:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ Erro interno ao processar sua solicitação.", ephemeral: true });
        }
    }
});

// --- INICIALIZAÇÃO COM VERIFICAÇÃO DE BANCO ---
client.once("ready", async () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);

    try {
        console.log("⏳ Testando conexão com MySQL na Aiven...");
        // O MySQL da Aiven pode demorar a responder no primeiro ping
        await dbMySQL.query("SELECT 1");
        console.log("✅ Conexão MySQL: OK");

        // Só inicia a API se o banco de dados estiver funcionando
        iniciarAPI(dbMySQL, enviarLog, client);
    } catch (err) {
        console.error("❌ ERRO CRÍTICO: Não foi possível conectar ao banco de dados!");
        console.error("Detalhe do erro:", err.message);
        console.log("⚠️ Verifique se o IP 0.0.0.0/0 está liberado no painel da Aiven.");
    }
});

// Tratamento de erros globais para evitar que o bot caia no Render
process.on('unhandledRejection', error => console.error('Erro não tratado:', error));

client.login(process.env.TOKEN);
