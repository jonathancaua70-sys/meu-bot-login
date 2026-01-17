require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();

// --- CORREÇÃO DO CAMINHO DO BANCO DE DADOS ---
// Antes estava './db.js', mas seu arquivo está em 'src/database/db.js'
const dbMySQL = require('./src/database/db.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();

// --- CORREÇÃO DO CAMINHO DOS COMANDOS ---
// Precisamos incluir a pasta "src" no caminho
const commandsPath = path.join(__dirname, "src", "commands");

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if (command.name) {
            client.commands.set(command.name, command);
            console.log(`✅ Comando carregado: ${file}`);
        }
    }
} else {
    console.error("❌ Erro: Pasta src/commands não encontrada!");
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
        await command.execute(message, args, client, dbMySQL);
    } catch (error) {
        console.error(error);
        message.reply("❌ Houve um erro ao executar este comando!");
    }
});

// --- API EXPRESS ---
app.use(express.json());
app.get('/', (req, res) => res.send("XMP API Online"));

// Rota de login (Exemplo para o seu .exe)
app.post('/login', async (req, res) => {
    // A lógica de login deve ser importada ou escrita aqui
    res.json({ message: "API Pronta para receber logins" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API Rodando na porta ${PORT}`));

client.once("ready", () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
