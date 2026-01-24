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
        await command.execute(message, args, client, dbMySQL, enviarLog);
    } catch (error) {
        console.error("Erro no comando:", error);
        message.reply("❌ Houve um erro interno ao processar este comando!");
    }
});

// --- LISTENER DE INTERAÇÕES (RESGATE E VENDAS) ---
client.on('interactionCreate', async (interaction) => {
    
    // 1. SISTEMA DE RESGATE (MODAL CRIAR CONTA)
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = {
            title: 'Criar nova conta',
            custom_id: 'modal_criar_conta',
            components: [
                {
                    type: 1,
                    components: [{
                        type: 4,
                        custom_id: 'input_usuario',
                        label: "Qual será seu usuário?",
                        style: 1,
                        placeholder: "Digite seu usuário",
                        required: true
                    }]
                },
                {
                    type: 1,
                    components: [{
                        type: 4,
                        custom_id: 'input_senha',
                        label: "Qual será sua senha? (não esqueça!)",
                        style: 1,
                        placeholder: "Digite sua senha",
                        required: true
                    }]
                },
                {
                    type: 1,
                    components: [{
                        type: 4,
                        custom_id: 'input_key_ativacao',
                        label: "Key de ativação",
                        style: 1,
                        placeholder: "Digite a key de ativação",
                        required: true
                    }]
                }
            ]
        };
        return await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_criar_conta') {
        const usuario = interaction.fields.getTextInputValue('input_usuario').trim();
        const senha = interaction.fields.getTextInputValue('input_senha').trim();
        const keyAtivacao = interaction.fields.getTextInputValue('input_key_ativacao').trim();
        
        await interaction.deferReply({ ephemeral: true });

        try {
            // Validar campos
            if (!usuario || !senha || !keyAtivacao) {
                return interaction.editReply("❌ Todos os campos são obrigatórios!");
            }

            // Verificar se a tabela tem a coluna usuario
            const [columns] = await dbMySQL.query("SHOW COLUMNS FROM usuarios LIKE 'usuario'");
            if (columns.length === 0) {
                return interaction.editReply("❌ A tabela `usuarios` precisa ser migrada. Use `!migrar` primeiro.");
            }

            // Verificar se o usuário já existe
            const [usuarioExistente] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
            if (usuarioExistente.length > 0) {
                return interaction.editReply("❌ Este usuário já está em uso! Escolha outro.");
            }

            // Processar a key de ativação
            const tabelas = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
            let keyEncontrada = null;
            let planoAlvo = "";

            for (const tabela of tabelas) {
                const [rows] = await dbMySQL.query(`SELECT * FROM \`${tabela}\` WHERE \`codigo\` = ? AND \`status\` = 'disponivel'`, [keyAtivacao]);
                if (rows.length > 0) {
                    keyEncontrada = rows[0];
                    planoAlvo = tabela.replace('keys_', '');
                    break;
                }
            }

            if (!keyEncontrada) {
                return interaction.editReply("❌ Key de ativação inválida ou já utilizada.");
            }

            // Criar nova conta
            await dbMySQL.query(`
                INSERT INTO usuarios (usuario, senha, plano, expiracao, discord_id) 
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?)
            `, [usuario, senha, planoAlvo, keyEncontrada.dias, interaction.user.id]);

            // Marcar key como usada
            await dbMySQL.query(`UPDATE \`keys_${planoAlvo}\` SET status = 'usada', usada_por = ? WHERE codigo = ?`, [interaction.user.tag, keyAtivacao]);

            // Enviar log
            enviarLog(client, "👤 NOVA CONTA CRIADA", `**Usuário:** ${usuario}\n**Discord:** <@${interaction.user.id}>\n**Plano:** ${planoAlvo.toUpperCase()}\n**Key:** \`${keyAtivacao}\``, 0x00FF00);

            // Mensagem de sucesso
            const embedSucesso = new EmbedBuilder()
                .setTitle("✅ Conta Criada com Sucesso!")
                .setColor(0x00FF00)
                .setDescription(`Bem-vindo ao XMP, **${usuario}**!`)
                .addFields(
                    { name: "👤 Usuário", value: usuario, inline: true },
                    { name: "🎯 Plano", value: planoAlvo.toUpperCase(), inline: true },
                    { name: "📅 Validade", value: `${keyEncontrada.dias} dias`, inline: true }
                )
                .setFooter({ text: "Guarde seus dados em local seguro!" })
                .setTimestamp();

            return interaction.editReply({ embeds: [embedSucesso] });

        } catch (error) {
            console.error(error);
            return interaction.editReply("❌ Erro ao criar conta. Tente novamente.");
        }
    }

    // 2. SISTEMA DE VENDAS (PROCESSAR BOTÕES DE COMPRA)
    if (interaction.isButton() && interaction.customId.startsWith('buy_')) {
        const produtoTipo = interaction.customId.replace('buy_', ''); // ex: int_adv
        
        const mapeamentoTabelas = {
            'int_adv': 'produto_internal_advanced',
            'int_pre': 'produto_internal_premium',
            'ext_adv': 'produto_external_advanced',
            'ext_pre': 'produto_external_premium'
        };

        const tabelaAlvo = mapeamentoTabelas[produtoTipo];

        try {
            await interaction.reply({ content: `🔎 Iniciando pedido de **${produtoTipo.toUpperCase()}**...`, ephemeral: true });

            const [prodData] = await dbMySQL.query(`SELECT * FROM ${tabelaAlvo} LIMIT 1`);
            const [estoque] = await dbMySQL.query(`SELECT COUNT(*) as total FROM keys_${produtoTipo} WHERE status = 'disponivel'`);

            if (estoque[0].total <= 0) return interaction.editReply("❌ Desculpe, estamos sem estoque para este item.");

            const embedCupom = new EmbedBuilder()
                .setTitle("🎟️ Cupom de Desconto")
                .setDescription("Digite seu cupom no chat ou escreva `pular` para continuar.")
                .setColor("#7D26CD");

            await interaction.editReply({ embeds: [embedCupom] });

            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async (m) => {
                let valorFinal = parseFloat(prodData[0].preco);
                let descontoTexto = "Nenhum";

                if (m.content.toLowerCase() !== 'pular') {
                    const [cupom] = await dbMySQL.query("SELECT * FROM cupons WHERE codigo = ? AND usos_restantes > 0", [m.content.toUpperCase()]);
                    if (cupom.length > 0) {
                        valorFinal -= (valorFinal * (cupom[0].desconto_porcentagem / 100));
                        descontoTexto = `${cupom[0].desconto_porcentagem}%`;
                    }
                }
                
                const embedPagamento = new EmbedBuilder()
                    .setTitle("💳 Pagamento Gerado")
                    .setDescription(`Produto: **${produtoTipo.toUpperCase()}**\nValor: **R$ ${valorFinal.toFixed(2)}**\nDesconto: **${descontoTexto}**`)
                    .setColor("#00FF00");

                const rowPag = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`pix_gen_${produtoTipo}_${valorFinal}`).setLabel('Gerar QR Code Pix').setStyle(ButtonStyle.Success)
                );

                await interaction.followUp({ embeds: [embedPagamento], components: [rowPag], ephemeral: true });
                if (m.deletable) m.delete();
            });
        } catch (error) { console.error(error); }
    }
});

// --- INICIALIZAÇÃO ---
client.once("ready", () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);
    iniciarAPI(dbMySQL, enviarLog, client);
});

// --- FUNÇÕES AUXILIARES DO MODAL ---

async function processarKey(interaction, keyInput, dbMySQL, client, enviarLog) {
    const tabelas = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
    
    let keyEncontrada = null;
    let planoAlvo = "";

    for (const tabela of tabelas) {
        const [rows] = await dbMySQL.query(`SELECT * FROM \`${tabela}\` WHERE \`codigo\` = ? AND \`status\` = 'disponivel'`, [keyInput]);
        if (rows.length > 0) {
            keyEncontrada = rows[0];
            planoAlvo = tabela.replace('keys_', '');
            break;
        }
    }

    if (!keyEncontrada) return interaction.editReply("❌ Key inválida ou já utilizada.");

    await dbMySQL.query(`
        INSERT INTO usuarios (usuario, plano, expiracao) 
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
        ON DUPLICATE KEY UPDATE 
        plano = VALUES(plano), 
        expiracao = IF(expiracao > NOW(), DATE_ADD(expiracao, INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY))
    `, [interaction.user.id, planoAlvo, keyEncontrada.dias, keyEncontrada.dias, keyEncontrada.dias]);

    await dbMySQL.query(`UPDATE \`keys_${planoAlvo}\` SET status = 'usada', usada_por = ? WHERE codigo = ?`, [interaction.user.tag, keyInput]);
    enviarLog(client, "🔑 LICENÇA ATIVADA", `**Usuário:** <@${interaction.user.id}>\n**Plano:** ${planoAlvo.toUpperCase()}\n**Key:** \`${keyInput}\``, 0x00FF00);
    return interaction.editReply(`✅ **Sucesso!** Plano **${planoAlvo.toUpperCase()}** ativado.`);
}

async function consultarStatus(interaction, dbMySQL) {
    const [rows] = await dbMySQL.query("SELECT plano, expiracao FROM usuarios WHERE usuario = ?", [interaction.user.id]);
    
    if (rows.length === 0) {
        return interaction.editReply("❌ Você não possui nenhuma licença ativa.");
    }
    
    const usuario = rows[0];
    const expiracao = new Date(usuario.expiracao);
    const agora = new Date();
    const diasRestantes = Math.ceil((expiracao - agora) / (1000 * 60 * 60 * 24));
    
    const embed = new EmbedBuilder()
        .setTitle("📊 Seu Status")
        .setColor(0x7D26CD)
        .addFields(
            { name: "🎯 Plano", value: usuario.plano.toUpperCase(), inline: true },
            { name: "📅 Expiração", value: expiracao.toLocaleDateString('pt-BR'), inline: true },
            { name: "⏰ Dias Restantes", value: diasRestantes > 0 ? `${diasRestantes} dias` : "Expirado", inline: true }
        )
        .setTimestamp();
    
    return interaction.editReply({ embeds: [embed] });
}

async function mostrarPlanos(interaction, dbMySQL) {
    const planos = [
        { nome: "Internal Advanced", tabela: "keys_int_adv", emoji: "🔧" },
        { nome: "Internal Premium", tabela: "keys_int_pre", emoji: "⭐" },
        { nome: "External Advanced", tabela: "keys_ext_adv", emoji: "🌐" },
        { nome: "External Premium", tabela: "keys_ext_pre", emoji: "💎" }
    ];
    
    const embed = new EmbedBuilder()
        .setTitle("📦 Planos Disponíveis")
        .setColor(0x7D26CD)
        .setDescription("Escolha o plano ideal para você:");
    
    for (const plano of planos) {
        const [estoque] = await dbMySQL.query(`SELECT COUNT(*) as total FROM ${plano.tabela} WHERE status = 'disponivel'`);
        embed.addFields({
            name: `${plano.emoji} ${plano.nome}`,
            value: `Estoque: ${estoque[0].total} keys disponíveis`,
            inline: true
        });
    }
    
    embed.setFooter({ text: "Use !painel para comprar ou ativar uma key" });
    return interaction.editReply({ embeds: [embed] });
}

async function mostrarSuporte(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("🛠️ Central de Suporte")
        .setColor(0xFF6B6B)
        .setDescription("Precisa de ajuda? Estamos aqui para você!")
        .addFields(
            { name: "📧 Email", value: "suporte@xmp.com", inline: true },
            { name: "💬 Discord", value: "discord.gg/xmp", inline: true },
            { name: "📱 WhatsApp", value: "+55 11 99999-9999", inline: true },
            { name: "⏰ Horário", value: "Seg-Sex: 9h-18h", inline: false },
            { name: "🔗 Links Úteis", value: "[Documentação](https://docs.xmp.com) | [Tutoriais](https://tutoriais.xmp.com)", inline: false }
        )
        .setFooter({ text: "Tempo médio de resposta: 2-4 horas" })
        .setTimestamp();
    
    return interaction.editReply({ embeds: [embed] });
}

client.login(process.env.TOKEN);
