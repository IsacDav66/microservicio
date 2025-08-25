// index.js - El Microservicio de Descarga con yt-dlp y ffmpeg desde NPM
const express = require('express');
const yt = require('yt-search');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Le decimos a yt-dlp-exec dónde encontrar ffmpeg
ytdlp.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_DURATION = 900; // 15 minutos

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

        // Ejecutamos yt-dlp
        await ytdlp(videoUrl, {
            output: tempFilePath,
            noCheckCertificates: true,
            noWarnings: true,
            format: 'bestaudio[ext=m4a]/bestaudio',
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
        });

        // Verificamos si el archivo se creó
        if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
            throw new Error('El archivo de salida de yt-dlp está vacío o no se creó.');
        }

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(video.title)}.mp3"`);
        const readStream = fs.createReadStream(tempFilePath);
        
        readStream.pipe(res);

        // Limpieza del archivo después de que se termine de enviar
        readStream.on('end', () => {
            fs.unlink(tempFilePath, (err) => {
                if (err) console.error("Error al eliminar el archivo temporal en 'end':", err);
            });
        });
        readStream.on('error', (err) => {
            console.error("Error en el stream de lectura:", err);
            fs.unlink(tempFilePath, () => {});
        });

    } catch (error) {
        if (tempFilePath) fs.unlink(tempFilePath, () => {});
        console.error('Error en el proceso de yt-dlp:', error);
        res.status(500).json({ error: 'Error interno al procesar con yt-dlp.', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servicio de descarga con yt-dlp (NPM) en puerto ${PORT}`);
});