const RecuperacionEquipo = require('../models/RecuperacionEquipo');
const User = require('../models/User');

// Obtener coordinadores (usuarios con rol Coordinador)
const getCoordinadores = async (req, res) => {
  try {
    console.log('📋 Obteniendo coordinadores...');
    const coordinadores = await User.find({ rol: 'Coordinador' })
      .select('_id nombre email')
      .lean();
    
    console.log(`✅ ${coordinadores.length} coordinadores encontrados`);
    res.json({ success: true, data: coordinadores });
  } catch (error) {
    console.error('❌ Error obteniendo coordinadores:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear orden (solo Admin/Jefe)
const crearOrden = async (req, res) => {
  try {
    const { cliente, mac, coordinadorId, observacionesSubida } = req.body;
    const creadoPor = req.user._id;

    console.log('📤 Creando orden de recuperación...');
    console.log('📤 Cliente:', cliente);
    console.log('📤 MAC:', mac);
    console.log('📤 Coordinador:', coordinadorId);

    if (!cliente || !cliente.nombre || !cliente.codigo || !cliente.telefono) {
      return res.status(400).json({ success: false, message: 'Datos del cliente incompletos' });
    }
    if (!mac) {
      return res.status(400).json({ success: false, message: 'MAC es obligatoria' });
    }
    if (!coordinadorId) {
      return res.status(400).json({ success: false, message: 'Seleccione un coordinador' });
    }

    const coordinador = await User.findOne({ _id: coordinadorId, rol: 'Coordinador' });
    if (!coordinador) {
      return res.status(400).json({ success: false, message: 'Coordinador no válido' });
    }

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

    console.log('✅ Orden creada:', nuevaOrden._id);

    res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      data: nuevaOrden
    });
  } catch (error) {
    console.error('❌ Error creando orden:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener órdenes por estado
const getOrdenesPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const usuario = req.user;
    
    console.log(`📋 Obteniendo órdenes con estado: ${estado}`);
    
    let filtro = { estado };
    
    if (usuario.rol === 'Coordinador') {
      filtro.coordinadorAsignado = usuario._id;
    }

    const ordenes = await RecuperacionEquipo.find(filtro)
      .populate('coordinadorAsignado', 'nombre email')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaSubida: -1 });

    console.log(`✅ ${ordenes.length} órdenes encontradas`);

    res.json({ success: true, data: ordenes });
  } catch (error) {
    console.error('❌ Error obteniendo órdenes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener órdenes con filtros
const getOrdenes = async (req, res) => {
  try {
    const { estado, coordinadorId } = req.query;
    const usuario = req.user;
    
    console.log(`📋 Obteniendo órdenes con filtros: estado=${estado}, coordinador=${coordinadorId}`);
    
    let filtro = {};
    if (estado) filtro.estado = estado;
    if (coordinadorId) filtro.coordinadorAsignado = coordinadorId;
    
    if (usuario.rol === 'Coordinador') {
      filtro.coordinadorAsignado = usuario._id;
    }

    const ordenes = await RecuperacionEquipo.find(filtro)
      .populate('coordinadorAsignado', 'nombre email')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaSubida: -1 });

    res.json({ success: true, data: ordenes });
  } catch (error) {
    console.error('❌ Error obteniendo órdenes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ EJECUTAR VISITA - CORREGIDO
const ejecutarVisita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, mac, receptor, adicionales, observaciones, foto, retirado } = req.body;

    console.log(`📤 Ejecutando visita para orden: ${id}`);
    console.log('📤 Retirado:', retirado);

    if (!fecha || !hora || !observaciones || !foto || retirado === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const orden = await RecuperacionEquipo.findById(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const nuevaVisita = {
      fecha: new Date(fecha),
      hora,
      mac: mac || '',
      receptor: receptor || '',
      adicionales: adicionales || '',
      observaciones,
      foto,
      retirado
    };

    orden.visitas.push(nuevaVisita);
    orden.numeroVisitas += 1;

    // ✅ CORREGIDO: Actualizar estado correctamente
    if (retirado) {
      orden.estado = 'retirado';
    } else {
      orden.estado = 'no_retirado';  // ← Ahora usa 'no_retirado'
    }

    orden.actualizado = new Date();
    await orden.save();

    await orden.populate('coordinadorAsignado', 'nombre email');
    await orden.populate('creadoPor', 'nombre email');

    console.log('✅ Visita ejecutada correctamente. Estado:', orden.estado);

    res.json({ success: true, data: orden });
  } catch (error) {
    console.error('❌ Error ejecutando visita:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar visita
const actualizarVisita = async (req, res) => {
  try {
    const { id, visitaId } = req.params;
    const { fecha, hora, mac, receptor, adicionales, observaciones, foto, retirado } = req.body;

    console.log(`📤 Actualizando visita ${visitaId} de orden ${id}`);

    const orden = await RecuperacionEquipo.findById(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const visita = orden.visitas.id(visitaId);
    if (!visita) {
      return res.status(404).json({ success: false, message: 'Visita no encontrada' });
    }

    if (fecha) visita.fecha = new Date(fecha);
    if (hora) visita.hora = hora;
    if (mac !== undefined) visita.mac = mac;
    if (receptor !== undefined) visita.receptor = receptor;
    if (adicionales !== undefined) visita.adicionales = adicionales;
    if (observaciones) visita.observaciones = observaciones;
    if (foto) visita.foto = foto;
    
    // ✅ CORREGIDO: Actualizar estado correctamente al editar
    if (retirado !== undefined) {
      visita.retirado = retirado;
      if (retirado) {
        orden.estado = 'retirado';
      } else {
        orden.estado = 'no_retirado';
      }
    }

    orden.actualizado = new Date();
    await orden.save();

    await orden.populate('coordinadorAsignado', 'nombre email');
    await orden.populate('creadoPor', 'nombre email');

    console.log('✅ Visita actualizada correctamente. Estado:', orden.estado);

    res.json({ success: true, data: orden });
  } catch (error) {
    console.error('❌ Error actualizando visita:', error);
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

    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    res.json({ success: true, data: orden });
  } catch (error) {
    console.error('❌ Error obteniendo orden:', error);
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
  getOrdenById
};