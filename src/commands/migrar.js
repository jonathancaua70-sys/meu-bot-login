module.exports = {
    name: 'migrar',
    async execute(message, args, client, dbMySQL) {
        if (!message.member.permissions.has("Administrator")) return;

        try {
            // Verificar quais colunas já existem
            const [columns] = await dbMySQL.query("SHOW COLUMNS FROM usuarios");
            const columnNames = columns.map(col => col.Field);

            let adicionadas = [];

            // Adicionar coluna usuario se não existir
            if (!columnNames.includes('usuario')) {
                await dbMySQL.query("ALTER TABLE usuarios ADD COLUMN usuario VARCHAR(50) NULL AFTER id");
                adicionadas.push('usuario');
            }

            // Adicionar coluna senha se não existir
            if (!columnNames.includes('senha')) {
                await dbMySQL.query("ALTER TABLE usuarios ADD COLUMN senha VARCHAR(255) NULL AFTER usuario");
                adicionadas.push('senha');
            }

            // Adicionar coluna plano se não existir ou ajustar seu tamanho
            if (!columnNames.includes('plano')) {
                await dbMySQL.query("ALTER TABLE usuarios ADD COLUMN plano VARCHAR(50) NULL AFTER senha");
                adicionadas.push('plano');
            } else {
                // Se a coluna 'plano' já existe, verificar se o tamanho é suficiente e ajustar se necessário
                const [planoColumnInfo] = await dbMySQL.query("SHOW COLUMNS FROM usuarios LIKE 'plano'");
                if (planoColumnInfo.length > 0 && planoColumnInfo[0].Type !== 'varchar(50)') {
                    await dbMySQL.query("ALTER TABLE usuarios MODIFY COLUMN plano VARCHAR(50) NULL");
                    adicionadas.push('plano (tamanho ajustado)');
                }
            }

            // Adicionar coluna discord_id se não existir
            if (!columnNames.includes('discord_id')) {
                await dbMySQL.query("ALTER TABLE usuarios ADD COLUMN discord_id VARCHAR(50) NULL AFTER plano");
                adicionadas.push('discord_id');
            }

            // Adicionar coluna expiracao se não existir
            if (!columnNames.includes('expiracao')) {
                await dbMySQL.query("ALTER TABLE usuarios ADD COLUMN expiracao DATETIME NULL AFTER discord_id");
                adicionadas.push('expiracao');
            }

            // Adicionar coluna hwid_vinculado se não existir
            if (!columnNames.includes('hwid_vinculado')) {
                await dbMySQL.query("ALTER TABLE usuarios ADD COLUMN hwid_vinculado VARCHAR(255) NULL AFTER expiracao");
                adicionadas.push('hwid_vinculado');
            }

            // Adicionar coluna ip_vinculado se não existir
            if (!columnNames.includes('ip_vinculado')) {
                await dbMySQL.query("ALTER TABLE usuarios ADD COLUMN ip_vinculado VARCHAR(45) NULL AFTER hwid_vinculado");
                adicionadas.push('ip_vinculado');
            }

            // Verificar e adicionar coluna usada_por nas tabelas de keys
            const tabelasKeys = ['keys_ext_adv', 'keys_ext_pre', 'keys_int_adv', 'keys_int_pre'];
            let keysAjustadas = [];

            for (const tabela of tabelasKeys) {
                try {
                    const [keyColumns] = await dbMySQL.query(`SHOW COLUMNS FROM ${tabela}`);
                    const keyColumnNames = keyColumns.map(col => col.Field);
                    
                    if (!keyColumnNames.includes('usada_por')) {
                        await dbMySQL.query(`ALTER TABLE ${tabela} ADD COLUMN usada_por VARCHAR(100) NULL AFTER status`);
                        keysAjustadas.push(`${tabela}.usada_por`);
                    }
                } catch (error) {
                    // Tabela pode não existir, ignorar
                    console.log(`Tabela ${tabela} não encontrada ou erro: ${error.message}`);
                }
            }

            if (adicionadas.length > 0 || keysAjustadas.length > 0) {
                let mensagem = `✅ **Migração concluída!**\n`;
                if (adicionadas.length > 0) mensagem += `📋 Colunas usuarios: ${adicionadas.join(', ')}\n`;
                if (keysAjustadas.length > 0) mensagem += `🔑 Colunas keys: ${keysAjustadas.join(', ')}`;
                message.reply(mensagem);
            } else {
                message.reply("ℹ️ **Nenhuma migração necessária.** Todas as colunas já existem.");
            }
            
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao executar migração: " + error.message);
        }
    }
};
