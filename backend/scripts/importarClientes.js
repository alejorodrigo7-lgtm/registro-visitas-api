const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Conectar a MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://app_user:App123456@cluster0.unj0ccd.mongodb.net/registro-visitas?retryWrites=true&w=majority&appName=Cluster0';

// Definir el esquema de Cliente
const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  identificador: { type: String, required: true, unique: true, index: true },
  barrio: { type: String, required: true },
  direccion: { type: String, required: true },
  telefono: { type: String, required: true },
  email: { type: String, default: '' },
  estado: { type: String, default: '' },
  activo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  ultimaActualizacion: { type: Date, default: Date.now },
});

const Cliente = mongoose.model('Cliente', clienteSchema);

async function importarClientes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // Leer el archivo CSV
    const csvPath = path.join(__dirname, '../..', 'clientes_final.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    
    // Dividir por líneas
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    console.log(`📋 Encabezados: ${headers.join(', ')}`);
    console.log(`📊 Total de líneas: ${lines.length - 1}`);

    // Procesar cada línea
    const clientes = [];
    let errores = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const cliente = {};
        
        headers.forEach((header, index) => {
          if (header === 'nombre') cliente.nombre = values[index] || '';
          else if (header === 'identificador') cliente.identificador = values[index] || '';
          else if (header === 'barrio') cliente.barrio = values[index] || '';
          else if (header === 'direccion') cliente.direccion = values[index] || '';
          else if (header === 'telefono') cliente.telefono = values[index] || '';
          else if (header === 'estado') cliente.estado = values[index] || '';
          else if (header === 'email') cliente.email = values[index] || '';
        });

        if (cliente.nombre && cliente.identificador) {
          clientes.push(cliente);
        } else {
          errores++;
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error en línea ${i}:`, error.message);
      }
    }

    console.log(`📊 Clientes procesados: ${clientes.length}`);

    // Eliminar la colección actual
    await Cliente.collection.drop();
    console.log('🗑️ Colección eliminada');

    // Insertar en lotes de 1000
    const batchSize = 1000;
    let insertados = 0;

    for (let i = 0; i < clientes.length; i += batchSize) {
      const batch = clientes.slice(i, i + batchSize);
      try {
        await Cliente.insertMany(batch, { ordered: false });
        insertados += batch.length;
        console.log(`✅ Insertados ${insertados} de ${clientes.length} clientes`);
      } catch (error) {
        console.error(`❌ Error en lote ${i}:`, error.message);
      }
    }

    console.log(`✅ Importación completada: ${insertados} clientes insertados`);
    console.log(`❌ Errores: ${errores}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

importarClientes();