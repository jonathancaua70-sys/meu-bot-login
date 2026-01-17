const express = require('express');
const app = express();

app.use(express.json());
app.set('trust proxy', true);

// Esta função será chamada pelo seu index.js para iniciar o servidor
function iniciarAPI(dbMySQL, enviarLog, client, CONFIGS) {

    // --- ROTA HEALTH CHECK ---
    app.get('/', (req, res) => {
        res.json({ 
            status: 'online', 
            uptime: Math.floor(process.uptime()),
            message: 'XMP System API is running!' 
        });
    });

    // --- ROTA DE LOGIN DO PAINEL (.EXE) ---
    app.post('/login', async (req, res) => {
        let { usuario, senha, hwid, ip } = req.body;
        const ipReal = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const finalIp = (ip === "0.0.0.0" || !ip) ? ipReal : ip;

        if (!usuario || !senha || !hwid) {
            return res.status(400).json({ success: false, message: "Dados incompletos." });
        }

        try {
            const [rows] = await dbMySQL.query("SELECT * FROM usuarios WHERE usuario = ? AND senha = ?", [usuario, senha]);

            if (rows.length > 0) {
                const userDb = rows[0];

                if (new Date() > new Date(userDb.expiracao)) {
                    return res.status(403).json({ success: false, message: "Sua licença expirou!" });
                }

                if (!userDb.hwid_vinculado) {
                    await dbMySQL.query("UPDATE usuarios SET hwid_vinculado = ?, ip_vinculado = ? WHERE usuario = ?", [hwid, finalIp, usuario]);
                    enviarLog(client, "💻 NOVO HWID VINCULADO", `Usuário: ${usuario}\nPC: ${hwid}`, 0xFFFF00, CONFIGS.LOGO_URL);
                    return res.json({ success: true, message: "PC Vinculado com sucesso!" });
                }

                if (userDb.hwid_vinculado !== hwid) {
                    return res.status(403).json({ success: false, message: "Usuário já vinculado a outro PC!" });
                }

                await dbMySQL.query("UPDATE usuarios SET ip_vinculado = ? WHERE usuario = ?", [finalIp, usuario]);
                return res.json({ success: true, message: "Acesso Liberado!" });
            } else {
                return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: "Erro interno no servidor." });
        }
    });

    // --- ROTA DE REGISTRO WEB ---
    app.post('/web-registro', async (req, res) => {
        const { usuario, senha, key, foto_url } = req.body; 
        
        if (!usuario || !senha || !key) {
            return res.status(400).json({ success: false, message: "Campos obrigatórios faltando!" });
        }

        try {
            const [keyRows] = await dbMySQL.query("SELECT duracao_dias FROM `keys` WHERE `key_code` = ? AND status = 'disponivel'", [key]);
            
            if (keyRows.length === 0) {
                return res.status(400).json({ success: false, message: "Key inválida ou usada!" });
            }

            const dias = keyRows[0].duracao_dias;

            await dbMySQL.query(
                "INSERT INTO usuarios (usuario, senha, expiracao, foto_url) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)", 
                [usuario, senha, dias, foto_url || null]
            );

            await dbMySQL.query("UPDATE `keys` SET status = 'usada', used_by = ? WHERE `key_code` = ?", [usuario, key]);

            enviarLog(client, "✅ REGISTRO WEB", `Usuário: ${usuario}\nKey: ${key}\nDias: ${dias}`, 0x00FF00, CONFIGS.LOGO_URL);
            return res.json({ success: true, message: "Conta criada com sucesso!" });

        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: "Usuário já existe!" });
            res.status(500).json({ success: false, message: "Erro interno." });
        }
    });

    const PORTA = process.env.PORT || 10000;
    app.listen(PORTA, '0.0.0.0', () => console.log(`✅ API Online na porta ${PORTA}`));
}

module.exports = { iniciarAPI };