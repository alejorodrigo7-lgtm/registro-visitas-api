const mongoose = require('mongoose');
require('dotenv').config();

async function verNoLeidas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/registro-visitas');
    console.log('✅ Conectado a MongoDB\n');

    const Notificacion = require('../src/models/Notificacion');
    
    const count = await Notificacion.countDocuments({ leida: false });
    console.log(`📱 Notificaciones NO LEÍDAS: ${count}\n`);

    if (count > 0) {
      const notificaciones = await Notificacion.find({ leida: false })
        .sort({ fecha: -1 })
        .limit(10);

      console.log('📋 LISTA DE NO LEÍDAS:');
      console.log('═══════════════════════════════════════');
      notificaciones.forEach((n, i) => {
        console.log(`\n${i + 1}. ${n.titulo}`);
        console.log(`   ${n.mensaje}`);
        console.log(`   Tipo: ${n.tipo}`);
        console.log(`   Usuario ID: ${n.usuario}`);
        console.log(`   Fecha: ${n.fecha}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verNoLeidas();