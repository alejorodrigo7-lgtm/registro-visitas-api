const ExcelJS = require('exceljs');
const Visita = require('../models/Visita');
const Transferencia = require('../models/Transferencia');
const Servicio = require('../models/Servicio');
const Caja = require('../models/Caja');
const Deposito = require('../models/Deposito');
const User = require('../models/User');

// ============================================
// GENERAR REPORTE DE VISITAS (ACTUALIZADO)
// ============================================
exports.generarReporteVisitas = async (req, res) => {
  console.log('📊 === REPORTE DE VISITAS ===');
  console.log('📊 Query recibido:', req.query);
  
  try {
    const { fechaInicio, fechaFin, tecnico, estado, tipo } = req.query;

    let query = {};
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: inicio, $lte: fin };
      console.log('📊 Fechas:', inicio, 'a', fin);
    } else {
      console.log('⚠️ No se proporcionaron fechas');
    }
    
    if (tecnico) query.tecnico = tecnico;
    if (estado) query.estado = estado;
    if (tipo) query.tipo = tipo;

    console.log('📊 Query final:', JSON.stringify(query));

    const visitas = await Visita.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

    console.log(`📊 Visitas encontradas: ${visitas.length}`);

    if (visitas.length === 0) {
      console.log('⚠️ No se encontraron visitas');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Visitas');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Identificador', key: 'identificador', width: 20 },
      { header: 'Barrio', key: 'barrio', width: 20 },
      { header: 'Dirección', key: 'direccion', width: 35 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Monto', key: 'monto', width: 15 },
      { header: 'Técnico', key: 'tecnico', width: 25 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
      { header: 'Ubicación', key: 'ubicacion', width: 45 },
    ];

    for (const visita of visitas) {
      let ubicacionStr = '';
      if (visita.ubicacion) {
        if (visita.ubicacion.address) {
          ubicacionStr = visita.ubicacion.address;
        } else if (visita.ubicacion.latitude && visita.ubicacion.longitude) {
          ubicacionStr = `Lat: ${visita.ubicacion.latitude.toFixed(6)}, Lng: ${visita.ubicacion.longitude.toFixed(6)}`;
        }
      }

      worksheet.addRow({
        fecha: visita.fecha ? new Date(visita.fecha).toLocaleString('es-ES') : '',
        cliente: visita.cliente || '',
        identificador: visita.identificador || '',
        barrio: visita.barrio || '',
        direccion: visita.direccion || '',
        telefono: visita.telefono || '',
        tipo: visita.tipo || '',
        monto: visita.monto || 0,
        tecnico: visita.tecnico?.nombre || '',
        estado: visita.estado || '',
        observaciones: visita.observaciones || '',
        ubicacion: ubicacionStr,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=visitas.xlsx');
    res.send(buffer);
    
    console.log('✅ Reporte de visitas enviado correctamente');
  } catch (error) {
    console.error('❌ Error en generarReporteVisitas:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// GENERAR REPORTE DE TRANSFERENCIAS CON IMÁGENES
// ============================================
exports.generarReporteTransferencias = async (req, res) => {
  console.log('📊 === REPORTE DE TRANSFERENCIAS ===');
  console.log('📊 Query recibido:', req.query);
  
  try {
    const { fechaInicio, fechaFin, estado, zona } = req.query;

    let query = {};
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fechaTransferencia = { $gte: inicio, $lte: fin };
      console.log('📊 Fechas:', inicio, 'a', fin);
    } else {
      console.log('⚠️ No se proporcionaron fechas');
    }
    
    if (estado) query.estado = estado;
    if (zona) query.zonaSector = zona;

    console.log('📊 Query final:', JSON.stringify(query));

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre')
      .sort({ createdAt: -1 });

    console.log(`📊 Transferencias encontradas: ${transferencias.length}`);

    if (transferencias.length === 0) {
      console.log('⚠️ No se encontraron transferencias');
      // ✅ Enviar respuesta vacía pero con éxito
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transferencias');
      worksheet.columns = [
        { header: 'Mensaje', key: 'mensaje', width: 50 }
      ];
      worksheet.addRow({ mensaje: 'No hay transferencias en el rango de fechas seleccionado' });
      
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=transferencias_vacio.xlsx');
      res.send(buffer);
      return;
    }

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
      { header: 'Comprobante', key: 'imagen', width: 30 },
    ];

    for (let i = 0; i < transferencias.length; i++) {
      const t = transferencias[i];
      
      const row = worksheet.addRow({
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
        imagen: '',
      });

      let imagenData = null;
      if (t.imagenComprobante && t.imagenComprobante.length > 100) {
        imagenData = t.imagenComprobante;
      } else if (t.soporte && t.soporte.length > 100) {
        imagenData = t.soporte;
      }

      if (imagenData) {
        try {
          let base64Data = imagenData;
          if (imagenData.startsWith('data:image')) {
            base64Data = imagenData.split(',')[1];
          }

          const imageBuffer = Buffer.from(base64Data, 'base64');
          const imageId = workbook.addImage({
            buffer: imageBuffer,
            extension: 'jpeg',
          });

          worksheet.addImage(imageId, {
            tl: { col: 10, row: i + 1 },
            ext: { width: 120, height: 120 },
          });

          row.height = 140;
        } catch (error) {
          console.error('❌ Error al insertar imagen en Excel:', error.message);
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transferencias_con_imagenes.xlsx');
    res.send(buffer);
    
    console.log('✅ Reporte de transferencias enviado correctamente');
  } catch (error) {
    console.error('❌ Error en generarReporteTransferencias:', error);
    res.status(500).json({ message: error.message });
  }
};

// ... el resto de las funciones (servicios, cajas, depositos, usuarios) con logs similares