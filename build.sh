#!/bin/bash
set -e # Salir inmediatamente si un comando falla

echo "==> [Paso 1/4] Instalando dependencias de Node.js..."
npm install

echo "==> [Paso 2/4] Creando directorio para binarios..."
mkdir -p ./bin

echo "==> [Paso 3/4] Descargando binarios de yt-dlp y ffmpeg..."
# Descargar yt-dlp directamente desde GitHub
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./bin/yt-dlp

# Descargar una versión estática de ffmpeg para Linux amd64
curl -L https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz -o ffmpeg.tar.xz

echo "==> [Paso 4/4] Extrayendo ffmpeg y limpiando..."
tar -xJf ffmpeg.tar.xz
# El contenido se extrae a una carpeta con un nombre variable, ej: ffmpeg-2023-10-26...
# Usamos un comodín (*) para mover los archivos sin importar el nombre de la carpeta.
mv ffmpeg-*-amd64-static/ffmpeg ./bin/
mv ffmpeg-*-amd64-static/ffprobe ./bin/

# Hacemos que nuestros binarios sean ejecutables
chmod +x ./bin/yt-dlp ./bin/ffmpeg ./bin/ffprobe

# Limpiamos los archivos de instalación
rm -rf ffmpeg.tar.xz ffmpeg-*-amd64-static

echo "==> ¡Construcción completada! Binarios listos en ./bin/"