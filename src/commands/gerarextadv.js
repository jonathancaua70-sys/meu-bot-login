module.exports = {
    name: 'gerarextadv',
    async execute(message, args, client, dbMySQL) {
        if (!message.member.permissions.has("Administrator")) return;

        const dias = parseInt(args[0]) || 30; 
        const codigo = `XMP-EXT-ADV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        try {
            await dbMySQL.query(
                "INSERT INTO keys_ext_adv (codigo, dias, status) VALUES (?, ?, 'disponivel')",
                [codigo, dias]
            );
            message.reply(`✅ **Key External Advanced Gerada!**\nKey: \`${codigo}\`\nDias: \`${dias}\``);
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao salvar na tabela keys_ext_adv.");
        }
    }
};