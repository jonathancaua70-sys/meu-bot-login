require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits 
} = require("discord.js");

const dbMySQL = require('./db.js');
const express = require('express');
const app = express();
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
const BANNER_VENDA = "https://cdn.discordapp.com/attachments/1452024671963840594/1455221261860081861/ABS2GSmeZxlwX19XJnNoY6opRCQXotheIXw0urWKUeu3LhAO-gy_0aZpA0VlRnYk2eiczn78R3hvpfs79I4Rs7XcNinEnV7lGLr0K4xmkW9K7e3MmlMGLoRdRpvj3ZIqGaUa5s2EB5ukPss1la1IFNWNITTJoAdKt3wwd_C9xVw1vcHqvR1evws1024-rj.png";
const MINHA_CHAVE_PIX = "00020126470014BR.GOV.BCB.PIX0125julianalevino@hotmail.com5204000053039865802BR5901N6001C62070503Xmp63048331";

// Inicia o Banco e o Bot
async function iniciarSistema() {
    try {
        console.log("⏳ Verificando banco de dados...");
        // Tabela de usuários e keys que você já tem
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS usuarios (usuario VARCHAR(255) PRIMARY KEY, senha VARCHAR(255), expiracao DATE)`);
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS \`keys\` (\`key\` VARCHAR(255) PRIMARY KEY, dias INTEGER, status VARCHAR(50) DEFAULT 'disponivel')`);
        
        // ADICIONE ESTA LINHA: Necessária para a rota /login não falhar
        await dbMySQL.query(`CREATE TABLE IF NOT EXISTS registros_usuarios (id_discord VARCHAR(255), ip_atual VARCHAR(50), hwid_atual VARCHAR(255), data_registro DATETIME)`);
        
        console.log("✅ Banco de dados MySQL pronto!");
        client.login(process.env.TOKEN);
    } catch (error) {
        console.error("❌ Falha crítica ao iniciar:", error.message);
    }
}

iniciarSistema();

// Função de Logs
async function enviarLog(titulo, descricao, cor, campos = []) {
    const canal = client.channels.cache.get("1455285942108553246"); 
    if (!canal) return;
    const embed = new EmbedBuilder()
        .setTitle(titulo).setDescription(descricao).setColor(cor)
        .addFields(campos).setTimestamp()
        .setFooter({ text: "XMP Monitoramento", iconURL: LOGO_URL });
    try { await canal.send({ embeds: [embed] }); } catch (err) {}
}

// ROTA PARA O SEU PAINEL (.EXE) LOGAR E SALVAR HWID/IP
app.post('/login', async (req, res) => {
    const { usuario, senha, hwid, ip } = req.body;

    try {
        // Busca o usuário no banco
        const [rows] = await dbMySQL.query(
            "SELECT * FROM usuarios WHERE usuario = ? AND senha = ?", 
            [usuario, senha]
        );

        if (rows.length > 0) {
            // ATUALIZAÇÃO NO HEIDISQL
            // Isso preenche ip_atual e hwid_atual na tabela registros_usuarios
            await dbMySQL.query(
                "UPDATE registros_usuarios SET ip_atual = ?, hwid_atual = ?, data_registro = NOW() WHERE id_discord = (SELECT id_discord FROM usuarios WHERE usuario = ? LIMIT 1)",
                [ip, hwid, usuario]
            );

            return res.json({ success: true, message: "Acesso Liberado!" });
        } else {
            return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
        }
    } catch (err) {
        console.error("Erro na API:", err);
        res.status(500).send("Erro interno");
    }
});

const PORTA = process.env.PORT || 80; 

app.listen(PORTA, '0.0.0.0', () => {
    console.log(`✅ Servidor API Online na porta ${PORTA}`);
});

// --- COMANDOS ---
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIXO) || message.author.bot) return;
    const args = message.content.slice(PREFIXO.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'vender') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embedVenda = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle(`⚡ XMP PREMIUM PC | EXTERNAL`)
            .setDescription('⚡ **Entrega Automática!**\n\nSelecione um plano abaixo para iniciar a compra.')
            .addFields({ name: 'Painel Contem:', value: '• Aimbot Legit/Rage\n• No recoil\n• Camera Hack 10x\n• Stream mode' })
            .setImage(BANNER_VENDA)
            .setFooter({ text: `XMP Cheats`, iconURL: LOGO_URL });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('venda_xmp')
                .setPlaceholder('Clique aqui para ver as opções')
                .addOptions([
                    { label: 'Login Diário', description: 'R$ 6,99', value: 'diario', emoji: '🛒' },
                    { label: 'Login Semanal', description: 'R$ 15,99', value: 'semanal', emoji: '🛒' },
                    { label: 'Login Mensal', description: 'R$ 25,99', value: 'mensal', emoji: '🛒' },
                    { label: 'Login Permanente', description: 'R$ 39,99', value: 'permanente', emoji: '🛒' },
                ])
        );
        message.channel.send({ embeds: [embedVenda], components: [menu] });
    }

    if (command === 'painel') {
        const embedPainel = new EmbedBuilder()
            .setColor(0x7D26CD)
            .setTitle('🔐 ÁREA DE ATIVAÇÃO PREMIUM')
            .setThumbnail(LOGO_URL)
            .setDescription(
                'Bem-vindo à central de ativação **XMP CHEATS**!\n\n' +
                '> **1.** Tenha sua Key em mãos.\n' +
                '> **2.** Clique no botão abaixo para abrir o formulário.\n' +
                '> **3.** Defina seu usuário e senha para o Loader.\n\n' +
                '⚠️ *Guarde suas credenciais, elas são únicas.*'
            )
            .setFooter({ text: 'XMP System • Registro', iconURL: LOGO_URL });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_registro')
                .setLabel('Ativar minha Key')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔑')
        );
        message.channel.send({ embeds: [embedPainel], components: [row] });
    }

    if (command === 'gerar') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const dias = parseInt(args[0]) || 30;
        const keyGerada = "XMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        try {
            await dbMySQL.query("INSERT INTO \`keys\` (\`key\`, dias) VALUES (?, ?)", [keyGerada, dias]);
            message.reply(`🔑 **Key Gerada:** \`${keyGerada}\` (${dias} dias)`);
        } catch (err) { message.reply("❌ Erro ao salvar key."); }
    }
});

// --- INTERAÇÕES ---
client.on('interactionCreate', async (interaction) => {
    
    // MODAL DE REGISTRO
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = new ModalBuilder().setCustomId('modal_registro').setTitle('Ativação de Key');
        const inputUser = new TextInputBuilder().setCustomId('campo_usuario').setLabel('NOME DE USUÁRIO').setStyle(TextInputStyle.Short).setRequired(true);
        const inputPass = new TextInputBuilder().setCustomId('campo_senha').setLabel('SUA SENHA').setStyle(TextInputStyle.Short).setRequired(true);
        const inputKey = new TextInputBuilder().setCustomId('campo_key').setLabel('SUA KEY').setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputUser),
            new ActionRowBuilder().addComponents(inputPass),
            new ActionRowBuilder().addComponents(inputKey)
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {
        const user = interaction.fields.getTextInputValue('campo_usuario');
        const pass = interaction.fields.getTextInputValue('campo_senha');
        const key = interaction.fields.getTextInputValue('campo_key');

        try {
            const [rows] = await dbMySQL.query("SELECT dias FROM \`keys\` WHERE \`key\` = ? AND status = 'disponivel'", [key]);
            if (rows.length === 0) return interaction.reply({ content: "❌ Key inválida ou usada!", ephemeral: true });

            await dbMySQL.query("INSERT INTO usuarios (usuario, senha, expiracao) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))", [user, pass, rows[0].dias]);
            await dbMySQL.query("UPDATE \`keys\` SET status = 'usada' WHERE \`key\` = ?", [key]);

            await interaction.reply({ content: `✅ Conta **${user}** ativada com sucesso!`, ephemeral: true });
            enviarLog("👤 NOVO REGISTRO", `Usuário: ${user}`, 0x00FF00);
        } catch (err) {
            interaction.reply({ content: "❌ Erro: Usuário já existe!", ephemeral: true });
        }
    }

    // MENU DE VENDA
    if (interaction.isStringSelectMenu() && interaction.customId === 'venda_xmp') {
        const plano = interaction.values[0];
        const precos = { 'diario': '6,99', 'semanal': '15,99', 'mensal': '25,99', 'permanente': '39,99' };

        const embedRevisao = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
            .setTitle('Revisão do Pedido')
            .setDescription('Resete seu hwid')
            .addFields(
                { name: 'Valor à vista', value: `R$ ${precos[plano]}`, inline: true },
                { name: 'Em estoque', value: 'Disponível', inline: true },
                { name: 'Carrinho', value: `1x Xmp ${plano.charAt(0).toUpperCase() + plano.slice(1)} | R$ ${precos[plano]}` }
            )
            .setImage(BANNER_VENDA)
            .setFooter({ text: `XMP CHEATS`, iconURL: LOGO_URL });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`confirmar_${plano}`).setLabel('Ir para o Pagamento').setStyle(ButtonStyle.Success).setEmoji('✔️'),
            new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
        );
        await interaction.reply({ embeds: [embedRevisao], components: [row], ephemeral: true });
    }

    // CRIAÇÃO DE TICKET
    if (interaction.isButton() && interaction.customId.startsWith('confirmar_')) {
        const plano = interaction.customId.split('_')[1];
        const canal = await interaction.guild.channels.create({
            name: `🛒-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ],
        });

        const embedTicket = new EmbedBuilder()
            .setTitle("💳 PAGAMENTO - XMP PREMIUM")
            .setDescription(`Olá ${interaction.user}, utilize os botões abaixo para prosseguir com o pagamento.`)
            .addFields({ name: "Plano Selecionado", value: `\`${plano}\``, inline: true })
            .setColor(0x00FF00);

        const rowPay = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pagar_pix').setLabel('Pix').setStyle(ButtonStyle.Secondary).setEmoji('💸'),
            new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await canal.send({ content: `${interaction.user}`, embeds: [embedTicket], components: [rowPay] });
        await interaction.update({ content: `✅ Canal aberto: ${canal}`, embeds: [], components: [] });
    }

    // BOTÃO PIX
    if (interaction.isButton() && interaction.customId === 'pagar_pix') {
        const agora = new Date();
        const horaFormatada = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');

        const embedPix = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
            .setTitle('💠 Pagamento via PIX Criado')
            .setDescription(`🕒 **Expira em:** \n\`em 10 minutos\``)
            .addFields({ name: 'ℹ️ Código Copia e Cola:', value: `\`\`\`${MINHA_CHAVE_PIX}\`\`\`` })
            .setImage('https://cdn.discordapp.com/attachments/1452024671963840594/1455228551023427736/qrcode-pix.png')
            .setFooter({ text: `Xmp CHEATS • Hoje às ${horaFormatada}`, iconURL: LOGO_URL });

        const rowPix = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('copiar_pix_btn').setLabel('Código Copia e Cola').setStyle(ButtonStyle.Secondary).setEmoji('📋')
        );

        await interaction.update({ embeds: [embedPix], components: [rowPix] });
    }

    if (interaction.isButton() && interaction.customId === 'copiar_pix_btn') {
        await interaction.reply({ content: `${MINHA_CHAVE_PIX}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
        await interaction.reply("🔒 Removendo canal...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
});

client.login(process.env.TOKEN);
