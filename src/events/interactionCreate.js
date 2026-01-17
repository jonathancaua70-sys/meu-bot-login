const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client, dbMySQL, enviarLog) {
        
        // 1. TRATAMENTO DE BOTÕES (Abrir o Modal de Registro)
        if (interaction.isButton()) {
            if (interaction.customId === 'abrir_registro') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_registro')
                    .setTitle('🔐 Ativação Premium XMP');

                const campoUsuario = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_usuario')
                        .setLabel('USUÁRIO')
                        .setPlaceholder('Escolha o nome que usará no Loader')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );

                const campoSenha = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_senha')
                        .setLabel('SENHA')
                        .setPlaceholder('Escolha uma senha segura')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );

                const campoKey = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_key')
                        .setLabel('KEY DE ATIVAÇÃO')
                        .setPlaceholder('Cole sua key aqui (ex: XMP-XXXXX)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );

                const campoFoto = new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('campo_foto')
                        .setLabel('URL DA FOTO (OPCIONAL)')
                        .setPlaceholder('Link de uma imagem .jpg ou .png')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                );

                modal.addComponents(campoUsuario, campoSenha, campoKey, campoFoto);
                await interaction.showModal(modal);
            }
        }

        // 2. TRATAMENTO DE ENVIO DO MODAL (Processar a criação da conta)
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_registro') {
                const user = interaction.fields.getTextInputValue('campo_usuario');
                const pass = interaction.fields.getTextInputValue('campo_senha');
                const key = interaction.fields.getTextInputValue('campo_key');
                const foto = interaction.fields.getTextInputValue('campo_foto') || null;

                // DeferReply é importante para evitar que a interação expire se o banco demorar
                await interaction.deferReply({ ephemeral: true });

                try {
                    // Verifica se a Key existe e está disponível no banco da Aiven
                    const [rows] = await dbMySQL.query("SELECT duracao_dias FROM `keys` WHERE `key_code` = ? AND status = 'disponivel'", [key]);

                    if (rows.length === 0) {
                        return interaction.editReply({ content: "❌ Key inválida, já utilizada ou expirada!" });
                    }

                    const dias = rows[0].duracao_dias;

                    // Insere o novo usuário (Soma os dias à data atual)
                    await dbMySQL.query(
                        "INSERT INTO usuarios (usuario, senha, expiracao, foto_url) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)", 
                        [user, pass, dias, foto]
                    );

                    // Marca a Key como usada e vincula ao usuário
                    await dbMySQL.query("UPDATE `keys` SET status = 'usada', used_by = ? WHERE `key_code` = ?", [user, key]);

                    // Monta a resposta de sucesso
                    const embedSucesso = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ CONTA ATIVADA COM SUCESSO!')
                        .addFields(
                            { name: "👤 Usuário", value: `\`${user}\``, inline: true },
                            { name: "⏰ Créditos", value: `\`${dias} dias\``, inline: true },
                            { name: "🎮 Loader", value: "Você já pode fazer login no .exe", inline: false }
                        )
                        .setThumbnail(foto || process.env.LOGO_URL || null)
                        .setFooter({ text: "Sistema de Gerenciamento XMP" })
                        .setTimestamp();

                    // Envia Log para o Canal de Auditoria
                    if (enviarLog) {
                        enviarLog(client, "✅ NOVA ATIVAÇÃO", `**Usuário:** ${user}\n**Dias:** ${dias}\n**Discord:** ${interaction.user.tag}\n**Key:** ${key}`, 0x00FF00);
                    }
                    
                    await interaction.editReply({ embeds: [embedSucesso] });

                } catch (err) {
                    console.error("Erro no Registro:", err);
                    const msgErro = err.code === 'ER_DUP_ENTRY' ? "❌ Este nome de usuário já está em uso! Escolha outro." : "❌ Erro interno ao processar sua ativação no banco de dados.";
                    await interaction.editReply({ content: msgErro });
                }
            }
        }
    }
};
