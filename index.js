// index.js - El Microservicio de Descarga con yt-dlp
const express = require('express');
const yt = require('yt-search');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

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

        // Ejecutamos yt-dlp como un proceso de línea de comandos
        await ytdlp(videoUrl, {
            output: tempFilePath,
            format: 'bestaudio[ext=m4a]/bestaudio', // Descarga el mejor audio, preferiblemente m4a
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0, // 0 es la mejor calidad
        });

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(video.title)}.mp3"`);
        const readStream = fs.createReadStream(tempFilePath);
        readStream.pipe(res);

        // Limpieza del archivo después de que se termine de enviar
        readStream.on('end', () => {
            fs.unlink(tempFilePath, () => {});
        });
        readStream.on('error', (err) => {
            fs.unlink(tempFilePath, () => {});
        });

    } catch (error) {
        if (tempFilePath) fs.unlink(tempFilePath, () => {});
        console.error('Error en yt-dlp:', error);
        res.status(500).json({ error: 'Error interno al procesar con yt-dlp.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servicio de descarga con yt-dlp en puerto ${PORT}`);
});