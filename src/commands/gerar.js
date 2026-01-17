const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'gerar',
    // Ajustei a ordem dos parâmetros para bater com o seu index.js
    async execute(message, args, client, dbMySQL) { 
        
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para usar este comando!");
        }

        // 2. Pegar os argumentos (!gerar dias quantidade)
        const dias = parseInt(args[0]) || 30;
        const quantidade = parseInt(args[1]) || 1;

        if (quantidade > 10) return message.reply("❌ Você só pode gerar no máximo 10 keys por vez.");
        
        let keysGeradas = [];

        try {
            for (let i = 0; i < quantidade; i++) {
                // Gerar código único
                const keyGerada = "XMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
                
                // INSERIR NA TABELA QUE VOCÊ CRIOU NO HEIDISQL
                // Colunas: key_code, duracao_dias, status (o status já tem default 'disponivel')
                await dbMySQL.query(
                    "INSERT INTO `keys` (`key_code`, `duracao_dias`, `status`) VALUES (?, ?, ?)", 
                    [keyGerada, dias, 'disponivel']
                );
                
                keysGeradas.push(keyGerada);
            }

            // 3. Criar a Resposta Visual (Embed)
            const embed = new EmbedBuilder()
                .setColor(0x7D26CD)
                .setTitle("🔑 KEYS GERADAS COM SUCESSO")
                .addFields(
                    { name: 'Duração', value: `\`${dias} dias\``, inline: true },
                    { name: 'Quantidade', value: `\`${quantidade}\``, inline: true },
                    { name: 'Lista de Keys', value: `\`\`\`${keysGeradas.join('\n')}\`\`\`` }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Gerado por ${message.author.tag}`, 
                    iconURL: process.env.LOGO_URL || message.author.displayAvatarURL() 
                });

            // 4. Enviar para o canal
            message.reply({ embeds: [embed] });

            // 5. Tentar enviar Log (Se você tiver a função logs configurada)
            console.log(`[LOG] ${quantidade} keys de ${dias} dias geradas por ${message.author.tag}`);

        } catch (error) {
            console.error("Erro ao gerar keys:", error);
            message.reply("❌ Ocorreu um erro ao salvar as keys no banco de dados da Aiven.");
        }
    }
};