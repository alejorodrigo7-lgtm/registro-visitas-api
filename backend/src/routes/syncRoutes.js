// src/routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Bodega = require('../models/Bodega');
const Servicio = require('../models/Servicio');
const User = require('../models/User');

// ============================================
// 📦 SINCRONIZAR BODEGAS CON SERVICIOS EXISTENTES
// ============================================
router.post('/sync-bodegas', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    console.log('📦 Iniciando sincronización de bodegas...');
    
    // 1. Buscar todos los técnicos
    const tecnicos = await User.find({ rol: 'Tecnico' });
    console.log(`🔍 Encontrados ${tecnicos.length} técnicos`);
    
    let resultados = [];
    let totalMateriales = 0;

    for (const tecnico of tecnicos) {
      // 2. Buscar servicios ejecutados con materiales
      const servicios = await Servicio.find({ 
        'tecnico._id': tecnico._id,
        estado: { $in: ['EJECUTADO', 'RETROALIMENTADO'] },
        'ejecucion.materiales.0': { $exists: true }
      });
      
      if (servicios.length === 0) continue;
      
      // 3. Calcular totales
      const totales = {};
      servicios.forEach(serv => {
        if (serv.ejecucion?.materiales) {
          serv.ejecucion.materiales.forEach(mat => {
            const nombre = mat.nombre;
            const cantidad = parseFloat(mat.cantidad) || 1;
            totales[nombre] = (totales[nombre] || 0) + cantidad;
          });
        }
      });
      
      // 4. Buscar o crear bodega
      let bodega = await Bodega.findOne({ usuario: tecnico._id });
      
      if (!bodega) {
        bodega = new Bodega({
          usuario: tecnico._id,
          usuarioNombre: tecnico.nombre,
          nombre: `Bodega de ${tecnico.nombre}`,
          materiales: [],
          estado: 'ACTIVA',
          creadoPor: tecnico._id,
        });
      }
      
      // 5. Actualizar materiales
      let actualizados = 0;
      for (const [nombre, cantidad] of Object.entries(totales)) {
        const existente = bodega.materiales.find(m => m.nombre === nombre);
        if (existente) {
          existente.cantidad = (parseFloat(existente.cantidad) || 0) + cantidad;
          existente.fechaActualizacion = new Date();
        } else {
          bodega.materiales.push({
            nombre: nombre,
            cantidad: cantidad,
            minimo: 0,
            fechaAsignacion: new Date(),
            fechaActualizacion: new Date(),
          });
        }
        actualizados++;
        totalMateriales += cantidad;
      }
      
      if (actualizados > 0) {
        bodega.updatedAt = new Date();
        await bodega.save();
        resultados.push({
          tecnico: tecnico.nombre,
          materialesActualizados: actualizados,
          totales
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Sincronización completada',
      resultados,
      totalTecnicos: tecnicos.length,
      totalMaterialesAgregados: totalMateriales
    });
    
  } catch (error) {
    console.error('❌ Error en sync:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// 📊 VERIFICAR ESTADO DE BODEGAS
// ============================================
router.get('/check-bodegas', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const tecnicos = await User.find({ rol: 'Tecnico' });
    const resultados = [];
    
    for (const tecnico of tecnicos) {
      const bodega = await Bodega.findOne({ usuario: tecnico._id });
      const servicios = await Servicio.countDocuments({
        'tecnico._id': tecnico._id,
        estado: { $in: ['EJECUTADO', 'RETROALIMENTADO'] },
        'ejecucion.materiales.0': { $exists: true }
      });
      
      resultados.push({
        tecnico: tecnico.nombre,
        tieneBodega: !!bodega,
        materialesEnBodega: bodega?.materiales?.length || 0,
        serviciosConMateriales: servicios
      });
    }
    
    res.json({
      success: true,
      data: resultados
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;