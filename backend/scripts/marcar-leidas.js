const mongoose = require('mongoose');
require('dotenv').config();

async function marcarLeidas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/registro-visitas');
    console.log('✅ Conectado a MongoDB\n');

    const Notificacion = require('../src/models/Notificacion');
    
    const result = await Notificacion.updateMany(
      { leida: false },
      { leida: true }
    );

    console.log(`✅ ${result.modifiedCount} notificaciones marcadas como leídas`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

marcarLeidas();