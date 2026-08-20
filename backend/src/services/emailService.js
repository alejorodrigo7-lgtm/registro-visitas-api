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

    // ✅ MEJORA: Agregar Reply-To y mejorar configuración
    const msg = {
      to: toList,
      from: {
        email: process.env.EMAIL_FROM || 'alejorodrigo7@gmail.com',
        name: 'RA²P Notificaciones'
      },
      replyTo: {
        email: process.env.EMAIL_FROM || 'alejorodrigo7@gmail.com',
        name: 'RA²P Soporte'
      },
      subject: asunto,
      html: html,
      // ✅ MEJORA: Desactivar tracking para evitar SPAM
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false }
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
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Solicitud de ${tipo}</title>
        <style>
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            padding: 0;
            background: #ffffff; 
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header { 
            background: #1a237e; 
            color: white; 
            padding: 25px 20px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content { 
            padding: 30px 25px; 
            background: #ffffff;
          }
          .field { 
            margin: 0 0 15px 0; 
            padding: 12px 15px; 
            background: #f8f9fa; 
            border-radius: 6px;
            border-left: 4px solid #1a237e;
          }
          .field strong {
            color: #1a237e;
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .field span {
            font-size: 15px;
            color: #333;
          }
          .badge { 
            background: ${tipo === 'DESCONEXION' ? '#d32f2f' : '#2e7d32'};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            display: inline-block;
            font-weight: 600;
          }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #1a237e; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 15px 0 5px 0;
            font-weight: 600;
          }
          .footer {
            padding: 20px 25px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            text-align: center;
          }
          .footer p {
            margin: 5px 0;
            color: #6c757d;
            font-size: 12px;
          }
          .footer .brand {
            font-weight: 600;
            color: #1a237e;
          }
          @media only screen and (max-width: 480px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .header h1 { font-size: 20px; }
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
              <strong>Cliente</strong>
              <span>${cliente.nombre} (${cliente.codigo || cliente.documento})</span>
            </div>
            <div class="field">
              <strong>Motivo</strong>
              <span>${motivo}</span>
            </div>
            ${observaciones ? `<div class="field"><strong>Observaciones</strong><span>${observaciones}</span></div>` : ''}
            <div class="field">
              <strong>Solicitante</strong>
              <span>${usuario.nombre} (${usuario.rol})</span>
            </div>
            <div class="field">
              <strong>Fecha/Hora</strong>
              <span>${new Date(fecha).toLocaleString('es-EC')}</span>
            </div>
            <div class="field">
              <strong>Tipo</strong>
              <span class="badge">${tipo}</span>
            </div>
            <div style="text-align: center; margin: 20px 0 10px 0;">
              <a href="${urlAccion}" class="button">📋 Gestionar en RA²P</a>
            </div>
          </div>
          <div class="footer">
            <p class="brand">RA²P - Sistema de Gestión</p>
            <p>Este es un mensaje automático del sistema.</p>
            <p style="font-size: 11px; color: #adb5bd;">
              &copy; ${new Date().getFullYear()} RA²P - Todos los derechos reservados
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();