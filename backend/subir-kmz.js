const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb+srv://app_user:App123456@cluster0.unj0ccd.mongodb.net/registro-visitas';

mongoose.connect(MONGODB_URI);

const kmzSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  archivo: String,
  tipo: String,
  creadoPor: mongoose.Schema.Types.ObjectId,
  creadoPorNombre: String,
  activo: Boolean,
  createdAt: Date,
  updatedAt: Date,
});

const KMZ = mongoose.model('KMZ', kmzSchema);
const User = mongoose.model('User', new mongoose.Schema({
  nombre: String,
  email: String,
}));

async function subirKMZ() {
  try {
    console.log('📡 Conectando a MongoDB...');
    
    const admin = await User.findOne({ email: 'admin@visitas.com' });
    if (!admin) {
      console.log('❌ Admin no encontrado');
      process.exit(1);
    }
    console.log('✅ Admin encontrado:', admin.nombre);

    // Leer el archivo KMZ
    const filePath = path.join(__dirname, '..', 'InformeNaps UIO30062026.kmz');
    if (!fs.existsSync(filePath)) {
      console.log('❌ Archivo no encontrado en:', filePath);
      process.exit(1);
    }
    console.log('✅ Archivo encontrado');

    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    console.log(`✅ Archivo convertido a Base64 (${base64.length} caracteres)`);

    // Eliminar el existente
    await KMZ.deleteMany({ nombre: 'InformeNaps UIO30062026' });

    const kmz = new KMZ({
      nombre: 'InformeNaps UIO30062026',
      descripcion: 'Informe de Naps - UIO 30/06/2026',
      archivo: base64,
      tipo: 'kmz',
      creadoPor: admin._id,
      creadoPorNombre: admin.nombre,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await kmz.save();
    console.log('✅ KMZ subido correctamente');
    console.log('📁 ID:', kmz._id);
    console.log('📁 Tamaño:', (base64.length / 1024).toFixed(2), 'KB');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

subirKMZ();