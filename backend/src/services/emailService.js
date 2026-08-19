const mailgun = require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

class EmailService {
  constructor() {
    console.log('📧 Inicializando EmailService con Mailgun...');
    console.log(`📧 MAILGUN_API_KEY: ${process.env.MAILGUN_API_KEY ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`📧 MAILGUN_DOMAIN: ${process.env.MAILGUN_DOMAIN || 'No configurado'}`);
  }

  async enviarNotificacionDesconexion(data) {
    const { 
      cliente, 
      motivo, 
      observaciones, 
      usuario, 
      fecha, 
      tipo 
    } = data;

    const asunto = `⚠️ NUEVA ${tipo.toUpperCase()} - ${cliente.nombre}`;
    const html = this.generarTemplate({
      ...data,
      tipo: tipo.toUpperCase(),
      urlAccion: `${process.env.FRONTEND_URL}/ejecucion`
    });

    return new Promise((resolve, reject) => {
      const msg = {
        from: `"RA²P Notificaciones" <postmaster@${process.env.MAILGUN_DOMAIN}>`,
        to: process.env.EMAIL_ADMINS.split(','),
        cc: process.env.EMAIL_JEFES ? process.env.EMAIL_JEFES.split(',') : [],
        subject: asunto,
        html: html
      };

      mailgun.messages().send(msg, (error, body) => {
        if (error) {
          console.error('❌ Error enviando correo via Mailgun:', error);
          reject(error);
        } else {
          console.log('✅ Correo enviado exitosamente via Mailgun:', body);
          resolve(body);
        }
      });
    });
  }

  generarTemplate(data) {
    const { cliente, motivo, observaciones, usuario, fecha, tipo, urlAccion } = data;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a237e; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
          .field { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #1a237e; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px;
            margin: 20px 0;
          }
          .badge { 
            background: ${tipo === 'DESCONEXION' ? '#d32f2f' : '#2e7d32'};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Nueva Solicitud de ${tipo}</h1>
          </div>
          <div class="content">
            <div class="field">
              <strong>Cliente:</strong> ${cliente.nombre} (${cliente.codigo || cliente.documento})
            </div>
            <div class="field">
              <strong>Motivo:</strong> ${motivo}
            </div>
            ${observaciones ? `<div class="field"><strong>Observaciones:</strong> ${observaciones}</div>` : ''}
            <div class="field">
              <strong>Solicitante:</strong> ${usuario.nombre} (${usuario.rol})
            </div>
            <div class="field">
              <strong>Fecha/Hora:</strong> ${new Date(fecha).toLocaleString('es-EC')}
            </div>
            <div class="field">
              <strong>Tipo:</strong> <span class="badge">${tipo}</span>
            </div>
            <a href="${urlAccion}" class="button">📋 Gestionar en RA²P</a>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Este mensaje es automático. Por favor, no responder a este correo.
            </p>
          </div>
        </div>
      </html>
    `;
  }
}

module.exports = new EmailService();