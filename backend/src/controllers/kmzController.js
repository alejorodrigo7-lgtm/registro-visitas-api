const KMZ = require('../models/KMZ');
const User = require('../models/User');

// ============================================
// 📤 SUBIR KMZ
// ============================================
exports.subirKMZ = async (req, res) => {
  console.log('📤 1. subirKMZ - Inicio');
  console.log('📤 2. Body:', req.body);
  console.log('📤 3. Usuario:', req.user?.email);

  try {
    const { nombre, descripcion, archivo, tipo } = req.body;

    if (!nombre || !archivo) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y archivo son obligatorios'
      });
    }

    const kmz = new KMZ({
      nombre,
      descripcion: descripcion || '',
      archivo,
      tipo: tipo || 'kmz',
      creadoPor: req.user._id,
      creadoPorNombre: req.user.nombre,
      activo: true,
    });

    await kmz.save();
    console.log('✅ 4. KMZ guardado:', kmz._id);

    res.status(201).json({
      success: true,
      message: 'KMZ subido correctamente',
      data: kmz,
    });

  } catch (error) {
    console.error('❌ Error en subirKMZ:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER TODOS LOS KMZ
// ============================================
exports.getKMZ = async (req, res) => {
  console.log('📋 1. getKMZ - Inicio');

  try {
    const kmzs = await KMZ.find({ activo: true })
      .sort({ createdAt: -1 });

    console.log(`✅ 2. KMZ encontrados: ${kmzs.length}`);

    res.json({
      success: true,
      count: kmzs.length,
      data: kmzs,
    });

  } catch (error) {
    console.error('❌ Error en getKMZ:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER UN KMZ POR ID
// ============================================
exports.getKMZById = async (req, res) => {
  console.log('📋 1. getKMZById - Inicio');
  console.log('📋 2. ID:', req.params.id);

  try {
    const kmz = await KMZ.findById(req.params.id);

    if (!kmz) {
      return res.status(404).json({
        success: false,
        message: 'KMZ no encontrado'
      });
    }

    res.json({
      success: true,
      data: kmz,
    });

  } catch (error) {
    console.error('❌ Error en getKMZById:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 🗑️ ELIMINAR KMZ
// ============================================
exports.deleteKMZ = async (req, res) => {
  console.log('🗑️ 1. deleteKMZ - Inicio');
  console.log('🗑️ 2. ID:', req.params.id);

  try {
    const kmz = await KMZ.findById(req.params.id);

    if (!kmz) {
      return res.status(404).json({
        success: false,
        message: 'KMZ no encontrado'
      });
    }

    // Solo el creador o Admin pueden eliminar
    if (req.user.rol !== 'Admin' && kmz.creadoPor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para eliminar este KMZ'
      });
    }

    await kmz.deleteOne();

    res.json({
      success: true,
      message: 'KMZ eliminado correctamente',
    });

  } catch (error) {
    console.error('❌ Error en deleteKMZ:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};