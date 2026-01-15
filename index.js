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
const BANNER_VENDA = "https://cdn.discordapp.com/attachments/1452024671963840594/1455221261860081861/image.png";
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

// --- ROTA HEALTH CHECK (MANTER ATIVO) ---
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        uptime: Math.floor(process.uptime()),
        message: 'XMP System API is running!' 
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

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

// --- ROTA PARA VALIDAR KEY (NOVA) ---
app.post('/validar-key', async (req, res) => {
    const { key } = req.body;
    
    if (!key) {
        return res.status(400).json({ success: false, message: "Key não fornecida." });
    }

    try {
        const [rows] = await dbMySQL.query("SELECT * FROM `keys` WHERE `key_code` = ?", [key]);
        
        if (rows.length === 0) {
            return res.json({ success: false, message: "Key inválida!" });
        }

        const keyData = rows[0];
        
        return res.json({ 
            success: true, 
            status: keyData.status,
            dias: keyData.duracao_dias,
            message: keyData.status === 'disponivel' ? 'Key válida!' : 'Key já foi usada!'
        });
    } catch (err) {
        console.error("Erro validar key:", err);
        res.status(500).json({ success: false, message: "Erro ao validar key." });
    }
});

// --- ROTA PARA LOGIN WEB (PAINEL) ---
app.post('/web-login', async (req, res) => {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
        return res.status(400).json({ success: false, message: "Preencha todos os campos!" });
    }

    try {
        const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ? AND senha = ?", [usuario, senha]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Usuário ou senha incorretos!" });
        }

        const user = rows[0];
        
        return res.json({ 
            success: true, 
            message: "Login realizado com sucesso!",
            usuario: user
        });
    } catch (err) {
        console.error("Erro web-login:", err);
        res.status(500).json({ success: false, message: "Erro no servidor." });
    }
});

// --- ROTA PARA REGISTRO WEB (PAINEL) ---
app.post('/web-registro', async (req, res) => {
    const { usuario, senha, key } = req.body;

    if (!usuario || !senha || !key) {
        return res.status(400).json({ success: false, message: "Preencha todos os campos!" });
    }

    try {
        // Verificar se a key existe e está disponível
        const [keyRows] = await dbMySQL.query("SELECT duracao_dias FROM `keys` WHERE `key_code` = ? AND status = 'disponivel'", [key]);
        
        if (keyRows.length === 0) {
            return res.status(400).json({ success: false, message: "Key inválida ou já foi usada!" });
        }

        // Criar usuário
        await dbMySQL.query(
            "INSERT INTO usuarios (usuario, senha, expiracao) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))", 
            [usuario, senha, keyRows[0].duracao_dias]
        );

        // Marcar key como usada
        await dbMySQL.query("UPDATE `keys` SET status = 'usada', used_by = ? WHERE `key_code` = ?", [usuario, key]);

        enviarLog("✅ REGISTRO WEB", `Usuário: ${usuario}\nKey: ${key}\nDias: ${keyRows[0].duracao_dias}`, 0x00FF00);

        return res.json({ 
            success: true, 
            message: "Conta criada com sucesso!"
        });
    } catch (err) {
        console.error("Erro web-registro:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Usuário já existe!" });
        }
        res.status(500).json({ success: false, message: "Erro ao criar conta." });
    }
});

// --- INICIAR SISTEMA ---
async function iniciarSistema() {
    try {
        console.log("⏳ Verificando banco Aiven...");
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS usuarios (usuario VARCHAR(255) PRIMARY KEY, senha VARCHAR(255), expiracao DATE, hwid_vinculado VARCHAR(255) DEFAULT NULL, ip_vinculado VARCHAR(255) DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS \`keys\` (\`key\` VARCHAR(255) PRIMARY KEY, dias INTEGER, status VARCHAR(50) DEFAULT 'disponivel', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, used_by VARCHAR(255) DEFAULT NULL)`);
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS logs_acesso (id INT AUTO_INCREMENT PRIMARY KEY, usuario VARCHAR(255), acao VARCHAR(255), ip VARCHAR(255), hwid VARCHAR(255), data_hora DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        
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

    // ========== COMANDO: RESETAR HWID ==========
    if (command === 'resetar') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        const userReset = args[0];
        if (!userReset) return message.reply("❌ Uso: `!resetar usuario`");
        
        await dbMySQL.query("UPDATE usuarios SET hwid_vinculado = NULL WHERE usuario = ?", [userReset]);
        enviarLog("🔄 HWID RESETADO", `Admin: ${message.author.tag}\nUsuário: ${userReset}`, 0x00FF00);
        message.reply(`✅ HWID de **${userReset}** resetado com sucesso!`);
    }

    // ========== COMANDO: GERAR KEY ==========
    if (command === 'gerar') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        const dias = parseInt(args[0]) || 30;
        const quantidade = parseInt(args[1]) || 1;
        
        if (quantidade > 10) return message.reply("❌ Máximo de 10 keys por vez!");
        
        let keysGeradas = [];
        for (let i = 0; i < quantidade; i++) {
            const keyGerada = "XMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
            await dbMySQL.query("INSERT INTO `keys` (`key_code`, `duracao_dias`) VALUES (?, ?)", [keyGerada, dias]);
            keysGeradas.push(keyGerada);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle("🔑 KEYS GERADAS")
            .setDescription(`**Quantidade:** ${quantidade}\n**Duração:** ${dias} dias\n\n${keysGeradas.map(k => `\`${k}\``).join('\n')}`)
            .setFooter({ text: `Gerado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        
        enviarLog("🔑 KEYS GERADAS", `Admin: ${message.author.tag}\nQuantidade: ${quantidade}\nDias: ${dias}`, 0x7D26CD);
        message.reply({ embeds: [embed] });
    }

    // ========== COMANDO: VERIFICAR KEY ==========
    if (command === 'verificarkey' || command === 'vkey') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        const key = args[0];
        if (!key) return message.reply("❌ Uso: `!verificarkey XMP-XXXXX`");
        
        const [rows] = await dbMySQL.query("SELECT * FROM `keys` WHERE `key_code` = ?", [key]);
        
        if (rows.length === 0) {
            return message.reply("❌ Key não encontrada!");
        }
        
        const keyData = rows[0];
        const statusEmoji = keyData.status === 'disponivel' ? '✅' : '❌';
        
        const embed = new EmbedBuilder()
            .setColor(keyData.status === 'disponivel' ? 0x00FF00 : 0xFF0000)
            .setTitle(`${statusEmoji} INFORMAÇÕES DA KEY`)
            .addFields(
                { name: "🔑 Key", value: `\`${keyData.key_code}\``, inline: true },
                { name: "⏱️ Duração", value: `${keyData.duracao_dias} dias`, inline: true },
                { name: "📊 Status", value: keyData.status.toUpperCase(), inline: true },
                { name: "👤 Usado por", value: keyData.used_by || "Ninguém", inline: true },
                { name: "📅 Criada em", value: new Date(keyData.created_at).toLocaleString('pt-BR'), inline: true }
            )
            .setFooter({ text: "XMP System", iconURL: LOGO_URL });
        
        message.reply({ embeds: [embed] });
    }

    // ========== COMANDO: DELETAR KEY ==========
    if (command === 'deletarkey' || command === 'delkey') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        const key = args[0];
        if (!key) return message.reply("❌ Uso: `!deletarkey XMP-XXXXX`");
        
        const [result] = await dbMySQL.query("DELETE FROM `keys` WHERE `key_code` = ?", [key]);
        
        if (result.affectedRows === 0) {
            return message.reply("❌ Key não encontrada!");
        }
        
        enviarLog("🗑️ KEY DELETADA", `Admin: ${message.author.tag}\nKey: ${key}`, 0xFF0000);
        message.reply(`✅ Key \`${key}\` deletada com sucesso!`);
    }

    // ========== COMANDO: LISTAR KEYS ==========
    if (command === 'listarkeys' || command === 'keys') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        
        const status = args[0] || 'disponivel';
        const [rows] = await dbMySQL.query("SELECT * FROM `keys` WHERE status = ? ORDER BY created_at DESC LIMIT 20", [status]);
        
        if (rows.length === 0) {
            return message.reply(`❌ Nenhuma key com status **${status}** encontrada!`);
        }
        
        const listaKeys = rows.map((k, i) => `${i+1}. \`${k.key_code}\` - ${k.duracao_dias} dias`).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle(`🔑 KEYS (${status.toUpperCase()})`)
            .setDescription(listaKeys)
            .setFooter({ text: `Total: ${rows.length} keys`, iconURL: LOGO_URL })
            .setTimestamp();
        
        message.reply({ embeds: [embed] });
    }

    // ========== COMANDO: ADICIONAR TEMPO ==========
    if (command === 'addtempo') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        const usuario = args[0];
        const dias = parseInt(args[1]);
        
        if (!usuario || !dias) {
            return message.reply("❌ Uso: `!addtempo usuario dias`");
        }
        
        const [rows] = await dbMySQL.query("SELECT expiracao FROM usuarios WHERE usuario = ?", [usuario]);
        
        if (rows.length === 0) {
            return message.reply("❌ Usuário não encontrado!");
        }
        
        await dbMySQL.query("UPDATE usuarios SET expiracao = DATE_ADD(expiracao, INTERVAL ? DAY) WHERE usuario = ?", [dias, usuario]);
        
        enviarLog("⏰ TEMPO ADICIONADO", `Admin: ${message.author.tag}\nUsuário: ${usuario}\nDias: +${dias}`, 0x00FFFF);
        message.reply(`✅ Adicionado **${dias} dias** para o usuário **${usuario}**!`);
    }

    // ========== COMANDO: INFO USUÁRIO ==========
    if (command === 'infousuario' || command === 'info') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }
        const usuario = args[0];
        if (!usuario) return message.reply("❌ Uso: `!info usuario`");
        
        const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
        
        if (rows.length === 0) {
            return message.reply("❌ Usuário não encontrado!");
        }
        
        const user = rows[0];
        const diasRestantes = Math.ceil((new Date(user.expiracao) - new Date()) / (1000 * 60 * 60 * 24));
        
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle(`👤 INFORMAÇÕES DO USUÁRIO`)
            .addFields(
                { name: "👤 Usuário", value: user.usuario, inline: true },
                { name: "📅 Expira em", value: new Date(user.expiracao).toLocaleDateString('pt-BR'), inline: true },
                { name: "⏰ Dias Restantes", value: `${diasRestantes} dias`, inline: true },
                { name: "💻 HWID", value: user.hwid_vinculado || "Não vinculado", inline: false },
                { name: "🌐 IP", value: user.ip_vinculado || "N/A", inline: false }
            )
            .setFooter({ text: "XMP System", iconURL: LOGO_URL })
            .setTimestamp();
        
        message.reply({ embeds: [embed] });
    }

    // ========== COMANDO: PAINEL DE ATIVAÇÃO ==========
    if (command === 'painel') {
        const embedPainel = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle('🔐 ATIVAÇÃO PREMIUM')
            .setDescription('**1.** Tenha sua Key\n**2.** Clique no botão abaixo\n**3.** Defina usuário e senha\n**4.** Cole sua key')
            .setImage(BANNER_VENDA)
            .setFooter({ text: "XMP System", iconURL: LOGO_URL })
            .setTimestamp();
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_registro')
                .setLabel('Ativar Key')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔑')
        );
        
        message.channel.send({ embeds: [embedPainel], components: [row] });
    }

    // ========== COMANDO: HELP ==========
    if (command === 'help' || command === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle('📋 COMANDOS DISPONÍVEIS')
            .setDescription('Aqui estão todos os comandos do bot:')
            .addFields(
                { name: '🔑 Keys', value: '`!gerar [dias] [qtd]` - Gerar keys\n`!verificarkey [key]` - Ver info da key\n`!deletarkey [key]` - Deletar key\n`!listarkeys [status]` - Listar keys', inline: false },
                { name: '👤 Usuários', value: '`!info [usuario]` - Ver info do usuário\n`!addtempo [usuario] [dias]` - Adicionar tempo\n`!resetar [usuario]` - Resetar HWID', inline: false },
                { name: '⚙️ Sistema', value: '`!painel` - Exibir painel de ativação\n`!help` - Mostrar este menu', inline: false }
            )
            .setFooter({ text: "XMP System", iconURL: LOGO_URL })
            .setTimestamp();
        
        message.reply({ embeds: [embed] });
    }
});

// --- INTERAÇÕES (MODAL) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = new ModalBuilder()
            .setCustomId('modal_registro')
            .setTitle('🔐 Ativação Premium');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('campo_usuario')
                    .setLabel('USUÁRIO')
                    .setPlaceholder('Escolha um nome de usuário')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('campo_senha')
                    .setLabel('SENHA')
                    .setPlaceholder('Escolha uma senha forte')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('campo_key')
                    .setLabel('KEY')
                    .setPlaceholder('Cole sua key aqui (XMP-XXXXX)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );
        
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {
        const user = interaction.fields.getTextInputValue('campo_usuario');
        const pass = interaction.fields.getTextInputValue('campo_senha');
        const key = interaction.fields.getTextInputValue('campo_key');

        try {
            const [rows] = await dbMySQL.query("SELECT duracao_dias FROM `keys` WHERE `key_code` = ? AND status = 'disponivel'", [key]);
            
            if (rows.length === 0) {
                return interaction.reply({ 
                    content: "❌ Key inválida ou já foi usada!", 
                    ephemeral: true 
                });
            }

            await dbMySQL.query("INSERT INTO usuarios (usuario, senha, expiracao) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))", [user, pass, rows[0].duracao_dias]);
            await dbMySQL.query("UPDATE `keys` SET status = 'usada', used_by = ? WHERE `key_code` = ?", [user, key]);
            
            const embedSucesso = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ CONTA ATIVADA COM SUCESSO!')
                .setDescription(`**Usuário:** ${user}\n**Validade:** ${rows[0].duracao_dias} dias`)
                .setFooter({ text: "XMP System", iconURL: LOGO_URL })
                .setTimestamp();
            
            enviarLog("✅ NOVA ATIVAÇÃO", `Usuário: ${user}\nKey: ${key}\nDias: ${rows[0].duracao_dias}\nDiscord: ${interaction.user.tag}`, 0x00FF00);
            
            await interaction.reply({ embeds: [embedSucesso], ephemeral: true });
        } catch (err) {
            console.error("Erro ao ativar:", err);
            interaction.reply({ 
                content: "❌ Erro ao ativar! Usuário já existe ou key inválida.", 
                ephemeral: true 
            });
        }
    }
});

// --- BOT ONLINE ---
client.on('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    client.user.setActivity('XMP System | !help', { type: 'PLAYING' });
});
