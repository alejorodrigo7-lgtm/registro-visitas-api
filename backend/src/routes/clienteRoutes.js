const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Cliente = require('../models/Cliente');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // ✅ Agregar esta importación

// Configurar multer para archivos CSV
const upload = multer({ dest: 'uploads/' });

// ============================================
// FUNCIÓN UTILITARIA PARA NORMALIZAR TELÉFONO
// ============================================
const normalizarTelefono = (telefono) => {
    if (!telefono) return '';
    
    // Si es array, tomar el primer elemento
    if (Array.isArray(telefono)) {
        return telefono.length > 0 ? String(telefono[0]).trim() : '';
    }
    
    // Si es string, limpiar directamente
    if (typeof telefono === 'string') {
        return telefono.trim();
    }
    
    // Si es número u otro tipo, convertir a string
    return String(telefono).trim();
};

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
      return res.status(404).json({
        success: false,
        message: `No se encontró cliente con identificador ${identificador}`
      });
    }
    
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
    console.error('❌ Error en buscar:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS CLIENTES (CON BÚSQUEDA)
// ============================================
router.get('/todos', protect, async (req, res) => {
  try {
    const { search, limit = 100 } = req.query;
    let query = {};
    
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { nombre: { $regex: searchRegex } },
          { identificador: { $regex: searchRegex } },
          { barrio: { $regex: searchRegex } },
          { direccion: { $regex: searchRegex } },
          { telefono: { $regex: searchRegex } }
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
    console.error('❌ Error en /todos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS CLIENTES (SIN LÍMITE)
// ============================================
router.get('/todos-sin-limite', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { nombre: { $regex: searchRegex } },
          { identificador: { $regex: searchRegex } },
          { barrio: { $regex: searchRegex } },
          { direccion: { $regex: searchRegex } },
          { telefono: { $regex: searchRegex } }
        ]
      };
    }
    
    const clientes = await Cliente.find(query).sort({ nombre: 1 });
    
    console.log(`📋 ${clientes.length} clientes encontrados (sin límite)`);
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    console.error('❌ Error en /todos-sin-limite:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 👤 CREAR NUEVO CLIENTE (Admin/Jefe) - CORREGIDO
// ============================================
router.post('/', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const { nombre, identificador, barrio, direccion, telefono } = req.body;

    console.log('📝 [CLIENTE] Recibida solicitud POST /api/clientes');
    console.log('📝 [CLIENTE] Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('📝 [CLIENTE] Usuario:', req.user?.email, 'Rol:', req.user?.rol);

    // Validar campos obligatorios
    if (!nombre || !nombre.trim()) {
      console.log('❌ [CLIENTE] Error: Nombre vacío');
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }
    if (!identificador || !identificador.trim()) {
      console.log('❌ [CLIENTE] Error: Identificador vacío');
      return res.status(400).json({
        success: false,
        message: 'El identificador es obligatorio'
      });
    }

    console.log(`🔍 [CLIENTE] Verificando si existe cliente con identificador: ${identificador.trim()}`);
    
    // Verificar si ya existe un cliente con ese identificador
    const existeCliente = await Cliente.findOne({ 
      identificador: identificador.trim() 
    });
    
    if (existeCliente) {
      console.log(`❌ [CLIENTE] Cliente ya existe: ${existeCliente.nombre}`);
      return res.status(400).json({
        success: false,
        message: `Ya existe un cliente con el identificador ${identificador}`
      });
    }

    // ✅ CORREGIDO: Normalizar teléfono
    const telefonoLimpio = normalizarTelefono(telefono);
    console.log('📝 [CLIENTE] Teléfono normalizado:', telefonoLimpio);

    console.log('📝 [CLIENTE] Creando nuevo cliente...');
    
    const nuevoCliente = new Cliente({
      nombre: nombre.trim(),
      identificador: identificador.trim(),
      barrio: barrio?.trim() || '',
      direccion: direccion?.trim() || '',
      telefono: telefonoLimpio, // ✅ Usar teléfono normalizado
    });

    console.log('📝 [CLIENTE] Cliente a guardar:', JSON.stringify(nuevoCliente, null, 2));

    console.log('💾 [CLIENTE] Guardando en MongoDB...');
    await nuevoCliente.save();
    
    console.log(`✅ [CLIENTE] Nuevo cliente registrado: ${nuevoCliente.nombre} (${nuevoCliente.identificador})`);
    console.log(`✅ [CLIENTE] ID: ${nuevoCliente._id}`);

    res.status(201).json({
      success: true,
      message: 'Cliente registrado correctamente',
      data: nuevoCliente,
    });

  } catch (error) {
    console.error('❌ [CLIENTE] Error al crear cliente:', error);
    console.error('❌ [CLIENTE] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// ============================================
// 📤 CARGAR CLIENTES DESDE CSV (Admin)
// ============================================
router.post('/cargar-csv', protect, authorize('Admin'), upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se envió ningún archivo'
      });
    }

    const resultados = [];
    const errores = [];
    let contador = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
          const nombre = data.nombre || data.Nombre || data.NOMBRE || '';
          const identificador = data.identificador || data.Identificador || data.IDENTIFICADOR || data.cedula || data.Cedula || '';
          const barrio = data.barrio || data.Barrio || data.BARRIO || '';
          const direccion = data.direccion || data.Direccion || data.DIRECCION || '';
          const telefono = data.telefono || data.Telefono || data.TELEFONO || '';

          if (!nombre || !identificador) {
            errores.push(`Fila ${contador + 1}: Faltan datos obligatorios (nombre o identificador)`);
            contador++;
            return;
          }

          resultados.push({ nombre, identificador, barrio, direccion, telefono });
          contador++;
        })
        .on('end', resolve)
        .on('error', reject);
    });

    let guardados = 0;
    for (const cliente of resultados) {
      try {
        const existe = await Cliente.findOne({ identificador: cliente.identificador });
        if (!existe) {
          // ✅ CORREGIDO: Normalizar teléfono al importar CSV
          const telefonoLimpio = normalizarTelefono(cliente.telefono);
          await Cliente.create({
            ...cliente,
            telefono: telefonoLimpio
          });
          guardados++;
        } else {
          errores.push(`Identificador ${cliente.identificador} ya existe, omitido`);
        }
      } catch (error) {
        errores.push(`Error guardando ${cliente.nombre}: ${error.message}`);
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Se cargaron ${guardados} clientes correctamente`,
      total: resultados.length,
      guardados,
      errores: errores.length > 0 ? errores : undefined,
    });

  } catch (error) {
    console.error('❌ Error cargando CSV:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🗑️ ELIMINAR CLIENTE (Admin)
// ============================================
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await cliente.deleteOne();
    
    res.json({
      success: true,
      message: 'Cliente eliminado correctamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 ACTUALIZAR CLIENTE (Admin/Jefe) - CORREGIDO
// ============================================
router.put('/:id', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const { nombre, identificador, barrio, direccion, telefono } = req.body;
    
    console.log('📝 [CLIENTE] Actualizando cliente:', req.params.id);
    console.log('📝 [CLIENTE] Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (identificador && identificador !== cliente.identificador) {
      const existe = await Cliente.findOne({ 
        identificador: identificador.trim() 
      });
      if (existe) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un cliente con el identificador ${identificador}`
        });
      }
    }

    // ✅ CORREGIDO: Normalizar teléfono al actualizar
    const telefonoLimpio = normalizarTelefono(telefono);
    console.log('📝 [CLIENTE] Teléfono normalizado:', telefonoLimpio);

    cliente.nombre = nombre || cliente.nombre;
    cliente.identificador = identificador || cliente.identificador;
    cliente.barrio = barrio || cliente.barrio;
    cliente.direccion = direccion || cliente.direccion;
    cliente.telefono = telefonoLimpio || cliente.telefono; // ✅ Usar teléfono normalizado
    
    await cliente.save();
    
    console.log('✅ [CLIENTE] Cliente actualizado:', cliente._id);
    
    res.json({
      success: true,
      message: 'Cliente actualizado correctamente',
      data: cliente
    });
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;