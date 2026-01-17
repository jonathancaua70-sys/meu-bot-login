require("dotenv").config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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

// --- FUNÇÃO DE LOGS NO DISCORD ---
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
const commandsPath = path.join(__dirname, "src/commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.name) {
        client.commands.set(command.name, command);
        console.log(`✅ Comando carregado: ${file}`);
    }
}

// --- GATEWAY DE MENSAGENS (PREFIXO !) ---
client.on("messageCreate", async (message) => {
    const PREFIXO = "!";
    if (!message.content.startsWith(PREFIXO) || message.author.bot) return;

    const args = message.content.slice(PREFIXO.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        // Passa dbMySQL e enviarLog para os comandos usarem
        await command.execute(message, args, client, dbMySQL, enviarLog);
    } catch (error) {
        console.error("Erro no comando:", error);
        message.reply("❌ Houve um erro interno ao processar este comando!");
    }
});

// --- LISTENER DE INTERAÇÕES (SISTEMA DE RESGATE POR BOTÃO) ---
client.on('interactionCreate', async (interaction) => {
    
    // 1. Abrir Modal ao clicar no botão 'abrir_registro'
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = {
            title: 'Ativação de Licença XMP',
            custom_id: 'modal_resgate',
            components: [{
                type: 1,
                components: [{
                    type: 4,
                    custom_id: 'input_key',
                    label: "Digite sua Key:",
                    style: 1,
                    placeholder: "XMP-XXXX-XXXX",
                    required: true
                }]
            }]
        };
        return await interaction.showModal(modal);
    }

    // 2. Processar Resgate das 4 Tabelas
    if (interaction.isModalSubmit() && interaction.customId === 'modal_resgate') {
        const keyInput = interaction.fields.getTextInputValue('input_key').trim();
        const tabelas = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
        
        await interaction.deferReply({ ephemeral: true });

        try {
            let keyEncontrada = null;
            let planoAlvo = "";

            // Varredura nas tabelas de keys
            for (const tabela of tabelas) {
                const [rows] = await dbMySQL.query(`SELECT * FROM \`${tabela}\` WHERE \`codigo\` = ? AND \`status\` = 'disponivel'`, [keyInput]);
                if (rows.length > 0) {
                    keyEncontrada = rows[0];
                    planoAlvo = tabela.replace('keys_', '');
                    break;
                }
            }

            if (!keyEncontrada) {
                return interaction.editReply("❌ Key inválida ou já utilizada.");
            }

            // Atualiza usuário (Soma tempo ou cria novo)
            await dbMySQL.query(`
                INSERT INTO usuarios (usuario, plano, expiracao) 
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
                ON DUPLICATE KEY UPDATE 
                plano = VALUES(plano), 
                expiracao = IF(expiracao > NOW(), DATE_ADD(expiracao, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY))
            `, [interaction.user.id, planoAlvo, keyEncontrada.dias, keyEncontrada.dias, keyEncontrada.dias]);

            // Desativa a key
            await dbMySQL.query(`UPDATE \`keys_${planoAlvo}\` SET status = 'usada', usada_por = ? WHERE codigo = ?`, [interaction.user.tag, keyInput]);

            // Log no canal de logs
            enviarLog(client, "🔑 LICENÇA ATIVADA", `**Usuário:** <@${interaction.user.id}>\n**Plano:** ${planoAlvo.toUpperCase()}\n**Dias:** ${keyEncontrada.dias}\n**Key:** \`${keyInput}\``, 0x00FF00);

            return interaction.editReply(`✅ **Sucesso!** Plano **${planoAlvo.toUpperCase()}** ativado por **${keyEncontrada.dias} dias**.`);

        } catch (error) {
            console.error(error);
            return interaction.editReply("❌ Erro ao acessar o banco de dados.");
        }
    }
});

// --- INICIALIZAÇÃO ---
client.once("ready", () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);
    iniciarAPI(dbMySQL, enviarLog, client);
});

client.login(process.env.TOKEN);