const User = require('../models/User');
const jwt = require('jsonwebtoken');
// ✅ CAMBIAR bcryptjs POR bcrypt
const bcrypt = require('bcrypt');
const logger = require('../config/logger');

// ============================================
// 📋 REGISTRAR USUARIO (SOLO ADMIN)
// ============================================
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, rol, telefono, especialidad } = req.body;

    logger.info('Intento de creación de usuario', { 
      email, 
      rol, 
      admin: req.user?.email 
    });

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      logger.warn('Creación fallida - email ya existe', { email });
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    // ✅ Hashear contraseña con bcrypt
    console.log(`🔑 Hasheando contraseña para: ${email}`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(`✅ Hash generado: ${hashedPassword.substring(0, 30)}...`);

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

    console.log(`✅ Usuario creado: ${email} (${user._id})`);

    logger.audit('USUARIO_CREADO', req.user, {
      usuarioCreado: email,
      rolCreado: rol || 'Tecnico',
      admin: req.user?.email
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
    logger.errorWithContext('Error en register', error, {
      email: req.body.email
    });
    console.error('❌ Error en register:', error);
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

    logger.info('Intento de login', { email, rol, ip: req.ip });

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login fallido - usuario no encontrado', { email });
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar rol (opcional)
    if (rol && user.rol !== rol) {
      logger.warn('Login fallido - rol incorrecto', { 
        email, 
        rolEsperado: rol, 
        rolReal: user.rol 
      });
      return res.status(401).json({
        success: false,
        message: 'Rol incorrecto'
      });
    }

    // Verificar si está activo
    if (user.activo === false) {
      logger.warn('Login fallido - usuario inactivo', { 
        email, 
        userId: user._id 
      });
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Login fallido - contraseña incorrecta', { 
        email, 
        userId: user._id 
      });
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

    logger.audit('LOGIN_EXITOSO', user, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

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
    logger.errorWithContext('Error en login', error, {
      email: req.body.email
    });
    console.error('❌ Error en login:', error);
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
    logger.errorWithContext('Error en getUsuarios', error);
    console.error('❌ Error en getUsuarios:', error);
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
    logger.errorWithContext('Error en getUsuario', error, {
      usuarioId: req.params.id
    });
    console.error('❌ Error en getUsuario:', error);
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

    logger.audit('USUARIO_ACTUALIZADO', req.user, {
      usuarioActualizado: usuario.email,
      cambios: { nombre, telefono, especialidad, rol, activo }
    });

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: usuario,
    });
  } catch (error) {
    logger.errorWithContext('Error en updateUsuario', error, {
      usuarioId: req.params.id
    });
    console.error('❌ Error en updateUsuario:', error);
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

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminarte a ti mismo'
      });
    }

    await usuario.deleteOne();

    logger.audit('USUARIO_ELIMINADO', req.user, {
      usuarioEliminado: usuario.email,
      rolEliminado: usuario.rol
    });

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    logger.errorWithContext('Error en deleteUsuario', error, {
      usuarioId: req.params.id
    });
    console.error('❌ Error en deleteUsuario:', error);
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

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivarte a ti mismo'
      });
    }

    usuario.activo = activo;
    await usuario.save();

    logger.audit(`USUARIO_${activo ? 'ACTIVADO' : 'DESACTIVADO'}`, req.user, {
      usuario: usuario.email,
      estado: activo ? 'Activo' : 'Inactivo'
    });

    res.json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`,
      data: usuario,
    });
  } catch (error) {
    logger.errorWithContext('Error en toggleUsuario', error, {
      usuarioId: req.params.id
    });
    console.error('❌ Error en toggleUsuario:', error);
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

    if (id !== req.user._id.toString() && req.user.rol !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }

    if (req.user.rol !== 'Admin') {
      const isMatch = await bcrypt.compare(currentPassword, usuario.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }
    }

    // ✅ Hashear nueva contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(newPassword, salt);
    await usuario.save();

    logger.audit('CONTRASEÑA_CAMBIADA', req.user, {
      usuario: usuario.email,
      cambiadoPor: req.user.email
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    logger.errorWithContext('Error en changePassword', error, {
      usuarioId: req.params.id
    });
    console.error('❌ Error en changePassword:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 RESTABLECER CONTRASEÑA (PÚBLICO - resetea a 123456)
// ============================================
exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es obligatorio'
      });
    }

    console.log('🔑 Restableciendo contraseña para:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // ✅ Hashear con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    user.password = hashedPassword;
    await user.save();

    console.log('✅ Contraseña restablecida para:', email);

    logger.audit('CONTRASEÑA_RESTABLECIDA', user, {
      usuario: user.email,
      metodo: 'reset-password'
    });

    res.json({
      success: true,
      message: 'Contraseña restablecida a 123456'
    });

  } catch (error) {
    console.error('❌ Error en resetPassword:', error);
    logger.errorWithContext('Error en resetPassword', error, {
      email: req.body.email
    });
    res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña'
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

    logger.info(`Token push registrado para ${user.email}`, {
      usuario: user.email,
      userId: user._id
    });
    console.log(`✅ Token push registrado para ${user.email}`);

    res.json({
      success: true,
      message: 'Token push registrado correctamente',
    });
  } catch (error) {
    logger.errorWithContext('Error registrando token push', error, {
      userId: req.body.userId
    });
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
    logger.errorWithContext('Error en getJefes', error);
    console.error('❌ Error en getJefes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};