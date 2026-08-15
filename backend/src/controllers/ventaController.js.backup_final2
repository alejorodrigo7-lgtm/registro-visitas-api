const Venta = require('../models/Venta');
const ReporteVenta = require('../models/ReporteVenta');
const User = require('../models/User');

// ============ VENTA NUEVA ============
exports.crearVenta = async (req, res) => {
  try {
    const { 
      fecha, usuario, cedulaDelantera, cedulaTrasera, 
      fotoDomicilio, selfieCedula, direccionCompleta, 
      telefono1, telefono2, email, plan 
    } = req.body;

    // Verificar que el usuario existe
    const userExists = await User.findById(usuario);
    if (!userExists) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const nuevaVenta = new Venta({
      fecha,
      usuario,
      cedulaDelantera,
      cedulaTrasera,
      fotoDomicilio,
      selfieCedula,
      direccionCompleta,
      telefono1,
      telefono2,
      email,
      plan,
      creadoPor: req.userId
    });

    await nuevaVenta.save();
    res.status(201).json({ 
      message: 'Venta creada exitosamente', 
      venta: nuevaVenta 
    });
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ message: 'Error al crear venta', error: error.message });
  }
};

exports.obtenerVentas = async (req, res) => {
  try {
    const { ingresada, fecha, usuario } = req.query;
    const filtro = {};
    
    if (ingresada !== undefined) filtro.ingresada = ingresada === 'true';
    if (fecha) filtro.fecha = new Date(fecha);
    if (usuario) filtro.usuario = usuario;

    const ventas = await Venta.find(filtro)
      .populate('usuario', 'nombre email')
      .populate('creadoPor', 'nombre')
      .sort({ createdAt: -1 });

    res.json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
  }
};

exports.actualizarIngresoVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { ingresada } = req.body;

    const venta = await Venta.findByIdAndUpdate(
      id,
      { ingresada },
      { new: true }
    );

    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    res.json({ message: 'Estado de ingreso actualizado', venta });
  } catch (error) {
    console.error('Error al actualizar ingreso:', error);
    res.status(500).json({ message: 'Error al actualizar ingreso', error: error.message });
  }
};

// ============ REPORTE DE VENTA ============
exports.crearReporteVenta = async (req, res) => {
  try {
    const { 
      fechaVenta, codigo, cedula, usuario, producto, valorPagar, ventaAsociada 
    } = req.body;

    // Verificar que el usuario existe
    const userExists = await User.findById(usuario);
    if (!userExists) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el código no esté duplicado
    const existeCodigo = await ReporteVenta.findOne({ codigo });
    if (existeCodigo) {
      return res.status(400).json({ message: 'El código ya existe' });
    }

    const nuevoReporte = new ReporteVenta({
      fechaVenta,
      codigo,
      cedula,
      usuario,
      producto,
      valorPagar,
      ventaAsociada: ventaAsociada || null,
      creadoPor: req.userId
    });

    await nuevoReporte.save();
    res.status(201).json({ 
      message: 'Reporte de venta creado exitosamente', 
      reporte: nuevoReporte 
    });
  } catch (error) {
    console.error('Error al crear reporte:', error);
    res.status(500).json({ message: 'Error al crear reporte', error: error.message });
  }
};

exports.obtenerReportesVenta = async (req, res) => {
  try {
    const { pagado, fechaInicio, fechaFin, producto, usuario } = req.query;
    const filtro = {};
    
    if (pagado !== undefined) filtro.pagado = pagado === 'true';
    if (producto) filtro.producto = producto;
    if (usuario) filtro.usuario = usuario;
    
    if (fechaInicio || fechaFin) {
      filtro.fechaVenta = {};
      if (fechaInicio) filtro.fechaVenta.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaVenta.$lte = new Date(fechaFin);
    }

    const reportes = await ReporteVenta.find(filtro)
      .populate('usuario', 'nombre email')
      .populate('creadoPor', 'nombre')
      .populate('ventaAsociada')
      .sort({ createdAt: -1 });

    res.json(reportes);
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({ message: 'Error al obtener reportes', error: error.message });
  }
};

// ============ PAGO DE VENTA ============
exports.registrarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { valorPagado, responsable, formaPago } = req.body;

    const reporte = await ReporteVenta.findById(id);
    if (!reporte) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    if (reporte.pagado) {
      return res.status(400).json({ message: 'Este reporte ya está pagado' });
    }

    reporte.pagado = true;
    reporte.pagoInfo = {
      valorPagado,
      responsable,
      formaPago,
      fechaPago: new Date()
    };

    await reporte.save();

    res.json({ 
      message: 'Pago registrado exitosamente', 
      reporte 
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago', error: error.message });
  }
};

exports.obtenerVentasPagadas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, producto, usuario } = req.query;
    const filtro = { pagado: true };
    
    if (producto) filtro.producto = producto;
    if (usuario) filtro.usuario = usuario;
    
    if (fechaInicio || fechaFin) {
      filtro.fechaVenta = {};
      if (fechaInicio) filtro.fechaVenta.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaVenta.$lte = new Date(fechaFin);
    }

    const ventasPagadas = await ReporteVenta.find(filtro)
      .populate('usuario', 'nombre email')
      .populate('creadoPor', 'nombre')
      .populate('ventaAsociada')
      .sort({ 'pagoInfo.fechaPago': -1 });

    res.json(ventasPagadas);
  } catch (error) {
    console.error('Error al obtener ventas pagadas:', error);
    res.status(500).json({ message: 'Error al obtener ventas pagadas', error: error.message });
  }
};