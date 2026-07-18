const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ============================================
// 📋 LOGIN CON LOGS DETALLADOS
// ============================================
router.post('/login', async (req, res) => {
  try {
    console.log('🔍 [LOGIN] Solicitud recibida');
    console.log('🔍 [LOGIN] Body:', req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ [LOGIN] Email o contraseña faltantes');
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios'
      });
    }

    console.log(`🔍 [LOGIN] Buscando usuario: ${email}`);
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      console.log(`❌ [LOGIN] Usuario no encontrado: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ [LOGIN] Usuario encontrado: ${user.email} (${user.rol})`);
    console.log(`🔍 [LOGIN] Hash en DB: ${user.password}`);
    console.log(`🔍 [LOGIN] Comparando con: ${password}`);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`🔍 [LOGIN] Resultado de comparación: ${isMatch}`);

    if (!isMatch) {
      console.log('❌ [LOGIN] Contraseña incorrecta');
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    console.log('✅ [LOGIN] Contraseña correcta, generando token...');

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'mi_clave_secreta',
      { expiresIn: '7d' }
    );

    console.log(`✅ [LOGIN] Login exitoso para: ${user.email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono || ''
      }
    });

  } catch (error) {
    console.error('❌ [LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🔒 CAMBIAR CONTRASEÑA (Usuario autenticado)
// ============================================
router.put('/cambiar-password', protect, async (req, res) => {
  try {
    console.log('🔒 [CAMBIAR] Solicitud recibida');
    console.log('🔒 [CAMBIAR] Body:', req.body);

    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
      console.log('❌ [CAMBIAR] Faltan campos');
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son obligatorias'
      });
    }

    if (passwordNuevo.length < 6) {
      console.log('❌ [CAMBIAR] Contraseña muy corta');
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    console.log(`🔒 [CAMBIAR] Usuario ID: ${req.user._id}`);
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('❌ [CAMBIAR] Usuario no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`🔒 [CAMBIAR] Usuario: ${user.email}`);
    console.log(`🔒 [CAMBIAR] Hash actual en DB: ${user.password}`);
    console.log(`🔒 [CAMBIAR] Comparando contraseña actual: ${passwordActual}`);

    const isMatch = await bcrypt.compare(passwordActual, user.password);
    console.log(`🔒 [CAMBIAR] Resultado comparación: ${isMatch}`);

    if (!isMatch) {
      console.log('❌ [CAMBIAR] Contraseña actual incorrecta');
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    console.log(`🔒 [CAMBIAR] Generando hash para: ${passwordNuevo}`);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordNuevo, salt);
    console.log(`🔒 [CAMBIAR] Hash generado: ${hash}`);

    user.password = hash;
    await user.save();

    console.log(`✅ [CAMBIAR] Contraseña actualizada para: ${user.email}`);
    console.log(`✅ [CAMBIAR] Nuevo hash guardado: ${hash}`);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error('❌ [CAMBIAR] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🔑 RESTABLECER CONTRASEÑA (Olvidé mi contraseña)
// ============================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es obligatorio'
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No existe un usuario con ese email'
      });
    }

    // 🔥 GENERAR HASH CORRECTO PARA 123456
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);
    user.password = hash;
    await user.save();

    console.log(`✅ Contraseña restablecida para: ${email}`);
    console.log(`🔑 Hash generado: ${hash}`);

    res.json({
      success: true,
      message: 'Contraseña restablecida a 123456'
    });

  } catch (error) {
    console.error('❌ Error en reset-password:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 👤 REGISTRAR NUEVO USUARIO (Admin)
// ============================================
router.post('/register', protect, authorize('Admin'), async (req, res) => {
  try {
    const { nombre, email, rol, telefono, especialidad } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y email son obligatorios'
      });
    }

    const existe = await User.findOne({ email: email.trim().toLowerCase() });
    if (existe) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese email'
      });
    }

    // 🔥 GENERAR HASH CORRECTO PARA 123456
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);

    const nuevoUsuario = new User({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      rol: rol || 'Tecnico',
      telefono: telefono || '',
      especialidad: especialidad || '',
      activo: true,
      createdAt: new Date()
    });

    await nuevoUsuario.save();

    console.log(`✅ Nuevo usuario creado: ${email} (${rol || 'Tecnico'}) - Contraseña: 123456`);
    console.log(`🔑 Hash generado: ${hash}`);

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente. Contraseña: 123456',
      data: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }
    });

  } catch (error) {
    console.error('❌ Error en register:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS USUARIOS (Admin/Jefe)
// ============================================
router.get('/usuarios', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const usuarios = await User.find({}, '-password').sort({ nombre: 1 });
    res.json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    console.error('❌ Error en usuarios:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 OBTENER JEFES (para solicitudes de ausencia)
// ============================================
router.get('/jefes', protect, async (req, res) => {
  try {
    const jefes = await User.find(
      { rol: { $in: ['Admin', 'Jefe'] } },
      'nombre email rol'
    ).sort({ nombre: 1 });
    res.json({
      success: true,
      data: jefes
    });
  } catch (error) {
    console.error('❌ Error en jefes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🗑️ ELIMINAR USUARIO (Admin)
// ============================================
router.delete('/usuarios/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propio usuario'
      });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    await user.deleteOne();
    
    console.log(`🗑️ Usuario eliminado: ${user.email} (${user.rol})`);
    
    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🔄 ACTIVAR/DESACTIVAR USUARIO (Admin)
// ============================================
router.put('/usuarios/:id/toggle', protect, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propio usuario'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.activo = activo;
    await user.save();

    console.log(`🔄 Usuario ${activo ? 'activado' : 'desactivado'}: ${user.email}`);

    res.json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`,
      data: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        activo: user.activo
      }
    });

  } catch (error) {
    console.error('❌ Error en toggle usuario:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🔄 ACTUALIZAR USUARIO (Admin/Jefe)
// ============================================
router.put('/usuarios/:id', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const { nombre, rol, telefono, especialidad, activo } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (nombre) user.nombre = nombre.trim();
    if (rol) user.rol = rol;
    if (telefono !== undefined) user.telefono = telefono;
    if (especialidad !== undefined) user.especialidad = especialidad;
    if (activo !== undefined) user.activo = activo;

    await user.save();

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo
      }
    });

  } catch (error) {
    console.error('❌ Error en actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📱 REGISTRAR TOKEN PUSH
// ============================================
router.post('/registrar-push-token', protect, async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'UserId y token son obligatorios'
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

    console.log(`📱 Token push registrado para ${user.email}`);

    res.json({
      success: true,
      message: 'Token push registrado correctamente'
    });

  } catch (error) {
    console.error('❌ Error en registrar-push-token:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🔧 RUTA TEMPORAL PARA VER EL HASH DE 123456
// ============================================
router.get('/test-hash', (req, res) => {
  const bcrypt = require('bcrypt');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('123456', salt);
  res.json({
    hash: hash,
    message: 'Este es el hash que genera Render para 123456'
  });
});

module.exports = router;