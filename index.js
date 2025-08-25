// index.js - El Microservicio de Descarga
const express = require('express');
const ytdl = require('ytdl-core');
const yt = require('yt-search');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_DURATION = 720; // 12 minutos

app.get('/search', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Falta el parámetro de búsqueda ?q=' });
    }

    try {
        const search = await yt.search(query);
        const video = search.videos[0];

        if (!video) {
            return res.status(404).json({ error: 'No se encontraron resultados.' });
        }
        if (video.seconds > MAX_DURATION) {
            return res.status(413).json({ error: `El video es demasiado largo (${video.seconds}s).` });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(video.title)}.mp3"`);
        ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);

    } catch (error) {
        console.error('Error en el servicio de descarga:', error.message);
        res.status(500).json({ error: 'Ocurrió un error interno en el servidor de descarga.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servicio de descarga escuchando en el puerto ${PORT}`);
});