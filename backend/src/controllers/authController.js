const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ============================================
// 📋 REGISTRAR USUARIO (SOLO ADMIN)
// ============================================
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, rol, telefono, especialidad } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol: rol || 'Tecnico',
      telefono: telefono || '',
      especialidad: especialidad || '',
      activo: true,
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      data: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 LOGIN
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password, rol } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar rol (opcional)
    if (rol && user.rol !== rol) {
      return res.status(401).json({
        success: false,
        message: 'Rol incorrecto'
      });
    }

    // Verificar si está activo
    if (user.activo === false) {
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono || '',
        especialidad: user.especialidad || '',
        activo: user.activo,
        expoPushToken: user.expoPushToken || null,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER TODOS LOS USUARIOS
// ============================================
exports.getUsuarios = async (req, res) => {
  try {
    const usuarios = await User.find().select('-password');
    res.json({
      success: true,
      count: usuarios.length,
      data: usuarios,
    });
  } catch (error) {
    console.error('Error en getUsuarios:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER UN USUARIO
// ============================================
exports.getUsuario = async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('-password');
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    res.json({
      success: true,
      data: usuario,
    });
  } catch (error) {
    console.error('Error en getUsuario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ACTUALIZAR USUARIO (SOLO ADMIN)
// ============================================
exports.updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, especialidad, rol, activo } = req.body;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir modificar a sí mismo
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes modificarte a ti mismo'
      });
    }

    if (nombre) usuario.nombre = nombre;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (especialidad !== undefined) usuario.especialidad = especialidad;
    if (rol) usuario.rol = rol;
    if (activo !== undefined) usuario.activo = activo;

    await usuario.save();

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: usuario,
    });
  } catch (error) {
    console.error('Error en updateUsuario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ELIMINAR USUARIO (SOLO ADMIN)
// ============================================
exports.deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir eliminar a sí mismo
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminarte a ti mismo'
      });
    }

    await usuario.deleteOne();

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    console.error('Error en deleteUsuario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ACTIVAR/DESACTIVAR USUARIO (SOLO ADMIN)
// ============================================
exports.toggleUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir desactivar a sí mismo
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivarte a ti mismo'
      });
    }

    usuario.activo = activo;
    await usuario.save();

    res.json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`,
      data: usuario,
    });
  } catch (error) {
    console.error('Error en toggleUsuario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 CAMBIAR CONTRASEÑA
// ============================================
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar permisos
    if (id !== req.user._id.toString() && req.user.rol !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }

    // Si no es Admin, verificar contraseña actual
    if (req.user.rol !== 'Admin') {
      const isMatch = await bcrypt.compare(currentPassword, usuario.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }
    }

    usuario.password = await bcrypt.hash(newPassword, 10);
    await usuario.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 REGISTRAR TOKEN PUSH
// ============================================
exports.registrarPushToken = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'UserId y token son requeridos'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.expoPushToken = token;
    await user.save();

    console.log(`✅ Token push registrado para ${user.email}`);

    res.json({
      success: true,
      message: 'Token push registrado correctamente',
    });
  } catch (error) {
    console.error('❌ Error registrando token push:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER JEFES (PÚBLICO PARA SOLICITUDES)
// ============================================
exports.getJefes = async (req, res) => {
  try {
    const jefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] }
    }).select('nombre email rol');
    
    res.json({
      success: true,
      data: jefes,
    });
  } catch (error) {
    console.error('Error en getJefes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};