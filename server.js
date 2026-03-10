/**
 * ONESTOPENGLISH BACKUP TOOL - VERSION 2.6 (Anti-Block & Cookie Bypass)
 * Intento de bypass para errores 410 en entornos de hosting.
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
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
        <h1 class="text-3xl font-extrabold text-slate-800 text-center mb-2">Respaldo v2.6</h1>
        <p class="text-slate-500 text-center text-sm mb-8">Bypass de seguridad activado para evitar Error 410</p>
        
        <div class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email / Usuario</label>
                <input type="text" id="email" class="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="tu-email@ejemplo.com">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                <input type="password" id="password" class="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="••••••••">
            </div>
            <button onclick="startDownload()" id="btn" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98]">
                🚀 Iniciar Captura Forzada
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

            if(!email || !password) return alert('Ingresa tus credenciales.');

            btn.disabled = true;
            status.classList.remove('hidden');
            addLog("Intentando bypass de conexión...");

            try {
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    addLog("¡Acceso logrado! Procesando archivos...");
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = "Onestop_Backup.zip";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    document.getElementById('statusText').innerText = "✅ Finalizado.";
                } else {
                    const text = await response.text();
                    addLog("Error Crítico: " + text);
                }
            } catch (err) {
                addLog("Error de red o Timeout.");
            } finally {
                btn.disabled = false;
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
    const { email, password } = req.body;
    const downloadPath = path.join(__dirname, `backup_${Date.now()}`);
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    try {
        if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

        const client = axios.create({
            headers: { 
                'User-Agent': UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 500 
        });

        const baseUrl = 'https://www.onestopenglish.com';
        
        // --- BYPASS: Intentamos entrar primero a la home para simular flujo real ---
        const homePage = await client.get(baseUrl);
        let cookies = homePage.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || "";

        // Intentar entrar a sign-in con las cookies de la home
        const signInUrl = `${baseUrl}/sign-in`;
        const signInPage = await client.get(signInUrl, {
            headers: { 'Cookie': cookies }
        });

        // Si sigue dando 410, intentamos el login directo "a ciegas"
        const params = new URLSearchParams();
        params.append('email', email);
        params.append('password', password);
        params.append('rememberMe', 'true');

        const loginRes = await client.post(signInUrl, params.toString(), {
            headers: { 
                'Cookie': cookies, 
                'Content-Type': 'application/x-www-form-urlencoded', 
                'Origin': baseUrl,
                'Referer': signInUrl 
            }
        });

        if (loginRes.headers['set-cookie']) {
            cookies = loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }

        // 2. RASTREO
        const sections = ['/skills', '/grammar-and-vocabulary', '/methodology'];
        let filesFound = 0;

        for (const section of sections) {
            try {
                const sectionDir = path.join(downloadPath, section.replace(/\//g, '') || 'docs');
                if (!fs.existsSync(sectionDir)) fs.mkdirSync(sectionDir);

                const pageRes = await client.get(`${baseUrl}${section}`, { headers: { 'Cookie': cookies } });
                
                const downloadRegex = /\/download\?ac=(\d+)/g;
                let match;
                const ids = new Set();
                while ((match = downloadRegex.exec(pageRes.data)) !== null) {
                    ids.add(match[1]);
                }

                for (const id of ids) {
                    try {
                        const fileUrl = `${baseUrl}/download?ac=${id}`;
                        const fileRes = await client({
                            method: 'get', url: fileUrl, responseType: 'stream',
                            headers: { 'Cookie': cookies, 'Referer': `${baseUrl}${section}` }
                        });

                        const disposition = fileRes.headers['content-disposition'];
                        let fileName = `document_${id}.pdf`;
                        if (disposition && disposition.includes('filename=')) {
                            fileName = disposition.split('filename=')[1].replace(/"/g, '').split(';')[0].trim();
                        }

                        const writer = fs.createWriteStream(path.join(sectionDir, fileName));
                        fileRes.data.pipe(writer);
                        await new Promise(r => writer.on('finish', r));
                        filesFound++;
                    } catch (e) {}
                }
            } catch (e) {}
        }

        if (filesFound === 0) return res.status(404).send("Error 410 persistente. El sitio ha bloqueado la conexión del servidor.");

        const archive = archiver('zip', { zlib: { level: 5 } });
        res.setHeader('Content-Type', 'application/zip');
        archive.pipe(res);
        archive.directory(downloadPath, false);
        await archive.finalize();

    } catch (error) {
        res.status(500).send("Error de conexión: " + error.message);
    } finally {
        setTimeout(() => { if (fs.existsSync(downloadPath)) fs.rmSync(downloadPath, { recursive: true, force: true }); }, 120000);
    }
});

app.listen(port, () => console.log(`Server v2.6 live on ${port}`));
