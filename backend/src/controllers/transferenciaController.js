const Transferencia = require('../models/Transferencia');
const User = require('../models/User');

exports.subirTransferencia = async (req, res) => {
  try {
    const {
      fechaTransferencia,
      codigoIdentificador,
      nombreUsuario,
      numeroDocumento,
      valor,
      zonaSector,
      barrio,
      bancoCuenta,
      soporte,
      imagenComprobante,  // 👈 NUEVO CAMPO
    } = req.body;

    if (!fechaTransferencia || !codigoIdentificador || !nombreUsuario || 
        !numeroDocumento || !valor || !zonaSector || !barrio || 
        !bancoCuenta || !soporte) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
      });
    }

    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      return res.status(404).json({
        success: false,
        message: 'Usuario responsable no encontrado',
      });
    }

    const transferencia = await Transferencia.create({
      responsable: responsable.nombre,
      responsableId: req.user._id,
      fechaTransferencia: new Date(fechaTransferencia),
      codigoIdentificador,
      nombreUsuario,
      numeroDocumento,
      valor: parseFloat(valor),
      zonaSector,
      barrio,
      bancoCuenta,
      soporte,
      imagenComprobante: imagenComprobante || null,
      estado: 'SUBIDA',
    });

    res.status(201).json({
      success: true,
      message: 'Transferencia subida correctamente',
      data: transferencia,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTransferencias = async (req, res) => {
  try {
    const { estado } = req.query;
    let query = {};

    if (estado) {
      query.estado = estado;
    }

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
    }

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTransferencia = async (req, res) => {
  try {
    const { id } = req.params;
    const transferencia = await Transferencia.findById(id)
      .populate('responsableId', 'nombre email rol');

    if (!transferencia) {
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    res.json({
      success: true,
      data: transferencia,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.confirmarTransferencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['CONFIRMADA', 'DENEGADA'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser CONFIRMADA o DENEGADA',
      });
    }

    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    if (transferencia.estado !== 'SUBIDA') {
      return res.status(400).json({
        success: false,
        message: `La transferencia ya está en estado ${transferencia.estado}`,
      });
    }

    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();

    res.json({
      success: true,
      message: `Transferencia ${estado === 'CONFIRMADA' ? 'confirmada' : 'denegada'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.ingresarTransferencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['INGRESADA', 'EN_REVISION'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser INGRESADA o EN_REVISION',
      });
    }

    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    if (transferencia.estado !== 'CONFIRMADA') {
      return res.status(400).json({
        success: false,
        message: `La transferencia debe estar CONFIRMADA. Estado actual: ${transferencia.estado}`,
      });
    }

    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();

    res.json({
      success: true,
      message: `Transferencia ${estado === 'INGRESADA' ? 'ingresada' : 'en revisión'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.buscarTransferenciasRevision = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda',
      });
    }

    const query = {
      $or: [
        { nombreUsuario: { $regex: search, $options: 'i' } },
        { codigoIdentificador: { $regex: search, $options: 'i' } },
      ],
    };

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
    }

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTransferenciasByEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    
    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un estado',
      });
    }

    const estadosValidos = ['SUBIDA', 'CONFIRMADA', 'DENEGADA', 'INGRESADA', 'EN_REVISION'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido',
      });
    }

    let query = { estado };
    
    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
    }

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};