const fs = require('fs');
const { createCanvas } = require('canvas');

// Función para crear una imagen PNG simple
function createImage(width, height, color, text) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fondo
  ctx.fillStyle = color || '#6C5CE7';
  ctx.fillRect(0, 0, width, height);
  
  // Texto
  if (text) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${width * 0.15}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width/2, height/2);
  }
  
  return canvas.toBuffer();
}

// Crear icono (512x512)
const iconBuffer = createImage(512, 512, '#6C5CE7', 'RA²P');
fs.writeFileSync('assets/icon.png', iconBuffer);
console.log('✅ icon.png creado');

// Crear splash (1024x1024)
const splashBuffer = createImage(1024, 1024, '#6C5CE7', 'RA²P');
fs.writeFileSync('assets/splash.png', splashBuffer);
console.log('✅ splash.png creado');

// Crear adaptive-icon (512x512)
const adaptiveIconBuffer = createImage(512, 512, '#6C5CE7', 'RA²P');
fs.writeFileSync('assets/adaptive-icon.png', adaptiveIconBuffer);
console.log('✅ adaptive-icon.png creado');

console.log('✅ Todas las imágenes fueron creadas correctamente');