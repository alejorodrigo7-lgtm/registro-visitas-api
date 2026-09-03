const RecuperacionEquipo = require('../models/RecuperacionEquipo');
const User = require('../models/User');

// Obtener coordinadores
const getCoordinadores = async (req, res) => {
  try {
    const coordinadores = await User.find({ rol: 'Coordinador' })
      .select('_id nombre email')
      .lean();
    res.json({ success: true, data: coordinadores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear orden
const crearOrden = async (req, res) => {
  try {
    const { cliente, mac, coordinadorId, observacionesSubida } = req.body;
    const creadoPor = req.user._id;

    if (!cliente?.nombre || !cliente?.codigo || !cliente?.telefono) {
      return res.status(400).json({ success: false, message: 'Datos del cliente incompletos' });
    }
    if (!mac) return res.status(400).json({ success: false, message: 'MAC es obligatoria' });
    if (!coordinadorId) return res.status(400).json({ success: false, message: 'Seleccione un coordinador' });

    const coordinador = await User.findOne({ _id: coordinadorId, rol: 'Coordinador' });
    if (!coordinador) return res.status(400).json({ success: false, message: 'Coordinador no válido' });

    const nuevaOrden = new RecuperacionEquipo({
      cliente: {
        nombre: cliente.nombre,
        codigo: cliente.codigo,
        telefono: cliente.telefono,
        direccion: cliente.direccion || ''
      },
      mac,
      coordinadorAsignado: coordinadorId,
      observacionesSubida: observacionesSubida || '',
      creadoPor,
      estado: 'asignada'
    });

    await nuevaOrden.save();
    res.status(201).json({ success: true, message: 'Orden creada exitosamente', data: nuevaOrden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener órdenes por estado
const getOrdenesPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const usuario = req.user;
    let filtro = { estado };
    if (usuario.rol === 'Coordinador') filtro.coordinadorAsignado = usuario._id;

    const ordenes = await RecuperacionEquipo.find(filtro)
      .populate('coordinadorAsignado', 'nombre email')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaSubida: -1 });

    res.json({ success: true, data: ordenes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener órdenes con filtros
const getOrdenes = async (req, res) => {
  try {
    const { estado, coordinadorId } = req.query;
    const usuario = req.user;
    let filtro = {};
    if (estado) filtro.estado = estado;
    if (coordinadorId) filtro.coordinadorAsignado = coordinadorId;
    if (usuario.rol === 'Coordinador') filtro.coordinadorAsignado = usuario._id;

    const ordenes = await RecuperacionEquipo.find(filtro)
      .populate('coordinadorAsignado', 'nombre email')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaSubida: -1 });

    res.json({ success: true, data: ordenes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ejecutar visita
const ejecutarVisita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, mac, receptor, adicionales, observaciones, foto, retirado } = req.body;

    if (!fecha || !hora || !observaciones || !foto || retirado === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const orden = await RecuperacionEquipo.findById(id);
    if (!orden) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    orden.visitas.push({
      fecha: new Date(fecha),
      hora,
      mac: mac || '',
      receptor: receptor || '',
      adicionales: adicionales || '',
      observaciones,
      foto,
      retirado
    });
    orden.numeroVisitas += 1;

    if (retirado === true) {
      orden.estado = 'retirado';
    } else {
      orden.estado = 'no_retirado';
    }

    orden.actualizado = new Date();
    await orden.save();

    await orden.populate('coordinadorAsignado', 'nombre email');
    await orden.populate('creadoPor', 'nombre email');

    res.json({ success: true, data: orden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar visita
const actualizarVisita = async (req, res) => {
  try {
    const { id, visitaId } = req.params;
    const { fecha, hora, mac, receptor, adicionales, observaciones, foto, retirado } = req.body;

    const orden = await RecuperacionEquipo.findById(id);
    if (!orden) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    const visita = orden.visitas.id(visitaId);
    if (!visita) return res.status(404).json({ success: false, message: 'Visita no encontrada' });

    if (fecha) visita.fecha = new Date(fecha);
    if (hora) visita.hora = hora;
    if (mac !== undefined) visita.mac = mac;
    if (receptor !== undefined) visita.receptor = receptor;
    if (adicionales !== undefined) visita.adicionales = adicionales;
    if (observaciones) visita.observaciones = observaciones;
    if (foto) visita.foto = foto;
    
    if (retirado !== undefined) {
      visita.retirado = retirado;
      if (retirado === true) {
        orden.estado = 'retirado';
      } else {
        orden.estado = 'no_retirado';
      }
    }

    orden.actualizado = new Date();
    await orden.save();

    await orden.populate('coordinadorAsignado', 'nombre email');
    await orden.populate('creadoPor', 'nombre email');

    res.json({ success: true, data: orden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener orden por ID
const getOrdenById = async (req, res) => {
  try {
    const { id } = req.params;
    const orden = await RecuperacionEquipo.findById(id)
      .populate('coordinadorAsignado', 'nombre email')
      .populate('creadoPor', 'nombre email');

    if (!orden) return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    res.json({ success: true, data: orden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Marcar como retirado (desde PendientesRetirar)
const marcarRetirado = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const orden = await RecuperacionEquipo.findById(id);
    if (!orden) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    // Verificar que la orden esté en estado 'no_retirado'
    if (orden.estado !== 'no_retirado') {
      return res.status(400).json({
        success: false,
        message: `La orden está en estado "${orden.estado}". Solo se pueden retirar órdenes en estado "no_retirado".`
      });
    }

    orden.estado = 'retirado';
    orden.observacionesRetiro = observaciones || 'Equipo retirado';
    orden.fechaRetiro = new Date();
    orden.actualizado = new Date();

    orden.visitas.push({
      fecha: new Date(),
      hora: new Date().toLocaleTimeString(),
      observaciones: observaciones || 'Equipo retirado',
      retirado: true,
      fechaVisita: new Date()
    });
    orden.numeroVisitas += 1;

    await orden.save();
    await orden.populate('coordinadorAsignado', 'nombre email');
    await orden.populate('creadoPor', 'nombre email');

    res.json({ success: true, message: 'Equipo marcado como RETIRADO', data: orden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ ANULAR ORDEN (solo Admin/Jefe)
const anularOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    // Verificar que el usuario sea Admin o Jefe
    if (!['Admin', 'Jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo Administradores y Jefes pueden anular órdenes'
      });
    }

    const orden = await RecuperacionEquipo.findById(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    // No permitir anular si ya está retirado, anulado o reconectado
    if (['retirado', 'anulado', 'reconectado'].includes(orden.estado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede anular una orden en estado "${orden.estado}"`
      });
    }

    orden.estado = 'anulado';
    orden.observacionesAnulacion = observaciones || 'Orden anulada por Administrador';
    orden.fechaAnulacion = new Date();
    orden.actualizado = new Date();

    await orden.save();
    await orden.populate('coordinadorAsignado', 'nombre email');
    await orden.populate('creadoPor', 'nombre email');

    res.json({
      success: true,
      message: 'Orden anulada correctamente',
      data: orden
    });
  } catch (error) {
    console.error('❌ Error anulando orden:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ RECONECTAR EQUIPO (solo Admin/Jefe)
const reconectarEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    // Verificar que el usuario sea Admin o Jefe
    if (!['Admin', 'Jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo Administradores y Jefes pueden reconectar equipos'
      });
    }

    const orden = await RecuperacionEquipo.findById(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    // No permitir reconectar si ya está retirado, anulado o reconectado
    if (['retirado', 'anulado', 'reconectado'].includes(orden.estado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede reconectar un equipo en estado "${orden.estado}"`
      });
    }

    orden.estado = 'reconectado';
    orden.observacionesReconexion = observaciones || 'Equipo reconectado por Administrador';
    orden.fechaReconexion = new Date();
    orden.actualizado = new Date();

    await orden.save();
    await orden.populate('coordinadorAsignado', 'nombre email');
    await orden.populate('creadoPor', 'nombre email');

    res.json({
      success: true,
      message: 'Equipo reconectado correctamente',
      data: orden
    });
  } catch (error) {
    console.error('❌ Error reconectando equipo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCoordinadores,
  crearOrden,
  getOrdenes,
  getOrdenesPorEstado,
  ejecutarVisita,
  actualizarVisita,
  getOrdenById,
  marcarRetirado,
  anularOrden,
  reconectarEquipo
};