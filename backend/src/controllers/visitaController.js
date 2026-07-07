const Visita = require('../models/Visita');

// Crear visita
exports.crearVisita = async (req, res) => {
  try {
    const visita = await Visita.create({
      ...req.body,
      tecnico: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: visita,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener visitas
exports.obtenerVisitas = async (req, res) => {
  try {
    let query = {};
    if (req.user.rol === 'Tecnico') {
      query.tecnico = req.user._id;
    }

    const visitas = await Visita.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

    res.json({
      success: true,
      count: visitas.length,
      data: visitas,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener una visita
exports.obtenerVisita = async (req, res) => {
  try {
    const visita = await Visita.findById(req.params.id)
      .populate('tecnico', 'nombre email');

    if (!visita) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    res.json({
      success: true,
      data: visita,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar visita
exports.actualizarVisita = async (req, res) => {
  try {
    let visita = await Visita.findById(req.params.id);

    if (!visita) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    if (req.user.rol === 'Tecnico' && 
        visita.tecnico.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    visita = await Visita.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: visita,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar visita
exports.eliminarVisita = async (req, res) => {
  try {
    const visita = await Visita.findById(req.params.id);

    if (!visita) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    await visita.deleteOne();

    res.json({
      success: true,
      message: 'Visita eliminada',
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};