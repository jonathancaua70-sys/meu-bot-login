module.exports = {
    name: 'gerarintpre',
    async execute(message, args, client, dbMySQL) {
        if (!message.member.permissions.has("Administrator")) return;

        const dias = parseInt(args[0]) || 30;
        const codigo = `XMP-INT-PRE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        try {
            await dbMySQL.query(
                "INSERT INTO keys_int_pre (codigo, dias, status) VALUES (?, ?, 'disponivel')",
                [codigo, dias]
            );
            message.reply(`✅ **Key Internal Premium Gerada!**\nKey: \`${codigo}\`\nDias: \`${dias}\``);
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao salvar na tabela keys_int_pre.");
        }
    }
};