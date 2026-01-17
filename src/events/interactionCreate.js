const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client, dbMySQL, enviarLog, CONFIGS) {
        
        // 1. TRATAMENTO DE BOTÕES (Abrir o Modal)
        if (interaction.isButton()) {
            if (interaction.customId === 'abrir_registro') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_registro')
                    .setTitle('🔐 Ativação Premium');

                const campoUsuario = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_usuario')
                        .setLabel('USUÁRIO')
                        .setPlaceholder('Escolha um nome de usuário')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );

                const campoSenha = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_senha')
                        .setLabel('SENHA')
                        .setPlaceholder('Escolha uma senha forte')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );

                const campoKey = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_key')
                        .setLabel('KEY')
                        .setPlaceholder('Cole sua key aqui (XMP-XXXXX)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );

                const campoFoto = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_foto')
                        .setLabel('URL DA FOTO (OPCIONAL)')
                        .setPlaceholder('Link da imagem')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                );

                modal.addComponents(campoUsuario, campoSenha, campoKey, campoFoto);
                await interaction.showModal(modal);
            }
        }

        // 2. TRATAMENTO DE ENVIO DE MODAL (Processar o Registro)
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_registro') {
                const user = interaction.fields.getTextInputValue('campo_usuario');
                const pass = interaction.fields.getTextInputValue('campo_senha');
                const key = interaction.fields.getTextInputValue('campo_key');
                const foto = interaction.fields.getTextInputValue('campo_foto') || null;

                try {
                    // Verifica se a Key existe e está disponível
                    const [rows] = await dbMySQL.query("SELECT duracao_dias FROM `keys` WHERE `key_code` = ? AND status = 'disponivel'", [key]);

                    if (rows.length === 0) {
                        return interaction.reply({ content: "❌ Key inválida ou já foi usada!", ephemeral: true });
                    }

                    const dias = rows[0].duracao_dias;

                    // Insere o novo usuário
                    await dbMySQL.query(
                        "INSERT INTO usuarios (usuario, senha, expiracao, foto_url) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)", 
                        [user, pass, dias, foto]
                    );

                    // Queima a Key no banco
                    await dbMySQL.query("UPDATE `keys` SET status = 'usada', used_by = ? WHERE `key_code` = ?", [user, key]);

                    const embedSucesso = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ CONTA ATIVADA!')
                        .setDescription(`**Usuário:** ${user}\n**Validade:** ${dias} dias`)
                        .setThumbnail(foto || CONFIGS.LOGO_URL)
                        .setFooter({ text: "XMP System", iconURL: CONFIGS.LOGO_URL });

                    enviarLog(client, "✅ NOVA ATIVAÇÃO", `Usuário: ${user}\nKey: ${key}\nDiscord: ${interaction.user.tag}`, 0x00FF00, CONFIGS.LOGO_URL);
                    
                    await interaction.reply({ embeds: [embedSucesso], ephemeral: true });

                } catch (err) {
                    const msgErro = err.code === 'ER_DUP_ENTRY' ? "❌ Este usuário já existe!" : "❌ Erro ao processar ativação.";
                    await interaction.reply({ content: msgErro, ephemeral: true });
                }
            }
        }
    }
};