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

  // ============================================
  // FUNCIÓN PRIVADA PARA ENVIAR CORREOS
  // ============================================
  async _enviarCorreo({ to, cc = [], subject, html }) {
    // Si no hay API Key, simular envío
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 [SIMULADO] Correo enviado (sin API Key)');
      console.log(`   Para: ${to.join(', ')}`);
      if (cc.length > 0) console.log(`   CC: ${cc.join(', ')}`);
      console.log(`   Asunto: ${subject}`);
      return { success: true, simulated: true };
    }

    // Filtrar destinatarios vacíos
    const toList = to.filter(email => email && email.trim() !== '');
    const ccList = cc.filter(email => email && email.trim() !== '');

    // Si no hay destinatarios, no enviar
    if (toList.length === 0 && ccList.length === 0) {
      console.log('⚠️ No hay destinatarios para enviar el correo');
      return { success: false, message: 'No hay destinatarios' };
    }

    // Filtrar cc para eliminar duplicados con to
    const filteredCC = ccList.filter(email => !toList.includes(email));

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
      subject: subject,
      html: html,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false }
      }
    };

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

  // ============================================
  // FUNCIÓN EXISTENTE: Notificación de Desconexión/Reconexión (NO TOCAR)
  // Envía a: Admin (alejorodrigo7@gmail.com)
  // ============================================
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

    // DESTINATARIO: SOLO Admin
    const toList = ['alejorodrigo7@gmail.com'];

    return this._enviarCorreo({
      to: toList,
      cc: [],
      subject: asunto,
      html: html
    });
  }

  // ============================================
  // FUNCIÓN EXISTENTE: Template Generator (NO TOCAR)
  // ============================================
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

  // ============================================
  // NUEVA FUNCIÓN 1: DESCONEXIÓN EJECUTADA
  // → Envía al usuario que SOLICITÓ la desconexión
  // ============================================
  async enviarNotificacionDesconexionEjecutada(desconexion, usuarioEjecutor, usuarioSolicitante) {
    const asunto = `✅ DESCONEXIÓN EJECUTADA - ${desconexion.cliente}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Desconexión Ejecutada</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #2e7d32; color: white; padding: 25px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px 25px; background: #ffffff; }
          .field { margin: 0 0 15px 0; padding: 12px 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #2e7d32; }
          .field strong { color: #2e7d32; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field span { font-size: 15px; color: #333; }
          .badge { background: #2e7d32; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; display: inline-block; font-weight: 600; }
          .button { display: inline-block; padding: 12px 30px; background: #2e7d32; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0 5px 0; font-weight: 600; }
          .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
          .footer .brand { font-weight: 600; color: #1a237e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Desconexión Ejecutada</h1>
          </div>
          <div class="content">
            <p><strong>Hola ${usuarioSolicitante.nombre},</strong></p>
            <p>Tu solicitud de <strong>DESCONEXIÓN</strong> ha sido <strong>ejecutada</strong> correctamente.</p>
            <div class="field">
              <strong>Cliente</strong>
              <span>${desconexion.cliente}</span>
            </div>
            <div class="field">
              <strong>Dirección</strong>
              <span>${desconexion.direccion || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Teléfono</strong>
              <span>${desconexion.telefono || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Ejecutado por</strong>
              <span>${usuarioEjecutor?.nombre || 'Sistema'}</span>
            </div>
            <div class="field">
              <strong>Fecha de Ejecución</strong>
              <span>${new Date().toLocaleString('es-EC')}</span>
            </div>
            ${desconexion.observaciones ? `<div class="field"><strong>Observaciones</strong><span>${desconexion.observaciones}</span></div>` : ''}
            <div style="text-align: center; margin: 20px 0 10px 0;">
              <a href="${process.env.FRONTEND_URL}/desconexiones" class="button">📋 Ver en RA²P</a>
            </div>
          </div>
          <div class="footer">
            <p class="brand">RA²P - Sistema de Gestión</p>
            <p>Este es un mensaje automático del sistema.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar al usuario que solicitó
    return this._enviarCorreo({
      to: [usuarioSolicitante.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

  // ============================================
  // NUEVA FUNCIÓN 2: RECONEXIÓN EJECUTADA
  // → Envía al usuario que SOLICITÓ la reconexión
  // ============================================
  async enviarNotificacionReconexionEjecutada(reconexion, usuarioEjecutor, usuarioSolicitante) {
    const asunto = `✅ RECONEXIÓN EJECUTADA - ${reconexion.cliente}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reconexión Ejecutada</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #1565c0; color: white; padding: 25px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px 25px; background: #ffffff; }
          .field { margin: 0 0 15px 0; padding: 12px 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #1565c0; }
          .field strong { color: #1565c0; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field span { font-size: 15px; color: #333; }
          .badge { background: #1565c0; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; display: inline-block; font-weight: 600; }
          .button { display: inline-block; padding: 12px 30px; background: #1565c0; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0 5px 0; font-weight: 600; }
          .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
          .footer .brand { font-weight: 600; color: #1a237e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Reconexión Ejecutada</h1>
          </div>
          <div class="content">
            <p><strong>Hola ${usuarioSolicitante.nombre},</strong></p>
            <p>Tu solicitud de <strong>RECONEXIÓN</strong> ha sido <strong>ejecutada</strong> correctamente.</p>
            <div class="field">
              <strong>Cliente</strong>
              <span>${reconexion.cliente}</span>
            </div>
            <div class="field">
              <strong>Dirección</strong>
              <span>${reconexion.direccion || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Teléfono</strong>
              <span>${reconexion.telefono || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Ejecutado por</strong>
              <span>${usuarioEjecutor?.nombre || 'Sistema'}</span>
            </div>
            <div class="field">
              <strong>Fecha de Ejecución</strong>
              <span>${new Date().toLocaleString('es-EC')}</span>
            </div>
            ${reconexion.observaciones ? `<div class="field"><strong>Observaciones</strong><span>${reconexion.observaciones}</span></div>` : ''}
            <div style="text-align: center; margin: 20px 0 10px 0;">
              <a href="${process.env.FRONTEND_URL}/desconexiones" class="button">📋 Ver en RA²P</a>
            </div>
          </div>
          <div class="footer">
            <p class="brand">RA²P - Sistema de Gestión</p>
            <p>Este es un mensaje automático del sistema.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar al usuario que solicitó
    return this._enviarCorreo({
      to: [usuarioSolicitante.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

  // ============================================
  // NUEVA FUNCIÓN 3: SERVICIO ASIGNADO
  // → Envía al técnico ASIGNADO
  // ============================================
  async enviarNotificacionServicioAsignado(servicio, tecnico) {
    const asunto = `🔧 NUEVO SERVICIO ASIGNADO - ${servicio.cliente}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Servicio Asignado</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #e65100; color: white; padding: 25px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px 25px; background: #ffffff; }
          .field { margin: 0 0 15px 0; padding: 12px 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #e65100; }
          .field strong { color: #e65100; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field span { font-size: 15px; color: #333; }
          .badge { background: #e65100; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; display: inline-block; font-weight: 600; }
          .button { display: inline-block; padding: 12px 30px; background: #e65100; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0 5px 0; font-weight: 600; }
          .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
          .footer .brand { font-weight: 600; color: #1a237e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔧 Nuevo Servicio Asignado</h1>
          </div>
          <div class="content">
            <p><strong>Hola ${tecnico.nombre},</strong></p>
            <p>Se te ha <strong>asignado</strong> un nuevo servicio:</p>
            <div class="field">
              <strong>Cliente</strong>
              <span>${servicio.cliente}</span>
            </div>
            <div class="field">
              <strong>Dirección</strong>
              <span>${servicio.direccion || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Teléfono</strong>
              <span>${servicio.telefono || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Descripción</strong>
              <span>${servicio.descripcion || 'Sin descripción'}</span>
            </div>
            <div class="field">
              <strong>Prioridad</strong>
              <span>${servicio.prioridad || 'Normal'}</span>
            </div>
            <div class="field">
              <strong>Asignado por</strong>
              <span>${servicio.asignadoPor?.nombre || 'Sistema'}</span>
            </div>
            <div class="field">
              <strong>Fecha de Asignación</strong>
              <span>${new Date().toLocaleString('es-EC')}</span>
            </div>
            <div style="text-align: center; margin: 20px 0 10px 0;">
              <a href="${process.env.FRONTEND_URL}/servicios" class="button">📋 Ver en RA²P</a>
            </div>
          </div>
          <div class="footer">
            <p class="brand">RA²P - Sistema de Gestión</p>
            <p>Este es un mensaje automático del sistema.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar al técnico asignado
    return this._enviarCorreo({
      to: [tecnico.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

  // ============================================
  // NUEVA FUNCIÓN 4: SERVICIO EJECUTADO
  // → Envía al usuario que SOLICITÓ el servicio
  // ============================================
  async enviarNotificacionServicioEjecutado(servicio, usuarioSolicitante) {
    const asunto = `✅ SERVICIO EJECUTADO - ${servicio.cliente}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Servicio Ejecutado</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #2e7d32; color: white; padding: 25px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px 25px; background: #ffffff; }
          .field { margin: 0 0 15px 0; padding: 12px 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #2e7d32; }
          .field strong { color: #2e7d32; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field span { font-size: 15px; color: #333; }
          .badge { background: #2e7d32; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; display: inline-block; font-weight: 600; }
          .button { display: inline-block; padding: 12px 30px; background: #2e7d32; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0 5px 0; font-weight: 600; }
          .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
          .footer .brand { font-weight: 600; color: #1a237e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Servicio Ejecutado</h1>
          </div>
          <div class="content">
            <p><strong>Hola ${usuarioSolicitante.nombre},</strong></p>
            <p>El servicio que solicitaste ha sido <strong>ejecutado</strong> correctamente.</p>
            <div class="field">
              <strong>Cliente</strong>
              <span>${servicio.cliente}</span>
            </div>
            <div class="field">
              <strong>Dirección</strong>
              <span>${servicio.direccion || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Teléfono</strong>
              <span>${servicio.telefono || 'N/A'}</span>
            </div>
            <div class="field">
              <strong>Fecha de Ejecución</strong>
              <span>${new Date().toLocaleString('es-EC')}</span>
            </div>
            ${servicio.observacionesEjecucion ? `<div class="field"><strong>Observaciones</strong><span>${servicio.observacionesEjecucion}</span></div>` : ''}
            <div style="text-align: center; margin: 20px 0 10px 0;">
              <p style="color: #2e7d32; font-weight: 600;">✅ Servicio completado exitosamente</p>
              <a href="${process.env.FRONTEND_URL}/servicios" class="button">📋 Ver en RA²P</a>
            </div>
          </div>
          <div class="footer">
            <p class="brand">RA²P - Sistema de Gestión</p>
            <p>Este es un mensaje automático del sistema.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar al usuario que solicitó el servicio
    return this._enviarCorreo({
      to: [usuarioSolicitante.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }
}

module.exports = new EmailService();