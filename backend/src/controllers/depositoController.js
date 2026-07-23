const ExcelJS = require('exceljs'); // ✅ AGREGAR ESTA LÍNEA
const Deposito = require('../models/Deposito');
const User = require('../models/User');
const { createDateRangeQuery } = require('../utils/dateHelper');
const { 
  notificarNuevoDeposito,    // ✅ USAR LA NUEVA FUNCIÓN
  notificarEstadoDeposito     // ✅ USAR LA NUEVA FUNCIÓN
} = require('../services/notificationService');

// ============================================
// 📋 OBTENER CUENTAS PREDEFINIDAS
// ============================================
exports.getCuentas = async (req, res) => {
  try {
    const cuentas = [
      { numero: '4738408100', nombre: 'MARY CORDOBA', banco: 'BANCO PICHINCHA' },
      { numero: '27212641', nombre: 'ISABELA CORDOBA', banco: 'BANCO GUAYAQUIL' },
      { numero: '27230428', nombre: 'ISABELA CORDOBA', banco: 'BANCO GUAYAQUIL' },
    ];
    
    res.json({
      success: true,
      data: cuentas
    });
  } catch (error) {
    console.error('❌ Error al obtener cuentas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📤 SUBIR DEPÓSITO
// ============================================
exports.subirDeposito = async (req, res) => {
  console.log('📤 1. subirDeposito - Inicio');
  console.log('📤 2. Body recibido:', req.body);
  console.log('📤 3. Usuario:', req.user?.email);
  
  try {
    const { 
      fecha, 
      valor, 
      cuenta, 
      nombreCuenta, 
      banco,
      esCuentaPersonalizada,
      cuentaPersonalizada,
      jefesSeleccionados,
      observaciones,
      imagenComprobante 
    } = req.body;

    // ✅ Validar campos obligatorios
    if (!valor || !cuenta || !nombreCuenta || !banco || !imagenComprobante) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios: valor, cuenta, nombreCuenta, banco, imagenComprobante'
      });
    }

    // ✅ Crear el depósito
    const deposito = new Deposito({
      usuarioId: req.user._id,
      usuarioNombre: req.user.nombre,
      fecha: fecha || new Date(),
      valor: parseFloat(valor),
      cuenta,
      nombreCuenta,
      banco,
      esCuentaPersonalizada: esCuentaPersonalizada || false,
      cuentaPersonalizada: cuentaPersonalizada || {},
      jefesSeleccionados: jefesSeleccionados || [],
      observaciones: observaciones || '',
      imagenComprobante,
      estado: 'PENDIENTE'
    });

    await deposito.save();
    console.log('✅ 7. Depósito creado con ID:', deposito._id);

    // 📲 8. Enviar notificaciones a los jefes seleccionados
    if (jefesSeleccionados && jefesSeleccionados.length > 0) {
      console.log(`📲 8. Enviando notificaciones a ${jefesSeleccionados.length} jefes...`);
      
      // ✅ USAR LA FUNCIÓN CORRECTA
      await notificarNuevoDeposito(deposito, jefesSeleccionados);
    }

    console.log('✅ 9. Notificaciones enviadas');
    
    res.status(201).json({
      success: true,
      message: 'Depósito registrado correctamente',
      data: deposito
    });

  } catch (error) {
    console.error('❌ Error en subirDeposito:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER DEPÓSITOS POR ESTADO
// ============================================
exports.getDepositosByEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const depositos = await Deposito.find({ estado })
      .populate('usuarioId', 'nombre email')
      .populate('jefesSeleccionados', 'nombre email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: depositos
    });
  } catch (error) {
    console.error('❌ Error al obtener depósitos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ✅ APROBAR DEPÓSITO
// ============================================
exports.aprobarDeposito = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const deposito = await Deposito.findById(id);
    if (!deposito) {
      return res.status(404).json({ success: false, message: 'Depósito no encontrado' });
    }

    deposito.estado = 'APROBADO';
    if (observaciones) deposito.observaciones = observaciones;
    await deposito.save();

    // ✅ NOTIFICAR AL USUARIO
    await notificarEstadoDeposito(deposito, 'APROBADO', observaciones);

    res.json({
      success: true,
      message: 'Depósito aprobado correctamente',
      data: deposito
    });
  } catch (error) {
    console.error('❌ Error al aprobar depósito:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ❌ RECHAZAR DEPÓSITO
// ============================================
exports.rechazarDeposito = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const deposito = await Deposito.findById(id);
    if (!deposito) {
      return res.status(404).json({ success: false, message: 'Depósito no encontrado' });
    }

    deposito.estado = 'RECHAZADO';
    if (observaciones) deposito.observaciones = observaciones;
    await deposito.save();

    // ✅ NOTIFICAR AL USUARIO
    await notificarEstadoDeposito(deposito, 'RECHAZADO', observaciones);

    res.json({
      success: true,
      message: 'Depósito rechazado correctamente',
      data: deposito
    });
  } catch (error) {
    console.error('❌ Error al rechazar depósito:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📊 GENERAR REPORTE DE DEPÓSITOS
// ============================================
exports.generarReporteDepositos = async (req, res) => {
  console.log('📊 === REPORTE DE DEPÓSITOS ===');
  console.log('📊 Query recibido:', req.query);
  
  try {
    const { fechaInicio, fechaFin, cuenta } = req.query;

    let query = {};
    
    // ✅ Usar helper de fechas
    const dateQuery = createDateRangeQuery(fechaInicio, fechaFin, 'fecha');
    query = { ...query, ...dateQuery };
    
    if (cuenta) query.cuenta = cuenta;

    console.log('📊 Query final:', JSON.stringify(query));

    const depositos = await Deposito.find(query)
      .populate('usuarioId', 'nombre email')
      .populate('jefesSeleccionados', 'nombre email')
      .sort({ fecha: -1 });

    console.log(`📊 Depósitos encontrados: ${depositos.length}`);

    if (depositos.length === 0) {
      console.log('⚠️ No se encontraron depósitos');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Depósitos');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Usuario', key: 'usuario', width: 30 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Cuenta', key: 'cuenta', width: 20 },
      { header: 'Nombre Cuenta', key: 'nombreCuenta', width: 30 },
      { header: 'Banco', key: 'banco', width: 25 },
      { header: 'Jefes Notificados', key: 'jefes', width: 40 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ];

    for (const d of depositos) {
      const jefesNombres = d.jefesSeleccionados.map(j => j.nombre).join(', ');
      worksheet.addRow({
        fecha: d.fecha ? new Date(d.fecha).toLocaleString('es-ES') : '',
        usuario: d.usuarioId?.nombre || '',
        valor: d.valor || 0,
        cuenta: d.cuenta || '',
        nombreCuenta: d.nombreCuenta || '',
        banco: d.banco || '',
        jefes: jefesNombres || '',
        estado: d.estado || '',
        observaciones: d.observaciones || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=depositos.xlsx');
    res.send(buffer);
    
    console.log('✅ Reporte de depósitos enviado correctamente');
  } catch (error) {
    console.error('❌ Error en generarReporteDepositos:', error);
    res.status(500).json({ message: error.message });
  }
};