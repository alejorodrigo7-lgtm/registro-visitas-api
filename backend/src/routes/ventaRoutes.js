const express = require('express');
const router = express.Router();

console.log('⚠️ ventaRoutes.js cargado (versión de prueba)');

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ message: '✅ ventaRoutes.js funcionando (modo prueba)' });
});

module.exports = router;
