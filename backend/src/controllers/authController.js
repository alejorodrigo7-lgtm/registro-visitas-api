const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// ============================================
// INICIAR SESIÓN - ACTUALIZADO CON PUSH
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password, rol } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (user.rol !== rol) {
      return res.status(401).json({ message: 'Rol incorrecto' });
    }

    if (user.activo === false) {
      return res.status(401).json({ message: 'Usuario desactivado' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        especialidad: user.especialidad,
        activo: user.activo,
        expoPushToken: user.expoPushToken || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// REGISTRAR USUARIO (Admin)
// ============================================
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, rol, telefono, especialidad } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const user = await User.create({
      nombre,
      email,
      password,
      rol,
      telefono,
      especialidad,
      activo: true,
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// REGISTRAR TOKEN DE NOTIFICACIONES PUSH
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
    
    console.log(`✅ Token push registrado para ${user.email} (${user.rol})`);
    
    res.json({
      success: true,
      message: 'Token push registrado correctamente',
      user: {
        id: user._id,
        email: user.email,
        rol: user.rol,
        expoPushToken: user.expoPushToken,
      },
    });
  } catch (error) {
    console.error('❌ Error registrando token push:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ============================================
// OBTENER TODOS LOS USUARIOS
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
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// OBTENER UN USUARIO
// ============================================
exports.getUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await User.findById(id).select('-password');
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: usuario });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ACTUALIZAR USUARIO (Admin)
// ============================================
exports.updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, especialidad, rol } = req.body;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes modificarte a ti mismo' });
    }

    usuario.nombre = nombre || usuario.nombre;
    usuario.telefono = telefono !== undefined ? telefono : usuario.telefono;
    usuario.especialidad = especialidad !== undefined ? especialidad : usuario.especialidad;
    usuario.rol = rol || usuario.rol;

    await usuario.save();

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: usuario,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ELIMINAR USUARIO (Admin)
// ============================================
exports.deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await User.findById(id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    await usuario.deleteOne();
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// DESACTIVAR/ACTIVAR USUARIO (Admin)
// ============================================
exports.toggleUsuarioActivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' });
    }

    usuario.activo = activo;
    await usuario.save();

    res.json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`,
      data: usuario,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (id !== req.user._id.toString() && req.user.rol !== 'Admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (req.user.rol !== 'Admin') {
      const isMatch = await usuario.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta' });
      }
    }

    usuario.password = newPassword;
    await usuario.save();

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};