// compress-images.js
require('dotenv').config();
const mongoose = require('mongoose');
const Transferencia = require('./src/models/Transferencia');
const sharp = require('sharp');

async function compressExistingImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Buscar transferencias con imágenes grandes
    const transferencias = await Transferencia.find({
      imagenComprobante: { 
        $exists: true, 
        $ne: null, 
        $type: 'string',
        $regex: /^.{500,}$/  // imágenes grandes (>500 caracteres)
      }
    });
    
    console.log(`📊 Transferencias con imágenes grandes: ${transferencias.length}`);
    
    if (transferencias.length === 0) {
      console.log('✅ No hay imágenes grandes para comprimir');
      process.exit();
      return;
    }
    
    let comprimidas = 0;
    let errores = 0;
    
    for (const t of transferencias) {
      try {
        let img = t.imagenComprobante;
        if (!img || img.length < 100) continue;
        
        // Extraer base64 puro
        let base64Data = img;
        if (img.startsWith('data:image')) {
          base64Data = img.split(',')[1];
        }
        
        // Verificar que sea base64 válido
        if (!/^[A-Za-z0-9+/=]+$/.test(base64Data.substring(0, 100))) {
          console.log(`⚠️ Saltando ${t._id}: formato inválido`);
          continue;
        }
        
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Comprimir
        const compressedBuffer = await sharp(buffer)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
        
        t.imagenComprobante = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        await t.save();
        comprimidas++;
        console.log(`✅ Comprimida: ${t.nombreUsuario} (${Math.round(buffer.length / 1024)}KB → ${Math.round(compressedBuffer.length / 1024)}KB)`);
      } catch (e) {
        errores++;
        console.log(`❌ Error comprimiendo ${t._id}:`, e.message);
      }
    }
    
    console.log(`\n✅ Total comprimidas: ${comprimidas}`);
    console.log(`❌ Errores: ${errores}`);
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

compressExistingImages();