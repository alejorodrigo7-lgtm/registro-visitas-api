const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    console.log('📧 Inicializando EmailService con SendGrid...');
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY no configurada en .env');
      console.log('⚠️ Usando modo simulación para pruebas');
    } else {
      sgMail.setApiKey(apiKey);
      console.log('✅ SendGrid configurado correctamente');
    }
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

    // Si no hay API Key, simular envío
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 [SIMULADO] Correo enviado (sin API Key)');
      console.log(`   Para: ${process.env.EMAIL_ADMINS}`);
      console.log(`   Asunto: ${asunto}`);
      return { success: true, simulated: true };
    }

    // 🔧 Eliminar duplicados entre to y cc
    const toList = process.env.EMAIL_ADMINS ? process.env.EMAIL_ADMINS.split(',').map(email => email.trim()).filter(email => email) : [];
    const ccList = process.env.EMAIL_JEFES ? process.env.EMAIL_JEFES.split(',').map(email => email.trim()).filter(email => email) : [];

    // Filtrar cc para eliminar duplicados con to
    const filteredCC = ccList.filter(email => !toList.includes(email));

    // Construir el mensaje (si filteredCC está vacío, no incluir cc)
    const msg = {
      to: toList,
      from: {
        email: process.env.EMAIL_FROM || 'alejorodrigo7@gmail.com',
        name: 'RA²P Notificaciones'
      },
      subject: asunto,
      html: html,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false }
      }
    };

    // Solo agregar cc si hay destinatarios filtrados
    if (filteredCC.length > 0) {
      msg.cc = filteredCC;
    }

    try {
      const result = await sgMail.send(msg);
      console.log('✅ Correo enviado exitosamente via SendGrid');
      console.log(`   Para: ${toList.join(', ')}`);
      if (filteredCC.length > 0) {
        console.log(`   CC: ${filteredCC.join(', ')}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Error enviando correo via SendGrid:', error.message);
      if (error.response) {
        console.error('   Detalle:', error.response.body);
      }
      throw error;
    }
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
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 11px; text-align: center;">
              RA²P - Sistema de Gestión de Desconexiones y Reconexiones<br>
              Este es un mensaje automático del sistema.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();