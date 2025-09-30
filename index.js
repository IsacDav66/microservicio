// index.js - El Microservicio que replica la lógica del plugin original
const express = require('express');
const yt = require('yt-search');
// CAMBIO 1: Importar el wrapper de yt-dlp
const ytDlp = require('yt-dlp-exec');
// CAMBIO 2: Importar stream y promesas para manejo de pipes
const { pipeline } = require('stream/promises'); 

const app = express();
const PORT = process.env.PORT || 8080; 
const MAX_DURATION = 900; // 15 minutos

// El endpoint que tu bot principal llamará
app.get('/download', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Falta el parámetro de búsqueda ?q=' });
    }

    try {
        // 1. Buscar el video con yt-search (Esto se mantiene)
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
        
        // 3. CAMBIO CRÍTICO: Usar yt-dlp para obtener el stream de audio
        // yt-dlp --output - --extract-audio --audio-format mp3 URL
        const audioStream = ytDlp.exec(
            [video.url], // El video que queremos descargar
            {
                // Opciones de yt-dlp:
                format: 'bestaudio', // Mejor calidad de audio
                extractAudio: true, // Extraer solo el audio
                audioFormat: 'mp3', // Formato de salida MP3
                output: '-', // Imprimir el stream binario en stdout
                // Para prevenir que yt-dlp escriba en archivos temporales antes de canalizar
                noPlaylist: true, 
                limitRate: '10M', // Opcional: limitar la tasa para no saturar
            },
            {
                stdio: ['ignore', 'pipe', 'inherit'] // Canalizar stdout a pipe y mostrar stderr
            }
        ).stdout; // Obtenemos el stream de salida (stdout)

        // 4. Canalizar el stream de yt-dlp directamente a la respuesta HTTP
        await pipeline(audioStream, res);
        
        console.log(`[Microservicio] Descarga de "${video.title}" completada y enviada.`);


    } catch (error) {
        console.error('[Microservicio] Error:', error.message);
        // El error puede ser de ytDlp o de la tubería.
        if (!res.headersSent) {
            // Si el error ocurrió ANTES de enviar las cabeceras/datos
            res.status(500).json({ error: 'Ocurrió un error interno o de yt-dlp.', details: error.message });
        } else {
             // Si el error ocurrió DURANTE el envío del stream, la conexión ya está rota.
             console.log('[Microservicio] Error después de enviar cabeceras, cerrando conexión.');
             res.end();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Microservicio de descarga listo en http://localhost:${PORT}`);
});