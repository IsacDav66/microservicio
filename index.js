// index.js - El Microservicio que replica la lógica del plugin original
const express = require('express');
const yt = require('yt-search');
const ytdl = require('ytdl-core');

const app = express();
const PORT = process.env.PORT || 8080; // Usamos un puerto común
const MAX_DURATION = 900; // 15 minutos

// El endpoint que tu bot principal llamará
app.get('/download', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Falta el parámetro de búsqueda ?q=' });
    }

    try {
        // 1. Buscar el video con yt-search
        console.log(`[Microservicio] Buscando: "${query}"`);
        const search = await yt.search(query);
        const video = search.videos[0];

        if (!video) {
            console.log(`[Microservicio] No se encontraron resultados.`);
            return res.status(404).json({ error: 'No se encontraron resultados.' });
        }
        if (video.seconds > MAX_DURATION) {
            console.log(`[Microservicio] Video demasiado largo: ${video.timestamp}`);
            return res.status(413).json({ error: `El video es demasiado largo (${video.seconds}s).` });
        }
        
        console.log(`[Microservicio] Descargando: "${video.title}"`);

        // 2. Establecer las cabeceras para que el cliente sepa que es un archivo
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(video.title)}.mp3"`);
        
        // 3. Usar ytdl-core para obtener el stream de audio y enviarlo directamente en la respuesta
        // El método .pipe() es muy eficiente, envía los datos a medida que se descargan.
        ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);

    } catch (error) {
        console.error('[Microservicio] Error:', error.message);
        // Evitamos enviar una respuesta de error HTML completa si ya se han enviado las cabeceras.
        if (!res.headersSent) {
            res.status(500).json({ error: 'Ocurrió un error interno.', details: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Microservicio de descarga listo en http://localhost:${PORT}`);
});