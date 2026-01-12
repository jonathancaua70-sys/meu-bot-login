require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits 
} = require("discord.js");

const dbMySQL = require('./db.js');
const express = require('express');
const app = express();

app.set('trust proxy', true);
app.use(express.json());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// CONFIGURAÇÕES
const PREFIXO = "!";
const LOGO_URL = "https://cdn.discordapp.com/attachments/1452024671963840594/1454973542260019210/image.png";
const BANNER_VENDA = "https://cdn.discordapp.com/attachments/1452024671963840594/1455221261860081861/image.png"; // Simplificado para exemplo
const MINHA_CHAVE_PIX = "00020126470014BR.GOV.BCB.PIX0125julianalevino@hotmail.com5204000053039865802BR5901N6001C62070503Xmp63048331";

// --- FUNÇÃO DE LOGS ---
async function enviarLog(titulo, descricao, cor) {
    const canal = client.channels.cache.get("1455285942108553246"); 
    if (!canal) return;
    const embed = new EmbedBuilder()
        .setTitle(titulo).setDescription(descricao).setColor(cor)
        .setTimestamp()
        .setFooter({ text: "XMP Monitoramento", iconURL: LOGO_URL });
    try { await canal.send({ embeds: [embed] }); } catch (err) {}
}

// --- ROTA DE LOGIN DO PAINEL (.EXE) ---
app.post('/login', async (req, res) => {
    let { usuario, senha, hwid, ip } = req.body;
    const ipReal = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const finalIp = (ip === "0.0.0.0" || !ip) ? ipReal : ip;

    console.log(`[LOGIN TRY] Usuário: ${usuario} | HWID: ${hwid} | IP: ${finalIp}`);

    if (!usuario || !senha || !hwid) {
        return res.status(400).json({ success: false, message: "Dados incompletos." });
    }

    try {
        const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ? AND senha = ?", [usuario, senha]);

        if (rows.length > 0) {
            const userDb = rows[0];

            if (new Date() > new Date(userDb.expiracao)) {
                return res.status(403).json({ success: false, message: "Sua licença expirou!" });
            }

            if (!userDb.hwid_vinculado) {
                await dbMySQL.query("UPDATE usuarios SET hwid_vinculado = ?, ip_vinculado = ? WHERE usuario = ?", [hwid, finalIp, usuario]);
                enviarLog("💻 NOVO HWID VINCULADO", `Usuário: ${usuario}\nPC: ${hwid}`, 0xFFFF00);
                return res.json({ success: true, message: "PC Vinculado com sucesso!" });
            }

            if (userDb.hwid_vinculado !== hwid) {
                return res.status(403).json({ success: false, message: "Usuário já vinculado a outro PC!" });
            }

            await dbMySQL.query("UPDATE usuarios SET ip_vinculado = ? WHERE usuario = ?", [finalIp, usuario]);
            return res.json({ success: true, message: "Acesso Liberado!" });
        } else {
            return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
        }
    } catch (err) {
        console.error("Erro API:", err);
        res.status(500).json({ success: false, message: "Erro interno no servidor." });
    }
});

// --- INICIAR SISTEMA ---
async function iniciarSistema() {
    try {
        console.log("⏳ Verificando banco Aiven...");
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS usuarios (usuario VARCHAR(255) PRIMARY KEY, senha VARCHAR(255), expiracao DATE, hwid_vinculado VARCHAR(255) DEFAULT NULL, ip_vinculado VARCHAR(255) DEFAULT NULL)`);
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS \`keys\` (\`key\` VARCHAR(255) PRIMARY KEY, dias INTEGER, status VARCHAR(50) DEFAULT 'disponivel')`);
        
        const PORTA = process.env.PORT || 10000;
        app.listen(PORTA, '0.0.0.0', () => console.log(`✅ API Online na porta ${PORTA}`));
        
        client.login(process.env.TOKEN);
    } catch (error) {
        console.error("❌ Erro crítico:", error.message);
    }
}

iniciarSistema();

// --- COMANDOS DO DISCORD ---
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIXO) || message.author.bot) return;
    const args = message.content.slice(PREFIXO.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'resetar') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const userReset = args[0];
        if (!userReset) return message.reply("Uso: !resetar usuario");
        await dbMySQL.query("UPDATE usuarios SET hwid_vinculado = NULL WHERE usuario = ?", [userReset]);
        message.reply(`✅ HWID de **${userReset}** resetado!`);
    }

    if (command === 'gerar') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const dias = parseInt(args[0]) || 30;
        const keyGerada = "XMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        await dbMySQL.query("INSERT INTO \`keys\` (\`key\`, dias) VALUES (?, ?)", [keyGerada, dias]);
        message.reply(`🔑 **Key Gerada:** \`${keyGerada}\` (${dias} dias)`);
    }

    if (command === 'painel') {
        const embedPainel = new EmbedBuilder().setColor(0x7D26CD).setTitle('🔐 ATIVAÇÃO PREMIUM').setDescription('**1.** Tenha sua Key\n**2.** Clique no botão\n**3.** Defina user/senha');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_registro').setLabel('Ativar Key').setStyle(ButtonStyle.Success).setEmoji('🔑'));
        message.channel.send({ embeds: [embedPainel], components: [row] });
    }
});

// --- INTERAÇÕES (MODAL) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = new ModalBuilder().setCustomId('modal_registro').setTitle('Ativação');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('campo_usuario').setLabel('USUÁRIO').setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('campo_senha').setLabel('SENHA').setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('campo_key').setLabel('KEY').setStyle(TextInputStyle.Short))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {
        const user = interaction.fields.getTextInputValue('campo_usuario');
        const pass = interaction.fields.getTextInputValue('campo_senha');
        const key = interaction.fields.getTextInputValue('campo_key');

        try {
            const [rows] = await dbMySQL.query("SELECT dias FROM \`keys\` WHERE \`key\` = ? AND status = 'disponivel'", [key]);
            if (rows.length === 0) return interaction.reply({ content: "❌ Key inválida!", ephemeral: true });

            await dbMySQL.query("INSERT INTO usuarios (usuario, senha, expiracao) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))", [user, pass, rows[0].dias]);
            await dbMySQL.query("UPDATE \`keys\` SET status = 'usada' WHERE \`key\` = ?", [key]);
            await interaction.reply({ content: `✅ Conta **${user}** ativada!`, ephemeral: true });
        } catch (err) { interaction.reply({ content: "❌ Erro ou Usuário já existe!", ephemeral: true }); }
    }
});
