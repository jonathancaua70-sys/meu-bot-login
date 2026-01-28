const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'gerar',
    async execute(message, args, client, dbMySQL) { 
        
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão!");
        }

        // 2. Pegar os argumentos (!gerar painel dias quantidade)
        const painel = args[0]; // ext_adv, ext_pre, int_adv, int_pre
        const dias = parseInt(args[1]) || 30;
        const quantidade = parseInt(args[2]) || 1;

        // Lista de tabelas válidas que você criou
        const tabelasValidas = ['ext_adv', 'ext_pre', 'int_adv', 'int_pre'];

        if (!painel || !tabelasValidas.includes(painel)) {
            return message.reply("❌ Escolha um painel válido: `ext_adv`, `ext_pre`, `int_adv` ou `int_pre`.");
        }

        if (quantidade > 10) return message.reply("❌ Máximo 10 keys por vez.");
        
        let keysGeradas = [];
        const nomeTabela = `keys_${painel}`; // Monta o nome da tabela: keys_ext_pre, etc.

        try {
            for (let i = 0; i < quantidade; i++) {
                const keyGerada = "XMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
                
                // INSERE NA TABELA ESPECÍFICA DO PAINEL ESCOLHIDO
                await dbMySQL.query(
                    `INSERT INTO ${nomeTabela} (codigo, dias, status) VALUES (?, ?, ?)`, 
                    [keyGerada, dias, 'disponivel']
                );
                
                keysGeradas.push(keyGerada);
            }

            // 3. Resposta Visual
            const embed = new EmbedBuilder()
                .setColor(0x7D26CD)
                .setTitle("🔑 KEYS GERADAS COM SUCESSO")
                .addFields(
                    { name: 'Painel Alvo', value: `\`${painel.toUpperCase()}\``, inline: true },
                    { name: 'Duração', value: `\`${dias} dias\``, inline: true },
                    { name: 'Quantidade', value: `\`${quantidade}\``, inline: true },
                    { name: 'Lista de Keys', value: `\`\`\`${keysGeradas.join('\n')}\`\`\`` }
                )
                .setTimestamp()
                .setFooter({ text: `Gerado por ${message.author.tag}` });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao gerar keys:", error);
            message.reply(`❌ Erro ao salvar na tabela ${nomeTabela}. Verifique se a tabela existe.`);
        }
    }
};