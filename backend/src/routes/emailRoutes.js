const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { protect } = require('../middleware/auth');

// ============================================
// 📧 ENVIAR REPORTE DE ESTADÍSTICAS
// ============================================
router.post('/enviar-reporte', protect, async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !to.length) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un destinatario'
      });
    }

    // Generar HTML a partir del texto plano
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f0eb; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #e86000, #cc5500); padding: 25px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0 0; }
          .content { padding: 25px; }
          .content pre { background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 13px; color: #333; }
          .footer { background: #f5ede5; padding: 15px; text-align: center; }
          .footer p { margin: 0; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 RA²P - Reporte</h1>
            <p>${subject}</p>
          </div>
          <div class="content">
            <pre>${body}</pre>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} RA²P - Sistema de Gestión</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await emailService.enviarCorreo({
      to: to,
      subject: subject,
      html: html,
      text: body
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Correo enviado a ${to.length} destinatario(s)`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Error al enviar correo'
      });
    }
  } catch (error) {
    console.error('❌ Error en /enviar-reporte:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📧 ENVIAR CORREO GENÉRICO
// ============================================
router.post('/send', protect, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !to.length) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un destinatario'
      });
    }

    const result = await emailService.enviarCorreo({
      to: to,
      subject: subject || 'Correo desde RA²P',
      html: html || text || 'Correo enviado desde RA²P',
      text: text || 'Correo enviado desde RA²P'
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Correo enviado a ${to.length} destinatario(s)`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Error al enviar correo'
      });
    }
  } catch (error) {
    console.error('❌ Error en /send:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;