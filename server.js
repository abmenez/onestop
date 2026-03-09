/**
 * ONESTOPENGLISH BACKUP TOOL - VERSION 2.4 (Manejo de Error 410 Gone)
 * Intento de bypass de recursos eliminados y mejora de seguimiento de sesión.
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const FormData = require('form-data');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// --- INTERFAZ HTML ---
const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Onestopenglish Backup Lite</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 10px; }
    </style>
</head>
<body class="bg-slate-900 min-h-screen flex items-center justify-center p-4 font-sans">
    <div class="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg">
        <h1 class="text-3xl font-extrabold text-slate-800 text-center mb-2">Respaldo v2.4</h1>
        <p class="text-slate-500 text-center text-sm mb-8">Intentando recuperar archivos (Evitando Error 410)</p>
        
        <div class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email / Usuario</label>
                <input type="text" id="email" class="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="email@ejemplo.com">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                <input type="password" id="password" class="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="••••••••">
            </div>
            <button onclick="startDownload()" id="btn" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98]">
                🚀 Iniciar Respaldo Total
            </button>
        </div>

        <div id="status" class="mt-8 border-t border-slate-100 pt-6 hidden">
            <div class="flex items-center space-x-3 mb-4">
                <div class="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                <span id="statusText" class="text-sm font-semibold text-slate-700">Procesando...</span>
            </div>
            <div class="bg-slate-800 p-4 rounded-xl shadow-inner">
                <div id="log" class="text-[11px] font-mono text-indigo-300 custom-scroll overflow-y-auto max-h-48 space-y-1"></div>
            </div>
        </div>
    </div>

    <script>
        function addLog(msg) {
            const log = document.getElementById('log');
            const div = document.createElement('div');
            const time = new Date().toLocaleTimeString();
            div.innerHTML = \`<span class="text-slate-500">[\${time}]</span> \${msg}\`;
            log.appendChild(div);
            log.scrollTop = log.scrollHeight;
        }

        async function startDownload() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('btn');
            const status = document.getElementById('status');

            if(!email || !password) return alert('Credenciales incompletas.');

            btn.disabled = true;
            btn.classList.add('opacity-50');
            status.classList.remove('hidden');
            addLog("Iniciando bypass de seguridad...");

            try {
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    addLog("Proceso de rastreo completado.");
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = "Backup_Onestopenglish.zip";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    document.getElementById('statusText').innerText = "✅ Backup finalizado.";
                } else {
                    const text = await response.text();
                    addLog("Aviso: " + text);
                }
            } catch (err) {
                addLog("Error de conexión. Revisa los logs de Render.");
            } finally {
                btn.disabled = false;
                btn.classList.remove('opacity-50');
            }
        }
    </script>
</body>
</html>
`;

// --- LÓGICA DEL SERVIDOR ---

app.get('/', (req, res) => res.send(htmlContent));

app.post('/api/download', async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);

    const { email, password } = req.body;
    const downloadPath = path.join(__dirname, `backup_tmp_${Date.now()}`);
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    try {
        if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

        const baseUrl = 'https://www.onestopenglish.com';
        const signInUrl = `${baseUrl}/sign-in`;
        
        // Configuración común de Axios
        const client = axios.create({
            headers: { 'User-Agent': UA },
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Aceptamos 410 para manejarlo nosotros
        });

        // 1. Obtener cookies iniciales
        const initPage = await client.get(signInUrl);
        let cookies = initPage.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || "";

        // 2. Login
        const params = new URLSearchParams();
        params.append('email', email); 
        params.append('password', password);
        params.append('rememberMe', 'true');

        const loginRes = await client.post(signInUrl, params.toString(), {
            headers: { 
                'Cookie': cookies,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': signInUrl
            }
        });

        if (loginRes.headers['set-cookie']) {
            cookies = loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }

        // 3. DESCARGAS (Con manejo de error individual por sección)
        const sections = ['/skills', '/grammar-and-vocabulary', '/methodology', '/young-learners'];
        let filesFound = 0;

        for (const section of sections) {
            try {
                const sectionDir = path.join(downloadPath, section.replace(/\//g, '') || 'general');
                if (!fs.existsSync(sectionDir)) fs.mkdirSync(sectionDir);

                const pageRes = await client.get(`${baseUrl}${section}`, {
                    headers: { 'Cookie': cookies }
                });

                if (pageRes.status === 410) {
                    console.log(`Sección ${section} marcada como eliminada (410).`);
                    continue; 
                }

                const pdfRegex = /href="([^"]+\.pdf)"/g;
                let match;
                while ((match = pdfRegex.exec(pageRes.data)) !== null) {
                    let fileUrl = match[1];
                    try {
                        if (!fileUrl.startsWith('http')) fileUrl = baseUrl + fileUrl;
                        const fileName = path.basename(fileUrl).split('?')[0];
                        const fileTarget = path.join(sectionDir, fileName);

                        const fileStream = await client({
                            method: 'get', url: fileUrl, responseType: 'stream',
                            headers: { 'Cookie': cookies }
                        });

                        const writer = fs.createWriteStream(fileTarget);
                        fileStream.data.pipe(writer);
                        await new Promise(r => writer.on('finish', r));
                        filesFound++;
                    } catch (e) {}
                }
            } catch (err) {
                console.log(`Error saltado en sección ${section}: ${err.message}`);
            }
        }

        if (filesFound === 0) {
            return res.status(404).send("No se pudieron extraer archivos. Es posible que el acceso esté restringido o el sitio ya esté cerrado.");
        }

        const archive = archiver('zip', { zlib: { level: 5 } });
        res.setHeader('Content-Type', 'application/zip');
        archive.pipe(res);
        archive.directory(downloadPath, false);
        await archive.finalize();

    } catch (error) {
        res.status(500).send(error.message);
    } finally {
        setTimeout(() => { if (fs.existsSync(downloadPath)) fs.rmSync(downloadPath, { recursive: true, force: true }); }, 60000);
    }
});

app.listen(port, () => console.log(`Server v2.4 running on port ${port}`));
