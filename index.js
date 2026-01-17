require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const dbMySQL = require('./db.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Coleções para comandos
client.commands = new Collection();

// --- CARREGAR COMANDOS DA PASTA /commands ---
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Verifica se o arquivo tem a estrutura correta para ser carregado
    if (command.name) {
        client.commands.set(command.name, command);
        console.log(`✅ Comando carregado: ${file}`);
    }
}

// --- GATEWAY DE MENSAGENS (Executa os comandos) ---
client.on("messageCreate", async (message) => {
    const PREFIXO = "!";
    if (!message.content.startsWith(PREFIXO) || message.author.bot) return;

    const args = message.content.slice(PREFIXO.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args, client, dbMySQL);
    } catch (error) {
        console.error(error);
        message.reply("❌ Houve um erro ao executar este comando!");
    }
});

// --- API EXPRESS (Para o Painel e Health Check) ---
app.use(express.json());
app.get('/', (req, res) => res.send("XMP API Online"));

// Aqui você pode colocar as rotas de /login e /web-registro que estavam no código anterior
// ...

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API Rodando na porta ${PORT}`));

client.once("ready", () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);
});

client.login(process.env.TOKEN);