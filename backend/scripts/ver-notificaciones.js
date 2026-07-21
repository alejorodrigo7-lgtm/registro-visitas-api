const mongoose = require('mongoose');
require('dotenv').config();

async function verNotificaciones() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/registro-visitas');
    console.log('✅ Conectado a MongoDB\n');

    const Notificacion = require('../src/models/Notificacion');
    
    // Primero obtener el total
    const total = await Notificacion.countDocuments();
    console.log(`📊 Total notificaciones: ${total}\n`);

    // Obtener notificaciones sin populate
    const notificaciones = await Notificacion.find()
      .sort({ fecha: -1 })
      .limit(10);

    console.log('📱 ÚLTIMAS 10 NOTIFICACIONES:');
    console.log('═══════════════════════════════════════');

    if (notificaciones.length === 0) {
      console.log('❌ No hay notificaciones guardadas');
    } else {
      notificaciones.forEach((n, i) => {
        console.log(`\n${i + 1}. Título: ${n.titulo}`);
        console.log(`   Mensaje: ${n.mensaje}`);
        console.log(`   Tipo: ${n.tipo}`);
        console.log(`   Leída: ${n.leida ? '✅ Sí' : '❌ No'}`);
        console.log(`   Usuario ID: ${n.usuario}`);
        console.log(`   Fecha: ${n.fecha}`);
        if (n.datos && Object.keys(n.datos).length > 0) {
          console.log(`   Datos: ${JSON.stringify(n.datos)}`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verNotificaciones();