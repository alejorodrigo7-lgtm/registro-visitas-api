const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📤 Subir imagen
router.post('/subir', uploadController.subirImagen);

// 🗑️ Eliminar imagen
router.delete('/eliminar', uploadController.eliminarImagen);

module.exports = router;