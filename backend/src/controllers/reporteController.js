const ExcelJS = require('exceljs');
const Visita = require('../models/Visita');
const Transferencia = require('../models/Transferencia');
const Servicio = require('../models/Servicio');
const Caja = require('../models/Caja');
const Deposito = require('../models/Deposito');
const User = require('../models/User');

// ============================================
// GENERAR REPORTE DE VISITAS
// ============================================
exports.generarReporteVisitas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tecnico, estado } = req.query;

    let query = {};
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: inicio, $lte: fin };
    }
    if (tecnico) query.tecnico = tecnico;
    if (estado) query.estado = estado;

    const visitas = await Visita.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Visitas');

    // Columnas
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Dirección', key: 'direccion', width: 35 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Tipo', key: 'tipo', width: 15 },
      { header: 'Técnico', key: 'tecnico', width: 25 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ];

    for (const visita of visitas) {
      worksheet.addRow({
        fecha: visita.fecha ? new Date(visita.fecha).toLocaleString('es-ES') : '',
        cliente: visita.cliente || '',
        direccion: visita.direccion || '',
        telefono: visita.telefono || '',
        tipo: visita.tipo || '',
        tecnico: visita.tecnico?.nombre || '',
        estado: visita.estado || '',
        observaciones: visita.observaciones || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=visitas.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error en generarReporteVisitas:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// GENERAR REPORTE DE TRANSFERENCIAS
// ============================================
exports.generarReporteTransferencias = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, zona } = req.query;

    let query = {};
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fechaTransferencia = { $gte: inicio, $lte: fin };
    }
    if (estado) query.estado = estado;
    if (zona) query.zonaSector = zona;

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transferencias');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Responsable', key: 'responsable', width: 25 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Nombre Usuario', key: 'nombreUsuario', width: 30 },
      { header: 'Documento', key: 'documento', width: 20 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Zona', key: 'zona', width: 20 },
      { header: 'Barrio', key: 'barrio', width: 20 },
      { header: 'Banco/Cuenta', key: 'banco', width: 35 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    for (const t of transferencias) {
      worksheet.addRow({
        fecha: t.fechaTransferencia ? new Date(t.fechaTransferencia).toLocaleString('es-ES') : '',
        responsable: t.responsable || '',
        codigo: t.codigoIdentificador || '',
        nombreUsuario: t.nombreUsuario || '',
        documento: t.numeroDocumento || '',
        valor: t.valor || 0,
        zona: t.zonaSector || '',
        barrio: t.barrio || '',
        banco: t.bancoCuenta || '',
        estado: t.estado || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transferencias.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error en generarReporteTransferencias:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// GENERAR REPORTE DE SERVICIOS
// ============================================
exports.generarReporteServicios = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, tecnico } = req.query;

    let query = {};
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: inicio, $lte: fin };
    }
    if (estado) query.estado = estado;
    if (tecnico) query.tecnicoAsignado = tecnico;

    const servicios = await Servicio.find(query)
      .populate('tecnicoAsignado', 'nombre')
      .populate('jefeAsignado', 'nombre')
      .populate('responsableId', 'nombre')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Servicios');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Barrio', key: 'barrio', width: 20 },
      { header: 'Dirección', key: 'direccion', width: 35 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Servicio', key: 'servicio', width: 25 },
      { header: 'Responsable', key: 'responsable', width: 25 },
      { header: 'Técnico', key: 'tecnico', width: 25 },
      { header: 'Jefe', key: 'jefe', width: 25 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ];

    for (const s of servicios) {
      worksheet.addRow({
        fecha: s.createdAt ? new Date(s.createdAt).toLocaleString('es-ES') : '',
        cliente: s.cliente || '',
        codigo: s.codigoIdentificador || '',
        barrio: s.barrio || '',
        direccion: s.direccion || '',
        telefono: s.telefono || '',
        servicio: s.nombreServicio || '',
        responsable: s.responsable || '',
        tecnico: s.tecnicoAsignado?.nombre || '',
        jefe: s.jefeAsignado?.nombre || '',
        estado: s.estado || '',
        observaciones: s.observaciones || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=servicios.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error en generarReporteServicios:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// GENERAR REPORTE DE CAJAS
// ============================================
exports.generarReporteCajas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, zona } = req.query;

    let query = {};
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: inicio, $lte: fin };
    }
    if (zona) query.zona = zona;

    const cajas = await Caja.find(query)
      .populate('creadoPor', 'nombre')
      .sort({ fecha: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cajas');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Zona', key: 'zona', width: 15 },
      { header: 'Saldo Inicial', key: 'saldoInicial', width: 20 },
      { header: 'Cobro Oficina', key: 'cobroOficina', width: 20 },
      { header: 'Cobro Coordinador', key: 'cobroCoordinador', width: 20 },
      { header: 'Total Egresos', key: 'totalEgresos', width: 20 },
      { header: 'Saldo Final', key: 'saldoFinal', width: 20 },
      { header: 'Creado por', key: 'creadoPor', width: 25 },
    ];

    for (const c of cajas) {
      const totalEgresos = c.egresos.reduce((sum, e) => sum + (e.valor || 0), 0);
      worksheet.addRow({
        fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES') : '',
        zona: c.zona || '',
        saldoInicial: c.saldoInicial || 0,
        cobroOficina: c.cobroOficina || 0,
        cobroCoordinador: c.cobroCoordinador || 0,
        totalEgresos: totalEgresos,
        saldoFinal: c.saldoFinal || 0,
        creadoPor: c.creadoPor?.nombre || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cajas.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error en generarReporteCajas:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// GENERAR REPORTE DE DEPÓSITOS
// ============================================
exports.generarReporteDepositos = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, cuenta, zona } = req.query;

    let query = {};
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: inicio, $lte: fin };
    }
    if (cuenta) query.cuenta = cuenta;
    if (zona) query.zona = zona;

    const depositos = await Deposito.find(query)
      .populate('creadoPor', 'nombre')
      .sort({ fecha: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Depositos');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Zona', key: 'zona', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Cuenta', key: 'cuenta', width: 35 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Creado por', key: 'creadoPor', width: 25 },
    ];

    for (const d of depositos) {
      worksheet.addRow({
        fecha: d.fecha ? new Date(d.fecha).toLocaleDateString('es-ES') : '',
        zona: d.zona || '',
        nombre: d.nombre || '',
        cuenta: d.cuenta || '',
        observaciones: d.observaciones || '',
        estado: d.estado || '',
        creadoPor: d.creadoPor?.nombre || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=depositos.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error en generarReporteDepositos:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// GENERAR REPORTE DE USUARIOS
// ============================================
exports.generarReporteUsuarios = async (req, res) => {
  try {
    const usuarios = await User.find().select('-password -__v');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');

    worksheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Rol', key: 'rol', width: 15 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Especialidad', key: 'especialidad', width: 25 },
      { header: 'Activo', key: 'activo', width: 10 },
      { header: 'Fecha Creación', key: 'fecha', width: 25 },
    ];

    for (const u of usuarios) {
      worksheet.addRow({
        nombre: u.nombre || '',
        email: u.email || '',
        rol: u.rol || '',
        telefono: u.telefono || '',
        especialidad: u.especialidad || '',
        activo: u.activo ? 'Sí' : 'No',
        fecha: u.createdAt ? new Date(u.createdAt).toLocaleString('es-ES') : '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error en generarReporteUsuarios:', error);
    res.status(500).json({ message: error.message });
  }
};