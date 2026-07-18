const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('📡 [DB] Conectando a MongoDB...');
    console.log('📡 [DB] URI:', process.env.MONGODB_URI);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    console.log(`✅ Base de datos: ${conn.connection.name}`);
    console.log(`✅ Colecciones: ${Object.keys(conn.connection.collections).join(', ')}`);
  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;