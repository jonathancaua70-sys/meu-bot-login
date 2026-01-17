const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: 'keys',
    // Sincronizado com a ordem do seu index.js: (message, args, client, dbMySQL)
    async execute(message, args, client, dbMySQL) {
        
        // 1. Verificação de Permissão de Administrador
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você não tem permissão para listar as keys!");
        }

        // Define o status para buscar (padrão: disponivel)
        const statusBusca = args[0] || 'disponivel';

        try {
            // 2. Consulta ao banco da Aiven usando as colunas que você criou
            // Usamos LIMIT 20 para não exceder o limite de caracteres da Embed do Discord
            const [rows] = await dbMySQL.query(
                "SELECT key_code, duracao_dias, status FROM `keys` WHERE status = ? ORDER BY data_criacao DESC LIMIT 20", 
                [statusBusca]
            );

            if (rows.length === 0) {
                return message.reply(`❌ Nenhuma key com o status **${statusBusca}** foi encontrada.`);
            }

            // 3. Formatação da lista de keys
            const lista = rows.map((k, i) => {
                return `**${i + 1}.** \`${k.key_code}\` | **${k.duracao_dias}d**`;
            }).join('\n');

            // 4. Montagem da Embed
            const embed = new EmbedBuilder()
                .setTitle(`🔑 LISTA DE KEYS: ${statusBusca.toUpperCase()}`)
                .setDescription(lista)
                .setColor(statusBusca === 'disponivel' ? 0x00FF00 : 0xFF0000)
                .setFooter({ 
                    text: `Total mostrado: ${rows.length}`, 
                    iconURL: process.env.LOGO_URL 
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao listar keys:", error);
            return message.reply("❌ Erro ao conectar ao banco de dados para listar as keys.");
        }
    }
};