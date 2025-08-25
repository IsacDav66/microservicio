// index.js - El Microservicio que usa binarios locales
const express = require('express');
const yt = require('yt-search');
const { execFile } = require('child_process'); // Usamos el ejecutor de procesos de Node
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execFileAsync = promisify(execFile);

// Rutas a nuestros binarios descargados
const YTDLP_PATH = path.join(__dirname, 'bin', 'yt-dlp');
const FFMPEG_PATH = path.join(__dirname, 'bin', 'ffmpeg');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_DURATION = 900;

app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta el parámetro ?q=' });

    let tempFilePath = '';
    try {
        const search = await yt.search(query);
        const video = search.videos[0];
        if (!video) return res.status(404).json({ error: 'No se encontraron resultados.' });
        if (video.seconds > MAX_DURATION) return res.status(413).json({ error: `Video muy largo.` });

        const videoUrl = video.url;
        tempFilePath = path.join(__dirname, `temp_audio_${Date.now()}.mp3`);

        // Ejecutamos yt-dlp como un comando, especificando la ruta de ffmpeg
        console.log(`Ejecutando: ${YTDLP_PATH} ...`);
        await execFileAsync(YTDLP_PATH, [
            videoUrl,
            '-o', tempFilePath,
            '--ffmpeg-location', FFMPEG_PATH,
            '-x', // Extraer audio
            '--audio-format', 'mp3',
            '--audio-quality', '0', // Mejor calidad
            '--no-check-certificate',
            '--no-warnings',
        ]);

        if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
            throw new Error('El archivo de salida de yt-dlp está vacío o no se creó.');
        }

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(video.title)}.mp3"`);
        const readStream = fs.createReadStream(tempFilePath);
        readStream.pipe(res);
        readStream.on('end', () => fs.unlink(tempFilePath, () => {}));
        readStream.on('error', () => fs.unlink(tempFilePath, () => {}));

    } catch (error) {
        if (tempFilePath) fs.unlink(tempFilePath, () => {});
        console.error('Error en el proceso de yt-dlp:', error);
        res.status(500).json({ error: 'Error interno al procesar con yt-dlp.', details: error.stderr || error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servicio de descarga (binarios locales) en puerto ${PORT}`);
});