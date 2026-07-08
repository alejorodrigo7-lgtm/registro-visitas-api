const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { protect, authorize } = require('../middleware/auth');
const Cliente = require('../models/Cliente');

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
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

// ============================================
// 🔍 BUSCAR CLIENTE POR IDENTIFICADOR
// ============================================
router.get('/buscar/:identificador', protect, async (req, res) => {
  try {
    const { identificador } = req.params;
    
    console.log(`🔍 Buscando cliente con identificador: ${identificador}`);
    
    const cliente = await Cliente.findOne({ 
      identificador: identificador.trim() 
    });
    
    if (!cliente) {
      console.log(`❌ Cliente con identificador ${identificador} no encontrado`);
      return res.status(404).json({
        success: false,
        message: `No se encontró cliente con identificador ${identificador}`
      });
    }
    
    console.log(`✅ Cliente encontrado: ${cliente.nombre}`);
    
    res.json({
      success: true,
      data: {
        nombre: cliente.nombre,
        identificador: cliente.identificador,
        barrio: cliente.barrio,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        email: cliente.email || '',
      }
    });
  } catch (error) {
    console.error('❌ Error al buscar cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS CLIENTES
// ============================================
router.get('/todos', protect, async (req, res) => {
  try {
    const { search, limit = 100 } = req.query;
    let query = {};
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { nombre: searchRegex },
          { identificador: searchRegex },
          { barrio: searchRegex },
          { telefono: searchRegex }
        ]
      };
    }
    
    const clientes = await Cliente.find(query)
      .sort({ nombre: 1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📤 CARGAR CLIENTES DESDE CSV
// ============================================
router.post('/cargar-csv', protect, authorize('Admin'), upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se subió ningún archivo'
      });
    }

    const clientes = [];
    const errores = [];
    let contador = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
          contador++;
          
          const cliente = {
            nombre: data.nombre?.trim() || '',
            identificador: data.identificador?.trim() || '',
            barrio: data.barrio?.trim() || '',
            direccion: data.direccion?.trim() || '',
            telefono: data.telefono?.trim() || '',
            email: data.email?.trim() || '',
          };

          const camposFaltantes = [];
          if (!cliente.nombre) camposFaltantes.push('nombre');
          if (!cliente.identificador) camposFaltantes.push('identificador');
          if (!cliente.barrio) camposFaltantes.push('barrio');
          if (!cliente.direccion) camposFaltantes.push('direccion');
          if (!cliente.telefono) camposFaltantes.push('telefono');

          if (camposFaltantes.length > 0) {
            errores.push({
              fila: contador,
              datos: data,
              error: `Campos faltantes: ${camposFaltantes.join(', ')}`
            });
          } else {
            clientes.push(cliente);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    let insertados = 0;
    let actualizados = 0;
    let duplicados = 0;

    for (const cliente of clientes) {
      try {
        const existe = await Cliente.findOne({ identificador: cliente.identificador });
        
        if (existe) {
          await Cliente.updateOne(
            { identificador: cliente.identificador },
            {
              $set: {
                nombre: cliente.nombre,
                barrio: cliente.barrio,
                direccion: cliente.direccion,
                telefono: cliente.telefono,
                email: cliente.email || existe.email,
                ultimaActualizacion: new Date(),
              }
            }
          );
          actualizados++;
        } else {
          await Cliente.create(cliente);
          insertados++;
        }
      } catch (error) {
        if (error.code === 11000) {
          duplicados++;
        } else {
          errores.push({
            fila: contador,
            datos: cliente,
            error: error.message
          });
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
        totalProcesados: clientes.length,
        insertados,
        actualizados,
        duplicados,
        errores: errores.length
      },
      errores: errores.length > 0 ? errores : undefined
    });

  } catch (error) {
    console.error('❌ Error al cargar CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo CSV',
      error: error.message
    });
  }
});

// ============================================
// ➕ AGREGAR CLIENTE INDIVIDUAL
// ============================================
router.post('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const { nombre, identificador, barrio, direccion, telefono, email } = req.body;

    if (!nombre || !identificador || !barrio || !direccion || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    const existe = await Cliente.findOne({ identificador });
    if (existe) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un cliente con el identificador ${identificador}`
      });
    }

    const cliente = await Cliente.create({
      nombre,
      identificador,
      barrio,
      direccion,
      telefono,
      email: email || '',
    });

    res.status(201).json({
      success: true,
      message: 'Cliente agregado correctamente',
      data: cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;