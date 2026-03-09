/**
 * ONESTOPENGLISH BACKUP TOOL - OPTIMIZADO PARA HOSTING
 * Requisitos:
 * 1. Hosting con soporte para Node.js.
 * 2. Ejecutar 'npm install' con el archivo package.json proporcionado.
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
    <title>Onestopenglish Hosting Backup</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 10px; }
    </style>
</head>
<body class="bg-slate-900 min-h-screen flex items-center justify-center p-4 font-sans">
    <div class="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-center mb-6">
            <div class="bg-indigo-100 p-3 rounded-2xl">
                <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d=" cloud-download"></path>
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                </svg>
            </div>
        </div>
        
        <h1 class="text-3xl font-extrabold text-slate-800 text-center mb-2">Respaldo Remoto</h1>
        <p class="text-slate-500 text-center text-sm mb-8">Esta herramienta descargará la librería de Onestopenglish directamente a tu servidor y luego te entregará un ZIP.</p>
        
        <div class="space-y-5">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Registrado</label>
                <input type="email" id="email" class="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="tu@ejemplo.com">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                <input type="password" id="password" class="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="••••••••">
            </div>
            <button onclick="startDownload()" id="btn" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 active:scale-[0.98]">
                📦 Iniciar Descarga Masiva
            </button>
        </div>

        <div id="status" class="mt-8 border-t border-slate-100 pt-6 hidden">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                    <span id="statusText" class="text-sm font-semibold text-slate-700">Trabajando en el servidor...</span>
                </div>
            </div>
            <div class="bg-slate-800 p-4 rounded-xl shadow-inner">
                <div id="log" class="text-[11px] font-mono text-indigo-300 custom-scroll overflow-y-auto max-h-48 space-y-1"></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-4 text-center italic">Nota: No cierres esta ventana hasta recibir el archivo ZIP.</p>
        </div>
    </div>

    <script>
        function addLog(msg, type = 'info') {
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
            const log = document.getElementById('log');

            if(!email || !password) return alert('Por favor, ingresa tus credenciales.');

            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            status.classList.remove('hidden');
            log.innerHTML = "";
            addLog("Iniciando proceso en el servidor hosting...");

            try {
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    addLog("¡Éxito! El servidor terminó la descarga.", 'success');
                    addLog("Preparando descarga del ZIP a tu computadora...");
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = "Respaldo_Onestopenglish.zip";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    document.getElementById('statusText').innerText = "✅ Backup finalizado.";
                } else {
                    const text = await response.text();
                    addLog("Error: " + text, 'error');
                }
            } catch (err) {
                addLog("Error de red o timeout en el hosting.", 'error');
            } finally {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    </script>
</body>
</html>
`;

// --- LÓGICA DEL SERVIDOR ---

app.get('/', (req, res) => res.send(htmlContent));

app.post('/api/download', async (req, res) => {
    // Configurar el timeout del servidor para procesos largos
    req.setTimeout(0); // Desactivar timeout de entrada
    res.setTimeout(0); // Desactivar timeout de salida

    const { email, password } = req.body;
    const downloadPath = path.join(__dirname, `temp_backup_${Date.now()}`);
    let cookies = "";

    try {
        if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

        // 1. LOGIN (HTTP puro para compatibilidad con hosting compartido)
        const form = new FormData();
        form.append('username', email);
        form.append('password', password);
        
        console.log("Intentando login...");
        const loginRes = await axios.post('https://www.onestopenglish.com/login', form, {
            headers: { ...form.getHeaders() },
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });

        cookies = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : "";

        // 2. SECCIONES A DESCARGAR
        const sections = [
            '/skills',
            '/grammar-and-vocabulary',
            '/business-and-esp',
            '/methodology',
            '/young-learners',
            '/exams'
        ];

        for (const section of sections) {
            const sectionName = section.replace(/\//g, '') || 'general';
            const sectionDir = path.join(downloadPath, sectionName);
            if (!fs.existsSync(sectionDir)) fs.mkdirSync(sectionDir);

            const pageRes = await axios.get(`https://www.onestopenglish.com${section}`, {
                headers: { 'Cookie': cookies }
            });

            // Regex mejorado para capturar enlaces PDF
            const pdfRegex = /href="([^"]+\.pdf)"/g;
            let match;
            const pdfLinks = [];

            while ((match = pdfRegex.exec(pageRes.data)) !== null) {
                pdfLinks.push(match[1]);
            }

            for (let fileUrl of pdfLinks) {
                try {
                    if (!fileUrl.startsWith('http')) fileUrl = 'https://www.onestopenglish.com' + fileUrl;
                    
                    const rawName = path.basename(fileUrl);
                    const safeName = rawName.split('?')[0]; // Limpiar parámetros de URL
                    const fileTarget = path.join(sectionDir, safeName);

                    const fileStream = await axios({
                        method: 'get',
                        url: fileUrl,
                        responseType: 'stream',
                        headers: { 'Cookie': cookies }
                    });

                    const writer = fs.createWriteStream(fileTarget);
                    fileStream.data.pipe(writer);
                    await new Promise(r => writer.on('finish', r));
                } catch (e) {
                    console.log(`Error en archivo: ${fileUrl}`);
                }
            }
        }

        // 3. COMPRESIÓN ZIP
        const archive = archiver('zip', { zlib: { level: 5 } });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=respaldo.zip');
        
        archive.pipe(res);
        archive.directory(downloadPath, false);
        await archive.finalize();

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor. Verifica tus credenciales.');
    } finally {
        // Limpieza de archivos temporales después de 1 minuto para dar tiempo al ZIP
        setTimeout(() => {
            if (fs.existsSync(downloadPath)) {
                fs.rmSync(downloadPath, { recursive: true, force: true });
            }
        }, 60000);
    }
});

app.listen(port, () => console.log(`App de respaldo lista en puerto \${port}`));
