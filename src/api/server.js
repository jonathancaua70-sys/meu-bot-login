const express = require('express');
const app = express();

app.use(express.json());
app.set('trust proxy', true);

// Esta função é chamada no seu index.js
function iniciarAPI(dbMySQL, enviarLog, client) {
    // 4. Try/Catch no Banco - Verificar conexão
    try {
        if (!dbMySQL) {
            console.error('ERRO: Banco de dados não conectado');
            return;
        }
        console.log('✅ Banco de dados conectado com sucesso');
    } catch (dbError) {
        console.error('ERRO ao conectar banco:', dbError);
        // Não retorna, continua mesmo sem banco
    }

    // --- ROTA HEALTH CHECK (Para o Render saber que o bot está vivo) ---
    app.get('/', (req, res) => {
        res.json({ 
            status: 'online', 
            uptime: Math.floor(process.uptime()),
            message: 'XMP System API is running!' 
        });
    });

    // --- ROTA DE LOGIN DO PAINEL (.EXE) ---
    app.post('/login', async (req, res) => {
        // 4. Logs de Debug - Monitorar tentativas de login
        console.log('Tentativa de login:', req.body);
        
        let { usuario, senha, hwid, ip, painel_alvo } = req.body;
        
        // Captura o IP real do usuário através do proxy do Render
        const ipReal = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const finalIp = (ip === "0.0.0.0" || !ip) ? ipReal : ip;

        if (!usuario || !senha || !hwid || !painel_alvo) {
            return res.status(400).json({ success: false, message: "Dados incompletos. painel_alvo é obrigatório." });
        }

        try {
            // 2. Corrigir Query de Login - Usar colunas exatas do HeidiSQL
            const [rows] = await dbMySQL.query("SELECT usuario, senha, plano, expiracao, hwid_vinculado, ip_vinculado FROM usuarios WHERE usuario = ? AND senha = ?", [usuario, senha]);

            if (rows.length > 0) {
                const userDb = rows[0];

                // 1. Verifica Expiração
                if (new Date() > new Date(userDb.expiracao)) {
                    return res.status(403).json({ success: false, message: "Sua licença expirou!" });
                }

                // 3. Lógica de Bloqueio (4 Painéis) - Comparar plano com painel_alvo
                if (userDb.plano !== painel_alvo) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'Seu plano não permite acesso a este painel'
                    });
                }

                // VALIDAÇÃO DE HWID - Vincula HWID se estiver vazio (Primeiro Acesso)
                if (!userDb.hwid_vinculado) {
                    await dbMySQL.query("UPDATE usuarios SET hwid_vinculado = ?, ip_vinculado = ? WHERE usuario = ?", [hwid, finalIp, usuario]);
                    
                    if (enviarLog) {
                        enviarLog(client, " NOVO HWID VINCULADO", `Usuário: ${usuario}\nPlano: ${userDb.plano}\nPC: ${hwid}`, 0xFFFF00);
                    }
                    return res.json({ success: true, message: "PC Vinculado com sucesso!" });
                }

                // VALIDAÇÃO DE HWID - Verifica se o HWID é o mesmo que está no banco
                if (userDb.hwid_vinculado !== hwid) {
                    return res.status(403).json({ success: false, message: "Acesso Negado: HWID não corresponde ao PC vinculado!" });
                }

                // Atualiza IP e libera acesso
                await dbMySQL.query("UPDATE usuarios SET ip_vinculado = ? WHERE usuario = ?", [finalIp, usuario]);
                
                // Salva no log de acesso
                await dbMySQL.query("INSERT INTO logs_acesso (usuario, acao, ip, hwid, painel) VALUES (?, ?, ?, ?, ?)", 
                    [usuario, 'Login com Sucesso', finalIp, hwid, painel_alvo]);

                return res.json({ 
                    success: true, 
                    message: "Acesso Liberado!",
                    plano: userDb.plano,
                    expiracao: userDb.expiracao
                });

            } else {
                return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
            }
        } catch (err) {
            console.error("Erro no login API:", err);
            res.status(500).json({ success: false, message: "Erro interno no servidor." });
        }
    });

    // --- ROTA DE REGISTRO WEB (Ativação de Key) ---
    app.post('/web-registro', async (req, res) => {
        const { usuario, senha, key, foto_url } = req.body; 
        
        if (!usuario || !senha || !key) {
            return res.status(400).json({ success: false, message: "Campos obrigatórios faltando!" });
        }

        try {
            // Verifica se a Key existe na tabela 'keys'
            const [keyRows] = await dbMySQL.query("SELECT duracao_dias FROM `keys` WHERE `key_code` = ? AND status = 'disponivel'", [key]);
            
            if (keyRows.length === 0) {
                return res.status(400).json({ success: false, message: "Key inválida ou já utilizada!" });
            }

            const dias = keyRows[0].duracao_dias;

            // Cria o usuário e define a expiração somando os dias da key
            await dbMySQL.query(
                "INSERT INTO usuarios (usuario, senha, expiracao, foto_url) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)", 
                [usuario, senha, dias, foto_url || null]
            );

            // Marca a key como usada
            await dbMySQL.query("UPDATE `keys` SET status = 'usada', used_by = ? WHERE `key_code` = ?", [usuario, key]);

            if (enviarLog) {
                enviarLog(client, "✅ NOVO REGISTRO", `Usuário: ${usuario}\nKey: ${key}\nDias: ${dias}`, 0x00FF00);
            }

            return res.json({ success: true, message: "Conta criada e Key ativada!" });

        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: "Este nome de usuário já está em uso!" });
            console.error("Erro no registro:", err);
            res.status(500).json({ success: false, message: "Erro interno ao processar registro." });
        }
    });

    // --- ROTA DE VERIFICAÇÃO DE ACESSO AO PAINEL ---
    app.post('/verificar-acesso', async (req, res) => {
        const { usuario, painel_alvo } = req.body;
        
        if (!usuario || !painel_alvo) {
            return res.status(400).json({ success: false, message: "Dados incompletos." });
        }

        try {
            const [rows] = await dbMySQL.query("SELECT plano, expiracao, hwid_vinculado FROM usuarios WHERE usuario = ?", [usuario]);

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "Usuário não encontrado." });
            }

            const userDb = rows[0];

            // Verifica se a licença expirou
            if (new Date() > new Date(userDb.expiracao)) {
                return res.status(403).json({ success: false, message: "Sua licença expirou!" });
            }

            // Verifica se o plano corresponde ao painel solicitado
            if (userDb.plano !== painel_alvo) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Acesso Negado: Sua key é válida apenas para o painel ${userDb.plano.toUpperCase()}`,
                    plano_permitido: userDb.plano
                });
            }

            return res.json({ 
                success: true, 
                message: "Acesso permitido!",
                plano: userDb.plano,
                expiracao: userDb.expiracao,
                hwid_vinculado: !!userDb.hwid_vinculado
            });

        } catch (err) {
            console.error("Erro na verificação de acesso:", err);
            res.status(500).json({ success: false, message: "Erro interno no servidor." });
        }
    });

    // 2. Verificação de Porta - Usar porta 3000 como padrão
    const PORTA = process.env.PORT || 3000;
    
    // 3. Log de Inicialização - Mensagem clara no terminal
    app.listen(PORTA, '0.0.0.0', () => {
        console.log(`================================`);
        console.log(`🟢 SERVIDOR ONLINE NA PORTA ${PORTA}`);
        console.log(`🌐 URL: http://localhost:${PORTA}`);
        console.log(`📊 Health: http://localhost:${PORTA}/`);
        console.log(`================================`);
        console.log('Servidor iniciado com sucesso!');
    });
}

module.exports = { iniciarAPI };
