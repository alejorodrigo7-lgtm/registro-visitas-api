const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin'));

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Usuarios endpoint' });
});

module.exports = router;