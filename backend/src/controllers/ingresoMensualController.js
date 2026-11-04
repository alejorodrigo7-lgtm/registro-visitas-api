const Visita = require('../models/Visita');
const Transferencia = require('../models/Transferencia');
const IngresoOficina = require('../models/IngresoOficina');

// ============================================
// MAPEO BARRIO -> ZONA/SECTOR
// ============================================
const MAPA_BARRIOS = {
  'TOLA': ['TOLA 1', 'TOLA 2', 'LOMA GRANDE', 'EL DORADO'],
  'SAN JOSE DE CHILIBULO': ['SAN JOSE DE CHILIBULO', 'CHILIBULO'],
  'MAGDALENA': ['SANTA ANA', 'MAGDALENA', 'LA MAGDALENA', 'ATAHUALPA OCCIDENTAL', 'ATAHULPA OCCIDENTAL']
};

const ZONAS = ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'];

const normalizar = (s) => String(s || '').trim().toUpperCase();

// Devuelve la zona de un barrio o null si no matchea
const zonaDeBarrio = (barrio) => {
  const b = normalizar(barrio);
  if (!b) return null;
  for (const zona of ZONAS) {
    for (const key of MAPA_BARRIOS[zona]) {
      if (b === key || b.includes(key) || key.includes(b)) return zona;
    }
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

// ============================================
// GET /api/ingreso-mensual/manual?mes=X&anio=Y
// Devuelve los valores guardados (si existen) o null
// ============================================
exports.getManual = async (req, res) => {
  try {
    const IngresoMensualManual = require('../models/IngresoMensualManual');
    const hoy = new Date();
    const mes = parseInt(req.query.mes, 10) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio, 10) || hoy.getFullYear();

    const manual = await IngresoMensualManual.findOne({ mes, anio });
    res.json({
      success: true,
      existe: !!manual,
      data: manual || null,
    });
  } catch (error) {
    console.error('Error obteniendo manual:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// PUT /api/ingreso-mensual/manual
// Body: { mes, anio, zonas: [...], totalGeneral }
// Guarda o actualiza los valores editados
// ============================================
exports.guardarManual = async (req, res) => {
  try {
    const IngresoMensualManual = require('../models/IngresoMensualManual');
    const { mes, anio, zonas, totalGeneral } = req.body;

    if (!mes || !anio || !zonas || !Array.isArray(zonas)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos: mes, anio, zonas (array)',
      });
    }

    // Recalcular totales por si el cliente no los mandó bien
    let totalGeneralCalc = 0;
    const zonasLimp = zonas.map(z => {
      const cz = {
        zona: z.zona,
        cobrosVisitas: Number(z.cobrosVisitas) || 0,
        transferencias: Number(z.transferencias) || 0,
        oficinaTola: Number(z.oficinaTola) || 0,
        otrasOficinas: Number(z.otrasOficinas) || 0,
      };
      cz.totalZona = cz.cobrosVisitas + cz.transferencias + cz.oficinaTola + cz.otrasOficinas;
      totalGeneralCalc += cz.totalZona;
      return cz;
    });

    const editadoPor = {
      usuarioId: req.user?._id,
      nombre: req.user?.nombre || req.user?.email || '',
    };

    const doc = await IngresoMensualManual.findOneAndUpdate(
      { mes, anio },
      {
        $set: {
          zonas: zonasLimp,
          totalGeneral: totalGeneralCalc,
          editadoPor,
          fechaEdicion: new Date(),
        },
        $setOnInsert: { mes, anio },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: 'Ingreso mensual guardado correctamente',
      data: doc,
    });
  } catch (error) {
    console.error('Error guardando manual:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// POST /api/ingreso-mensual/resumen-html
// Body: { mes, anio, zonas: [...], totalGeneral }
// Devuelve HTML del reporte
// ============================================
exports.generarResumenHTML = async (req, res) => {
  try {
    const { mes, anio, zonas, totalGeneral } = req.body;

    if (!zonas || !Array.isArray(zonas) || zonas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el array de zonas',
      });
    }

    const nombreMes = NOMBRES_MES[mes] || 'Mes desconocido';
    const fmt = (n) => '$' + (Number(n) || 0).toFixed(2);

    const zonasHTML = zonas.map(z => `
      <div class="zona">
        <h3>${z.zona}</h3>
        <table>
          <tr><td>Cobros Visitas:</td><td class="right">${fmt(z.cobrosVisitas)}</td></tr>
          <tr><td>Transferencias:</td><td class="right">${fmt(z.transferencias)}</td></tr>
          <tr><td>Ingreso Oficina Tola:</td><td class="right">${fmt(z.oficinaTola)}</td></tr>
          <tr><td>Ingreso Otras Oficinas:</td><td class="right">${fmt(z.otrasOficinas)}</td></tr>
          <tr class="total"><td>TOTAL ${z.zona}:</td><td class="right">${fmt(z.totalZona)}</td></tr>
        </table>
      </div>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; padding: 20px; color: #333; }
  h1 { font-size: 20px; color: #6C5CE7; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #666; font-weight: normal; margin-top: 0; }
  .zona { margin-bottom: 18px; padding: 12px; border-left: 5px solid #6C5CE7; background: #F8F9FA; }
  .zona h3 { margin: 0 0 8px 0; color: #6C5CE7; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 0; }
  td.right { text-align: right; font-weight: 600; }
  tr.total td { border-top: 2px solid #6C5CE7; padding-top: 8px; font-weight: bold; color: #6C5CE7; }
  .total-general { margin-top: 20px; padding: 15px; background: #6C5CE7; color: #FFF; text-align: center; border-radius: 8px; }
  .total-general .label { font-size: 12px; text-transform: uppercase; }
  .total-general .value { font-size: 24px; font-weight: bold; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
</style>
</head>
<body>
  <h1>📊 Ingreso Mensual</h1>
  <h2>${nombreMes} ${anio}</h2>
  ${zonasHTML}
  <div class="total-general">
    <div class="label">Total General</div>
    <div class="value">${fmt(totalGeneral)}</div>
  </div>
  <div class="footer">Generado el ${new Date().toLocaleString('es-EC')}</div>
</body>
</html>
    `;

    res.json({ success: true, data: { html } });
  } catch (error) {
    console.error('Error generando resumen HTML:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};