const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const backupDir = path.join(__dirname, '../backups');

// Crear directorio de backups si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function realizarBackup() {
  try {
    const fecha = new Date().toISOString().replace(/[:.]/g, '-');
    const archivo = path.join(backupDir, `backup-${fecha}.json`);
    
    console.log(`📦 Creando backup: ${archivo}`);
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    const data = {};
    
    for (const collection of collections) {
      const name = collection.name;
      const docs = await mongoose.connection.db.collection(name).find({}).toArray();
      data[name] = docs;
      console.log(`📋 ${name}: ${docs.length} documentos`);
    }
    
    // Guardar en archivo JSON
    fs.writeFileSync(archivo, JSON.stringify(data, null, 2));
    console.log(`✅ Backup guardado: ${archivo}`);
    
    // Mantener solo los últimos 7 días
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort();
    
    if (files.length > 7) {
      const toDelete = files.slice(0, files.length - 7);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`🗑️ Eliminado backup antiguo: ${file}`);
      }
    }
    
    console.log('✅ Backup completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en backup:', error);
    process.exit(1);
  }
}

realizarBackup();