const Visita = require('../models/Visita');
const Transferencia = require('../models/Transferencia');
const IngresoOficina = require('../models/IngresoOficina');

// ============================================
// MAPEO BARRIO -> ZONA/SECTOR
// ============================================
const MAPA_BARRIOS = {
  'TOLA': ['TOLA 1', 'TOLA 2', 'LOMA GRANDE', 'EL DORADO'],
  'SAN JOSE DE CHILIBULO': ['CHILIBULO'],
  'MAGDALENA': ['SANTA ANA', 'MAGDALENA', 'ATAHULPA OCCIDENTAL']
};

const ZONAS = ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'];

const normalizar = (s) => String(s || '').trim().toUpperCase();

// Devuelve la zona de un barrio o null si no matchea
const zonaDeBarrio = (barrio) => {
  const b = normalizar(barrio);
  for (const zona of ZONAS) {
    if (MAPA_BARRIOS[zona].includes(b)) return zona;
  }
  return null;
};

// ============================================
// RANGO DE FECHAS DEL MES
// ============================================
const rangoMes = (mes, anio) => {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0));
  const fin = new Date(Date.UTC(anio, mes, 1, 0, 0, 0, 0));
  return { inicio, fin };
};

const NOMBRES_MES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ============================================
// GET /api/ingreso-mensual?mes=10&anio=2026
// ============================================
exports.getIngresoMensual = async (req, res) => {
  try {
    const hoy = new Date();
    const mes = parseInt(req.query.mes, 10) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio, 10) || hoy.getFullYear();

    if (mes < 1 || mes > 12) {
      return res.status(400).json({ success: false, message: 'mes debe estar entre 1 y 12' });
    }

    const { inicio, fin } = rangoMes(mes, anio);

    // ============================================
    // 1. VISITAS con monto > 0 en el mes
    // ============================================
    const visitas = await Visita.find({
      monto: { $gt: 0 },
      fecha: { $gte: inicio, $lt: fin }
    }).select('monto barrio').lean();

    // ============================================
    // 2. TRANSFERENCIAS del mes (excluir DENEGADA)
    // ============================================
    const transferencias = await Transferencia.find({
      estado: { $ne: 'DENEGADA' },
      fechaTransferencia: { $gte: inicio, $lt: fin }
    }).select('valor zonaSector').lean();

    // ============================================
    // 3. INGRESOS OFICINA del mes
    // ============================================
    const ingresos = await IngresoOficina.find({
      fecha: { $gte: inicio, $lt: fin }
    }).select('tipo valor zonaSector').lean();

    // ============================================
    // ACUMULADORES POR ZONA
    // ============================================
    const acum = {};
    ZONAS.forEach(z => {
      acum[z] = {
        zona: z,
        cobrosVisitas: 0,
        transferencias: 0,
        oficinaTola: 0,
        otrasOficinas: 0,
        totalZona: 0
      };
    });

    // --- Visitas: mapear barrio -> zona ---
    for (const v of visitas) {
      const zona = zonaDeBarrio(v.barrio);
      if (zona) acum[zona].cobrosVisitas += Number(v.monto) || 0;
    }

    // --- Transferencias: usar zonaSector del modelo ---
    for (const t of transferencias) {
      const zona = normalizar(t.zonaSector);
      if (acum[zona]) acum[zona].transferencias += Number(t.valor) || 0;
    }

    // --- Ingresos oficina ---
    for (const i of ingresos) {
      const valor = Number(i.valor) || 0;
      if (i.tipo === 'tola') {
        acum['TOLA'].oficinaTola += valor;
      } else if (i.tipo === 'otra') {
        const zona = normalizar(i.zonaSector);
        if (acum[zona]) acum[zona].otrasOficinas += valor;
      }
    }

    // ============================================
    // CALCULAR TOTALES
    // ============================================
    let totalGeneral = 0;
    const zonas = ZONAS.map(z => {
      const a = acum[z];
      a.totalZona = a.cobrosVisitas + a.transferencias + a.oficinaTola + a.otrasOficinas;
      totalGeneral += a.totalZona;
      // Redondear a 2 decimales
      a.cobrosVisitas = Math.round(a.cobrosVisitas * 100) / 100;
      a.transferencias = Math.round(a.transferencias * 100) / 100;
      a.oficinaTola = Math.round(a.oficinaTola * 100) / 100;
      a.otrasOficinas = Math.round(a.otrasOficinas * 100) / 100;
      a.totalZona = Math.round(a.totalZona * 100) / 100;
      return a;
    });

    totalGeneral = Math.round(totalGeneral * 100) / 100;

    res.json({
      success: true,
      mes,
      anio,
      nombreMes: NOMBRES_MES[mes] + ' ' + anio,
      zonas,
      totalGeneral
    });

  } catch (err) {
    console.error('[IngresoMensual] Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Error del servidor' });
  }
};
