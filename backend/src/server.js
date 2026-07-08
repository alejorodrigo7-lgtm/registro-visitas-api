require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/database');

const app = express();

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ============================================
// 🔍 RUTA DE BÚSQUEDA DE CLIENTES
// ============================================
app.get('/api/clientes/buscar/:identificador', async (req, res) => {
  try {
    const { identificador } = req.params;
    console.log(`🔍 Buscando cliente: ${identificador}`);
    
    const Cliente = require('./models/Cliente');
    const cliente = await Cliente.findOne({ identificador: identificador.trim() });
    
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    
    res.json({
      success: true,
      data: {
        nombre: cliente.nombre,
        identificador: cliente.identificador,
        barrio: cliente.barrio,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 📤 CARGAR CLIENTES DESDE CSV
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `clientes-${Date.now()}.csv`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post('/api/clientes/cargar-csv', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const results = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    const Cliente = require('./models/Cliente');
    let insertados = 0;
    let actualizados = 0;

    for (const row of results) {
      const cliente = {
        nombre: row.nombre?.trim() || '',
        identificador: row.identificador?.trim() || '',
        barrio: row.barrio?.trim() || '',
        direccion: row.direccion?.trim() || '',
        telefono: row.telefono?.trim() || '',
        email: row.email?.trim() || '',
      };

      if (cliente.nombre && cliente.identificador && cliente.barrio && cliente.direccion && cliente.telefono) {
        try {
          const existe = await Cliente.findOne({ identificador: cliente.identificador });
          if (existe) {
            await Cliente.updateOne(
              { identificador: cliente.identificador },
              { $set: { ...cliente, ultimaActualizacion: new Date() } }
            );
            actualizados++;
          } else {
            await Cliente.create(cliente);
            insertados++;
          }
        } catch (error) {
          console.error('Error guardando cliente:', error);
        }
      }
    }

    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.log('Error al eliminar archivo temporal:', error);
    }

    res.json({
      success: true,
      message: 'Carga de clientes completada',
      resumen: {
        totalProcesados: results.length,
        insertados,
        actualizados,
      }
    });

  } catch (error) {
    console.error('Error al cargar CSV:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/api/clientes/test', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

// ============================================
// RUTA DE LOGIN (para que funcione el login)
// ============================================
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔍 /api/clientes/buscar/:identificador`);
  console.log(`📤 /api/clientes/cargar-csv`);
});