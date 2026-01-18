module.exports = {
    name: 'gerarextpre',
    async execute(message, args, client, dbMySQL) {
        if (!message.member.permissions.has("Administrator")) return;

        const dias = parseInt(args[0]) || 30;
        const codigo = `XMP-EXT-PRE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        try {
            await dbMySQL.query(
                "INSERT INTO keys_ext_pre (codigo, dias, status) VALUES (?, ?, 'disponivel')",
                [codigo, dias]
            );
            message.reply(`✅ **Key External Premium Gerada!**\nKey: \`${codigo}\`\nDias: \`${dias}\``);
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao salvar na tabela keys_ext_pre.");
        }
    }
};