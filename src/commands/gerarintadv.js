module.exports = {
    name: 'gerarintadv',
    async execute(message, args, client, dbMySQL) {
        if (!message.member.permissions.has("Administrator")) return;

        const dias = parseInt(args[0]) || 30;
        const codigo = `XMP-INT-ADV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        try {
            await dbMySQL.query(
                "INSERT INTO keys_int_adv (codigo, dias, status) VALUES (?, ?, 'disponivel')",
                [codigo, dias]
            );
            message.reply(`✅ **Key Internal Advanced Gerada!**\nKey: \`${codigo}\`\nDias: \`${dias}\``);
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao salvar na tabela keys_int_adv.");
        }
    }
};