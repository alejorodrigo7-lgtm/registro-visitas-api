const Asistencia = require('../models/Asistencia');
const PedirAusencia = require('../models/PedirAusencia');
const ExcelJS = require('exceljs');

// ============================================
// 📍 COORDENADAS PERMITIDAS (500 metros de radio)
// ============================================
const UBICACIONES_PERMITIDAS = [
  {
    nombre: 'Oficina Principal',
    lat: -0.22635455220671702,
    lng: -78.50449436339233,
    radio: 500,
  },
  {
    nombre: 'Oficina Secundaria',
    lat: -0.2434462972630477,
    lng: -78.53434033695208,
    radio: 500,
  },
];

// ============================================
// 📋 LISTA DE APPS DE FAKE GPS
// ============================================
const FAKE_GPS_APPS = [
  'com.lexa.fakegps',
  'com.incorporateapps.fakegps.free',
  'com.dev47apps.fakegps',
  'com.fakegps.fakegps',
  'org.ajeje.fakegps',
  'com.robtopx.fakegps',
  'com.skyfishstudio.fakegps',
  'com.fakegps.free',
];

// ============================================
// 📋 FUNCIÓN PARA VERIFICAR UBICACIÓN FALSA
// ============================================
const verificarUbicacionFalsa = (ubicacion) => {
  if (!ubicacion || !ubicacion.latitude || !ubicacion.longitude) {
    return { esFalsa: true, razon: 'Ubicación incompleta' };
  }

  const lat = ubicacion.latitude;
  const lng = ubicacion.longitude;

  // Verificar rangos válidos para Ecuador
  if (lat < -5 || lat > 2 || lng < -82 || lng > -74) {
    return { esFalsa: true, razon: 'Coordenadas fuera de Ecuador' };
  }

  // Verificar ubicación (0,0)
  if (lat === 0 && lng === 0) {
    return { esFalsa: true, razon: 'Ubicación (0,0) inválida' };
  }

  // Verificar precisión sospechosa (Fake GPS suele dar precisión 0 o <5)
  if (ubicacion.accuracy !== undefined && ubicacion.accuracy < 5) {
    return { esFalsa: false, sospechosa: true, razon: 'Precisión sospechosa' };
  }

  return { esFalsa: false };
};

// ============================================
// 📋 FUNCIÓN PARA CALCULAR DISTANCIA
// ============================================
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000;
};

// ============================================
// 📋 FUNCIÓN PARA VERIFICAR UBICACIÓN PERMITIDA
// ============================================
const verificarUbicacionPermitida = (lat, lng) => {
  for (const ubicacion of UBICACIONES_PERMITIDAS) {
    const distancia = calcularDistancia(lat, lng, ubicacion.lat, ubicacion.lng);
    if (distancia <= ubicacion.radio) {
      return { permitido: true, ubicacion: ubicacion.nombre, distancia: Math.round(distancia) };
    }
  }
  return { permitido: false };
};

// ============================================
// 📋 FUNCIÓN PARA OBTENER FECHA Y HORA LOCAL
// ============================================
const getFechaStr = (date) => {
  if (!date) date = new Date();
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getHoraLocal = () => {
  const d = new Date();
  const hora = new Date(d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const horas = String(hora.getHours()).padStart(2, '0');
  const minutos = String(hora.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
};

// ============================================
// 📋 OBTENER EL SIGUIENTE PASO DISPONIBLE
// ============================================
const obtenerSiguientePaso = (asistencia) => {
  if (!asistencia.hora_entrada) return 'entrada';
  if (!asistencia.hora_inicio_almuerzo) return 'inicio_almuerzo';
  if (!asistencia.hora_fin_almuerzo) return 'fin_almuerzo';
  if (!asistencia.hora_salida) return 'salida';
  return 'completado';
};

// ============================================
// 📋 REGISTRAR ASISTENCIA
// ============================================
exports.registrarAsistencia = async (req, res) => {
  try {
    const { tipo, ubicacion } = req.body;
    const usuarioId = req.user._id;
    const fechaStr = getFechaStr();
    const horaActual = getHoraLocal();

    console.log(`📝 Registrando ${tipo} para ${req.user.nombre} - ${fechaStr} ${horaActual}`);

    let asistencia = await Asistencia.findOne({
      usuario: usuarioId,
      fechaStr: fechaStr,
    });

    if (!asistencia) {
      asistencia = new Asistencia({
        usuario: usuarioId,
        usuarioNombre: req.user.nombre,
        usuarioRol: req.user.rol,
        fecha: new Date(),
        fechaStr: fechaStr,
      });
    }

    const siguientePaso = obtenerSiguientePaso(asistencia);

    if (siguientePaso === 'completado') {
      return res.status(400).json({
        success: false,
        message: '✅ Ya completaste tu jornada de hoy. ¡Excelente trabajo!',
        completado: true,
      });
    }

    if (tipo !== siguientePaso) {
      const nombresPasos = {
        'entrada': 'Entrada',
        'inicio_almuerzo': 'Inicio de Almuerzo',
        'fin_almuerzo': 'Fin de Almuerzo',
        'salida': 'Salida',
      };
      return res.status(400).json({
        success: false,
        message: `⚠️ Debes registrar "${nombresPasos[siguientePaso]}" primero.`,
        siguientePaso: siguientePaso,
      });
    }

    const tiposSinUbicacion = ['inicio_almuerzo', 'fin_almuerzo'];
    const requiereUbicacion = !tiposSinUbicacion.includes(tipo);

    let verifUbicacion = null;

    if (requiereUbicacion) {
      if (!ubicacion || !ubicacion.latitude || !ubicacion.longitude) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo obtener tu ubicación. Activa el GPS para registrar entrada o salida.',
        });
      }

      // 🔥 VERIFICAR UBICACIÓN FALSA
      const verificacionFalsa = verificarUbicacionFalsa(ubicacion);
      if (verificacionFalsa.esFalsa) {
        return res.status(400).json({
          success: false,
          message: `⚠️ Ubicación sospechosa detectada: ${verificacionFalsa.razon}. Por favor, desactiva cualquier aplicación de Fake GPS.`,
        });
      }

      verifUbicacion = verificarUbicacionPermitida(ubicacion.latitude, ubicacion.longitude);

      if (!verifUbicacion.permitido) {
        return res.status(400).json({
          success: false,
          message: `No estás en una ubicación permitida. Debes estar en una de las oficinas autorizadas para registrar entrada o salida.\nDistancia a la más cercana: ${verifUbicacion.distancia || 'N/A'} metros`,
          ubicacionPermitida: false,
        });
      }

      console.log(`📍 Ubicación permitida: ${verifUbicacion.ubicacion} (${verifUbicacion.distancia}m)`);
    }

    const tipos = {
      'entrada': { campo: 'hora_entrada', ubicacion: 'ubicacion_entrada' },
      'inicio_almuerzo': { campo: 'hora_inicio_almuerzo', ubicacion: 'ubicacion_inicio_almuerzo' },
      'fin_almuerzo': { campo: 'hora_fin_almuerzo', ubicacion: 'ubicacion_fin_almuerzo' },
      'salida': { campo: 'hora_salida', ubicacion: 'ubicacion_salida' },
    };

    const tipoData = tipos[tipo];
    if (!tipoData) {
      return res.status(400).json({ success: false, message: 'Tipo de registro inválido' });
    }

    if (asistencia[tipoData.campo]) {
      return res.status(400).json({
        success: false,
        message: `Ya registraste ${tipo.replace('_', ' ')} hoy a las ${asistencia[tipoData.campo]}`,
      });
    }

    asistencia[tipoData.campo] = horaActual;

    if (ubicacion && ubicacion.latitude && ubicacion.longitude) {
      const address = ubicacion.address || 
        (verifUbicacion ? `Oficina: ${verifUbicacion.ubicacion} (${verifUbicacion.distancia}m)` : 
        `Lat: ${ubicacion.latitude}, Lng: ${ubicacion.longitude}`);
      
      asistencia[tipoData.ubicacion] = {
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        address: address,
        accuracy: ubicacion.accuracy || null,
        source: 'gps',
        verified: true,
        fakeGpsChecked: true,
      };
    }

    if (asistencia.hora_entrada && 
        asistencia.hora_inicio_almuerzo && 
        asistencia.hora_fin_almuerzo && 
        asistencia.hora_salida) {
      asistencia.estado = 'Completo';
    } else {
      asistencia.estado = 'Pendiente';
    }

    await asistencia.save();

    const ausenciasPendientes = await PedirAusencia.find({
      usuario: usuarioId,
      fechaStr: fechaStr,
      estado: 'Pendiente',
    });

    const siguientePasoDespues = obtenerSiguientePaso(asistencia);
    const nombresPasos = {
      'entrada': 'Entrada',
      'inicio_almuerzo': 'Inicio de Almuerzo',
      'fin_almuerzo': 'Fin de Almuerzo',
      'salida': 'Salida',
      'completado': 'Jornada Completada 🎉',
    };

    let mensajeSiguiente = '';
    if (siguientePasoDespues !== 'completado') {
      mensajeSiguiente = `\n\n📌 Siguiente paso: ${nombresPasos[siguientePasoDespues]}`;
    } else {
      mensajeSiguiente = '\n\n🎉 ¡Has completado tu jornada de hoy!';
    }

    res.json({
      success: true,
      message: `${tipo.replace('_', ' ')} registrado a las ${horaActual}` + mensajeSiguiente,
      ubicacion: verifUbicacion,
      data: asistencia,
      siguientePaso: siguientePasoDespues,
      completado: siguientePasoDespues === 'completado',
      ausenciasPendientes: ausenciasPendientes.length,
      ausencias: ausenciasPendientes,
    });

  } catch (error) {
    console.error('❌ Error en registrarAsistencia:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER ASISTENCIA DEL DÍA
// ============================================
exports.obtenerAsistenciaHoy = async (req, res) => {
  try {
    const fechaStr = getFechaStr();
    const usuarioId = req.user._id;

    let asistencia = await Asistencia.findOne({
      usuario: usuarioId,
      fechaStr: fechaStr,
    });

    if (!asistencia) {
      asistencia = {
        usuarioNombre: req.user.nombre,
        fechaStr: fechaStr,
        hora_entrada: null,
        ubicacion_entrada: null,
        hora_inicio_almuerzo: null,
        ubicacion_inicio_almuerzo: null,
        hora_fin_almuerzo: null,
        ubicacion_fin_almuerzo: null,
        hora_salida: null,
        ubicacion_salida: null,
        estado: 'Pendiente',
      };
    }

    const siguientePaso = obtenerSiguientePaso(asistencia);
    const nombresPasos = {
      'entrada': 'Entrada',
      'inicio_almuerzo': 'Inicio de Almuerzo',
      'fin_almuerzo': 'Fin de Almuerzo',
      'salida': 'Salida',
      'completado': 'Jornada Completada 🎉',
    };

    const ausenciasPendientes = await PedirAusencia.find({
      usuario: usuarioId,
      fechaStr: fechaStr,
      estado: 'Pendiente',
    });

    res.json({
      success: true,
      data: asistencia,
      siguientePaso: siguientePaso,
      siguientePasoNombre: nombresPasos[siguientePaso] || 'Completado',
      ausenciasPendientes: ausenciasPendientes,
      ubicacionesPermitidas: UBICACIONES_PERMITIDAS,
    });

  } catch (error) {
    console.error('❌ Error en obtenerAsistenciaHoy:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER ASISTENCIA POR FECHAS (Admin/Jefe)
// ============================================
exports.obtenerAsistenciaPorFechas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario } = req.query;
    let query = {};

    if (fechaInicio && fechaFin) {
      query.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
    }

    if (usuario) query.usuario = usuario;

    const asistencias = await Asistencia.find(query)
      .populate('usuario', 'nombre email rol')
      .sort({ fecha: -1 });

    res.json({
      success: true,
      count: asistencias.length,
      data: asistencias,
    });

  } catch (error) {
    console.error('❌ Error en obtenerAsistenciaPorFechas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 REPORTE ASISTENCIA EXCEL
// ============================================
exports.generarReporteExcel = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario } = req.query;
    let query = {};

    if (fechaInicio && fechaFin) {
      query.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
    }

    if (usuario) query.usuario = usuario;

    const asistencias = await Asistencia.find(query)
      .populate('usuario', 'nombre email rol')
      .sort({ fecha: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencia');

    worksheet.columns = [
      { header: '#', key: 'index', width: 8 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Rol', key: 'rol', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Hora Entrada', key: 'hora_entrada', width: 15 },
      { header: 'Inicio Almuerzo', key: 'hora_inicio_almuerzo', width: 18 },
      { header: 'Fin Almuerzo', key: 'hora_fin_almuerzo', width: 18 },
      { header: 'Hora Salida', key: 'hora_salida', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6C5CE7' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    asistencias.forEach((item, index) => {
      worksheet.addRow({
        index: index + 1,
        usuario: item.usuario?.nombre || '',
        rol: item.usuario?.rol || '',
        fecha: item.fechaStr || '',
        hora_entrada: item.hora_entrada || '',
        hora_inicio_almuerzo: item.hora_inicio_almuerzo || '',
        hora_fin_almuerzo: item.hora_fin_almuerzo || '',
        hora_salida: item.hora_salida || '',
        estado: item.estado || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=asistencia_${fechaInicio || 'all'}_${fechaFin || 'all'}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error en generarReporteExcel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER UBICACIONES PERMITIDAS
// ============================================
exports.obtenerUbicacionesPermitidas = async (req, res) => {
  res.json({
    success: true,
    data: UBICACIONES_PERMITIDAS,
  });
};