# Crear el controlador
@"
const CuadreCaja = require('../models/CuadreCaja');
const User = require('../models/User');

// ============================================
// 📊 CUADRE DE CAJA - CONTROLADOR
// ============================================

// Obtener cuadre por zona y fecha
exports.getCuadre = async (req, res) => {
  try {
    const { zona, fecha } = req.params;
    
    console.log(`📊 Buscando cuadre para ${zona} - ${fecha}`);
    
    const cuadre = await CuadreCaja.findOne({ zona, fecha });
    
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'No hay cuadre para esta fecha y zona',
      });
    }
    
    res.json({
      success: true,
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error getCuadre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear cuadre del día
exports.crearCuadre = async (req, res) => {
  try {
    const { zona, fecha, saldoInicial } = req.body;
    
    console.log(`📊 Creando cuadre para ${zona} - ${fecha}`);
    console.log(`📊 Saldo inicial: ${saldoInicial}`);
    
    // Verificar si ya existe
    const existe = await CuadreCaja.findOne({ zona, fecha });
    if (existe) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cuadre para esta fecha y zona',
      });
    }
    
    const cuadre = new CuadreCaja({
      zona,
      fecha,
      saldoInicial: saldoInicial || 0,
      saldoDisponible: saldoInicial || 0,
      creadoPor: req.user._id,
    });
    
    await cuadre.save();
    
    console.log(`✅ Cuadre creado: ${cuadre._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Cuadre creado correctamente',
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error crearCuadre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Agregar ingreso a un cuadre
exports.agregarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, monto, concepto } = req.body;
    
    console.log(`📊 Agregando ingreso al cuadre ${id}`);
    console.log(`📊 Tipo: ${tipo}, Monto: ${monto}`);
    
    const cuadre = await CuadreCaja.findById(id);
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'Cuadre no encontrado',
      });
    }
    
    // Agregar ingreso
    cuadre.ingresos.push({
      tipo,
      monto,
      concepto: concepto || '',
      fecha: new Date(),
      usuario: req.user._id,
    });
    
    // Recalcular saldo disponible
    const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
    const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
    cuadre.saldoDisponible = cuadre.saldoInicial + totalIngresos - totalPagos;
    
    await cuadre.save();
    
    console.log(`✅ Ingreso agregado. Nuevo saldo: ${cuadre.saldoDisponible}`);
    
    res.json({
      success: true,
      message: 'Ingreso agregado correctamente',
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error agregarIngreso:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Agregar pago a un cuadre
exports.agregarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, monto, descripcion } = req.body;
    
    console.log(`📊 Agregando pago al cuadre ${id}`);
    console.log(`📊 Motivo: ${motivo}, Monto: ${monto}`);
    
    const cuadre = await CuadreCaja.findById(id);
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'Cuadre no encontrado',
      });
    }
    
    // Agregar pago
    cuadre.pagos.push({
      motivo,
      monto,
      descripcion: descripcion || '',
      fecha: new Date(),
      usuario: req.user._id,
    });
    
    // Recalcular saldo disponible
    const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
    const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
    cuadre.saldoDisponible = cuadre.saldoInicial + totalIngresos - totalPagos;
    
    await cuadre.save();
    
    console.log(`✅ Pago agregado. Nuevo saldo: ${cuadre.saldoDisponible}`);
    
    res.json({
      success: true,
      message: 'Pago agregado correctamente',
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error agregarPago:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Placeholder para funciones existentes
exports.getIngresos = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.crearIngreso = async (req, res) => {
  res.json({ success: true, message: 'Función en desarrollo' });
};

exports.getSaldos = async (req, res) => {
  res.json({ success: true, data: [] });
};
"@ | Out-File -FilePath "C:\Users\MARYLUZ CORDOBA\Desktop\registro-visitas-app\backend\src\controllers\cajasController.js" -Encoding utf8