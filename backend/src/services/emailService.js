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
  // ✅ FUNCIÓN PRINCIPAL PARA ENVIAR CORREOS
  // ============================================
  async enviarCorreo({ to, cc = [], subject, html, text }) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('📧 [SIMULADO] Correo enviado (sin API Key)');
        console.log(`   Para: ${to}`);
        if (cc.length > 0) console.log(`   CC: ${cc.join(', ')}`);
        console.log(`   Asunto: ${subject}`);
        return { success: true, simulated: true };
      }

      const toList = Array.isArray(to) ? to.filter(email => email && email.trim() !== '') : [to].filter(email => email && email.trim() !== '');
      const ccList = cc.filter(email => email && email.trim() !== '');

      if (toList.length === 0 && ccList.length === 0) {
        console.log('⚠️ No hay destinatarios para enviar el correo');
        return { success: false, message: 'No hay destinatarios' };
      }

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
        html: html || text || 'Correo enviado desde RA²P',
        text: text || 'Correo enviado desde RA²P',
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false },
          subscriptionTracking: { enable: false }
        }
      };

      if (filteredCC.length > 0) {
        msg.cc = filteredCC;
      }

      const result = await sgMail.send(msg);
      console.log('✅ Correo enviado exitosamente via SendGrid');
      console.log(`   Para: ${toList.join(', ')}`);
      if (filteredCC.length > 0) {
        console.log(`   CC: ${filteredCC.join(', ')}`);
      }
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error enviando correo via SendGrid:', error.message);
      if (error.response) {
        console.error('   Detalle:', error.response.body);
      }
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // FUNCIÓN PRIVADA PARA ENVIAR CORREOS (INTERNA)
  // ============================================
  async _enviarCorreo({ to, cc = [], subject, html }) {
    return this.enviarCorreo({ to, cc, subject, html });
  }

  // ============================================
  // FUNCIÓN EXISTENTE: Notificación de Desconexión/Reconexión
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

    const toList = ['alejorodrigo7@gmail.com'];

    return this.enviarCorreo({
      to: toList,
      cc: [],
      subject: asunto,
      html: html
    });
  }

  // ============================================
  // FUNCIÓN EXISTENTE: Template Generator
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
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; padding: 0; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #1a237e; color: white; padding: 25px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 30px 25px; background: #ffffff; }
          .field { margin: 0 0 15px 0; padding: 12px 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #1a237e; }
          .field strong { color: #1a237e; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field span { font-size: 15px; color: #333; }
          .badge { background: ${tipo === 'DESCONEXION' ? '#d32f2f' : '#2e7d32'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; display: inline-block; font-weight: 600; }
          .button { display: inline-block; padding: 12px 30px; background: #1a237e; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0 5px 0; font-weight: 600; }
          .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
          .footer .brand { font-weight: 600; color: #1a237e; }
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
  // ✅ NUEVA FUNCIÓN: ENVIAR CORREO DE RECIBO CON ADJUNTOS
  // ============================================
  async enviarCorreoRecibo({ 
    to, 
    clienteNombre, 
    fechaSolicitud, 
    observaciones, 
    archivosBase64 = [], 
    archivosNombres = [], 
    estado = 'APROBADO',
    motivoDenegacion = '',
    usuarioSolicitante = ''
  }) {
    try {
      console.log(`📧 Enviando correo de recibo a: ${to}`);
      console.log(`📧 Estado: ${estado}`);
      console.log(`📧 Archivos: ${archivosBase64.length}`);

      // Construir contenido HTML
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${estado === 'APROBADO' ? '✅ Recibo Aprobado' : '❌ Recibo Denegado'}</title>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: ${estado === 'APROBADO' ? '#2e7d32' : '#c62828'}; color: white; padding: 25px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px 25px; background: #ffffff; }
            .field { margin: 0 0 15px 0; padding: 12px 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid ${estado === 'APROBADO' ? '#2e7d32' : '#c62828'}; }
            .field strong { color: ${estado === 'APROBADO' ? '#2e7d32' : '#c62828'}; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .field span { font-size: 15px; color: #333; }
            .badge { background: ${estado === 'APROBADO' ? '#2e7d32' : '#c62828'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; display: inline-block; font-weight: 600; }
            .button { display: inline-block; padding: 12px 30px; background: ${estado === 'APROBADO' ? '#2e7d32' : '#c62828'}; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0 5px 0; font-weight: 600; }
            .archivo-item { background: #f0edff; padding: 10px 15px; border-radius: 6px; margin: 5px 0; display: flex; align-items: center; gap: 10px; }
            .archivo-item .icon { font-size: 20px; }
            .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
            .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
            .footer .brand { font-weight: 600; color: #6C5CE7; }
            .motivo-denegacion { background: #fff3e0; padding: 15px; border-radius: 6px; border-left: 4px solid #ff6f00; margin: 10px 0; }
            .motivo-denegacion strong { color: #e65100; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${estado === 'APROBADO' ? '✅ Recibo Aprobado' : '❌ Recibo Denegado'}</h1>
            </div>
            <div class="content">
              <p><strong>Hola ${usuarioSolicitante || clienteNombre},</strong></p>
              <p>Su solicitud de recibo ha sido <span class="badge">${estado}</span>.</p>
      `;

      if (estado === 'DENEGADO' && motivoDenegacion) {
        htmlContent += `
          <div class="motivo-denegacion">
            <strong>📝 Motivo de denegación:</strong>
            <p style="margin: 8px 0 0 0; color: #333;">${motivoDenegacion}</p>
          </div>
        `;
      }

      htmlContent += `
              <div class="field">
                <strong>Cliente</strong>
                <span>${clienteNombre}</span>
              </div>
              <div class="field">
                <strong>Fecha de Solicitud</strong>
                <span>${fechaSolicitud}</span>
              </div>
      `;

      if (observaciones) {
        htmlContent += `
              <div class="field">
                <strong>Observaciones</strong>
                <span>${observaciones}</span>
              </div>
        `;
      }

      if (estado === 'APROBADO' && archivosNombres.length > 0) {
        htmlContent += `
              <div class="field">
                <strong>📎 Archivos Adjuntos (${archivosNombres.length})</strong>
                <div style="margin-top: 8px;">
        `;
        for (const nombre of archivosNombres) {
          htmlContent += `
                  <div class="archivo-item">
                    <span class="icon">📄</span>
                    <span>${nombre}</span>
                  </div>
          `;
        }
        htmlContent += `
                </div>
              </div>
              <p style="color: #636E72; font-size: 13px;">
                💡 Los archivos se encuentran adjuntos a este correo.
              </p>
        `;
      }

      htmlContent += `
              <div style="text-align: center; margin: 20px 0 10px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://ra2p-app.com'}" class="button">📋 Ver en RA²P</a>
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

      // ✅ Construir adjuntos para SendGrid
      const attachments = [];
      
      if (estado === 'APROBADO' && archivosBase64.length > 0) {
        for (let i = 0; i < archivosBase64.length; i++) {
          const base64Data = archivosBase64[i];
          const nombre = archivosNombres[i] || `recibo_${i+1}.pdf`;
          
          let mimeType = 'application/pdf';
          const nombreLower = nombre.toLowerCase();
          if (nombreLower.endsWith('.jpg') || nombreLower.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          } else if (nombreLower.endsWith('.png')) {
            mimeType = 'image/png';
          } else if (nombreLower.endsWith('.pdf')) {
            mimeType = 'application/pdf';
          }

          let cleanBase64 = base64Data;
          if (base64Data && base64Data.includes(',')) {
            cleanBase64 = base64Data.split(',')[1];
          }

          if (cleanBase64 && cleanBase64.length > 0) {
            attachments.push({
              content: cleanBase64,
              filename: nombre,
              type: mimeType,
              disposition: 'attachment',
            });
            console.log(`📎 Adjuntando: ${nombre} (${mimeType})`);
          }
        }
      }

      const msg = {
        to: to,
        from: {
          email: process.env.EMAIL_FROM || 'alejorodrigo7@gmail.com',
          name: 'RA²P Recibos'
        },
        replyTo: {
          email: process.env.EMAIL_FROM || 'alejorodrigo7@gmail.com',
          name: 'RA²P Soporte'
        },
        subject: estado === 'APROBADO' 
          ? `✅ Recibo Aprobado - ${clienteNombre}`
          : `❌ Recibo Denegado - ${clienteNombre}`,
        html: htmlContent,
        attachments: attachments,
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false },
          subscriptionTracking: { enable: false }
        }
      };

      console.log(`📧 Enviando correo a ${to} con ${attachments.length} adjuntos...`);

      const result = await sgMail.send(msg);
      
      console.log(`✅ Correo enviado exitosamente a ${to}`);
      console.log(`✅ Status: ${result[0]?.statusCode}`);
      
      return { success: true, message: 'Correo enviado correctamente' };

    } catch (error) {
      console.error('❌ Error enviando correo de recibo:', error);
      console.error('❌ Detalle:', error.response?.body || error.message);
      
      return { 
        success: false, 
        message: 'Error al enviar correo',
        error: error.message 
      };
    }
  }

  // ============================================
  // ✅ NUEVA FUNCIÓN: GENERAR PLANTILLA PARA TICKETS
  // ============================================
  generarPlantillaTicket(ticket, estado, mensaje, tecnico = null) {
    const estadoColors = {
      'Nuevo': '#F39C12',
      'Asignado': '#3498DB',
      'TOMADO': '#8E44AD',
      'En Progreso': '#9B59B6',
      'Resuelto': '#2ECC71',
      'Cerrado': '#95A5A6'
    };

    const color = estadoColors[estado] || '#e86000';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actualización de Ticket RA2P</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f0eb;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e86000, #cc5500); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📡 RA2P</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Soporte Técnico</p>
        </div>

        <!-- Content -->
        <div style="padding: 25px;">
            <h2 style="color: #1a237e; margin-top: 0;">🎫 Actualización de Ticket</h2>
            
            <div style="background: #faf8f5; padding: 15px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid ${color};">
                <p style="margin: 0;"><strong>Ticket:</strong> <span style="color: #e86000;">${ticket.ticketId}</span></p>
                <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: ${color}; font-weight: bold;">${estado}</span></p>
                <p style="margin: 5px 0;"><strong>Cliente:</strong> ${ticket.cliente?.nombre || 'No especificado'}</p>
                ${tecnico ? `<p style="margin: 5px 0;"><strong>Técnico:</strong> ${tecnico}</p>` : ''}
            </div>

            <div style="background: #f0f8ff; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                <p style="margin: 0;"><strong>📝 Mensaje:</strong></p>
                <p style="margin: 5px 0 0 0; color: #333;">${mensaje}</p>
            </div>

            <div style="border-top: 1px solid #e0d8d0; padding-top: 15px; margin-top: 15px;">
                <p style="margin: 0; font-size: 13px; color: #777;">
                    <strong>📋 Detalles del servicio:</strong>
                </p>
                <p style="margin: 3px 0; font-size: 13px; color: #555;">
                    <strong>Tipo:</strong> ${ticket.tipo || 'No especificado'}
                </p>
                <p style="margin: 3px 0; font-size: 13px; color: #555;">
                    <strong>Zona:</strong> ${ticket.zona || 'No especificada'}
                </p>
                ${ticket.cliente?.direccion ? `
                <p style="margin: 3px 0; font-size: 13px; color: #555;">
                    <strong>Dirección:</strong> ${ticket.cliente.direccion}
                </p>
                ` : ''}
                ${ticket.descripcion ? `
                <p style="margin: 3px 0; font-size: 13px; color: #555;">
                    <strong>Descripción:</strong> ${ticket.descripcion}
                </p>
                ` : ''}
            </div>

            ${ticket.imagenUrl ? `
            <div style="margin-top: 15px; padding: 10px; background: #faf8f5; border-radius: 12px; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #777;">📸 Adjunto: <a href="${ticket.imagenUrl}" target="_blank" style="color: #e86000;">Ver imagen</a></p>
            </div>
            ` : ''}

            <div style="margin-top: 20px; padding: 15px; background: #faf8f5; border-radius: 12px; text-align: center;">
                <a href="https://ra2preportecnico.site.je/pagina-estado" style="display: inline-block; background: #e86000; color: #ffffff; padding: 12px 30px; border-radius: 30px; text-decoration: none; font-weight: 600;">
                    🔍 Consultar estado
                </a>
            </div>

            <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
                Este es un mensaje automático de RA2P. Por favor no respondas a este correo.
            </p>
        </div>

        <!-- Footer -->
        <div style="background: #f5ede5; padding: 15px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #777;">
                © ${new Date().getFullYear()} RA2P - Todos los derechos reservados
            </p>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #999;">
                Atención: Lun–Vie 8:00–17:00
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ============================================
  // ✅ NUEVA FUNCIÓN: NOTIFICACIÓN DE TICKET CREADO
  // ============================================
  async enviarNotificacionTicketCreado(ticket) {
    try {
      const emailCliente = ticket.cliente?.email;
      const nombreCliente = ticket.cliente?.nombre || 'Cliente';
      const ticketId = ticket.ticketId;

      // 1. Correo para el cliente
      if (emailCliente) {
        const htmlCliente = this.generarPlantillaTicket(
          ticket,
          'Nuevo',
          `✅ Tu ticket ha sido creado exitosamente. Nuestro equipo técnico lo atenderá a la brevedad.\n\n📋 Número de ticket: ${ticketId}\n📌 Estado: Nuevo`
        );

        await this.enviarCorreo({
          to: emailCliente,
          subject: `🎫 RA2P - Ticket Creado: ${ticketId}`,
          html: htmlCliente
        });
        console.log(`📧 Correo enviado al cliente: ${emailCliente}`);
      }

      // 2. Correo para el administrador
      const htmlAdmin = this.generarPlantillaTicket(
        ticket,
        'Nuevo',
        `🆕 Nuevo ticket creado por ${nombreCliente}\n\n📋 Ticket: ${ticketId}\n👤 Cliente: ${nombreCliente}\n📱 Teléfono: ${ticket.cliente?.telefono || 'No disponible'}\n📧 Email: ${emailCliente || 'No disponible'}\n📍 Dirección: ${ticket.cliente?.direccion || 'No disponible'}\n🔧 Tipo: ${ticket.tipo}\n📌 Zona: ${ticket.zona || 'No especificada'}`
      );

      await this.enviarCorreo({
        to: process.env.ADMIN_EMAIL || 'alejorodrigo7@gmail.com',
        subject: `🆕 Nuevo Ticket: ${ticketId} - ${nombreCliente}`,
        html: htmlAdmin
      });
      console.log(`📧 Correo enviado al administrador`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error enviando notificación de ticket creado:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // ✅ NUEVA FUNCIÓN: NOTIFICACIÓN DE TICKET TOMADO
  // ============================================
  async enviarNotificacionTicketTomado(ticket, tecnicoNombre) {
    try {
      const emailCliente = ticket.cliente?.email;
      const nombreCliente = ticket.cliente?.nombre || 'Cliente';

      // 1. Correo para el cliente
      if (emailCliente) {
        const htmlCliente = this.generarPlantillaTicket(
          ticket,
          'TOMADO',
          `👨‍🔧 Tu ticket ${ticket.ticketId} ha sido tomado por el técnico ${tecnicoNombre}.\n\nEl técnico se pondrá en contacto contigo para coordinar la atención.\n\n📋 Estado: TOMADO\n👤 Técnico: ${tecnicoNombre}`
        );

        await this.enviarCorreo({
          to: emailCliente,
          subject: `👨‍🔧 RA2P - Ticket Tomado: ${ticket.ticketId}`,
          html: htmlCliente
        });
        console.log(`📧 Correo enviado al cliente: ${emailCliente}`);
      }

      // 2. Correo para el administrador
      const htmlAdmin = this.generarPlantillaTicket(
        ticket,
        'TOMADO',
        `👨‍🔧 Ticket ${ticket.ticketId} ha sido tomado\n\n👤 Técnico asignado: ${tecnicoNombre}\n👤 Cliente: ${nombreCliente}\n📱 Teléfono: ${ticket.cliente?.telefono || 'No disponible'}`
      );

      await this.enviarCorreo({
        to: process.env.ADMIN_EMAIL || 'alejorodrigo7@gmail.com',
        subject: `👨‍🔧 Ticket Tomado: ${ticket.ticketId} - ${tecnicoNombre}`,
        html: htmlAdmin
      });
      console.log(`📧 Correo enviado al administrador`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error enviando notificación de ticket tomado:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // ✅ NUEVA FUNCIÓN: NOTIFICACIÓN DE CAMBIO DE ESTADO DE TICKET
  // ============================================
  async enviarNotificacionTicketEstado(ticket, estadoAnterior, estadoNuevo, observaciones, usuarioNombre) {
    try {
      const emailCliente = ticket.cliente?.email;
      const nombreCliente = ticket.cliente?.nombre || 'Cliente';
      const tecnicoNombre = ticket.tecnicoNombre || usuarioNombre || 'Sistema';

      // Mensajes según el estado
      const mensajes = {
        'En Progreso': `🔄 El técnico ${tecnicoNombre} ha iniciado la atención de tu ticket ${ticket.ticketId}.\n\n📌 Estado: En Progreso\n👤 Técnico: ${tecnicoNombre}\n📝 Observación: ${observaciones || 'Sin observaciones'}`,
        'Resuelto': `✅ Tu ticket ${ticket.ticketId} ha sido resuelto por ${tecnicoNombre}.\n\n📌 Estado: Resuelto\n🔧 Solución: ${ticket.solucion || 'Servicio completado'}\n📝 Observación: ${observaciones || 'Sin observaciones'}`,
        'Cerrado': `🔒 Tu ticket ${ticket.ticketId} ha sido cerrado.\n\n📌 Estado: Cerrado\n📝 Observación: ${observaciones || 'Ticket cerrado'}`,
        'TOMADO': `👨‍🔧 El técnico ${tecnicoNombre} ha tomado tu ticket ${ticket.ticketId}.\n\n📌 Estado: TOMADO\n👤 Técnico: ${tecnicoNombre}`
      };

      const mensaje = mensajes[estadoNuevo] || `📌 Estado cambiado a: ${estadoNuevo}\n📝 Observación: ${observaciones || 'Sin observaciones'}`;

      // 1. Correo para el cliente (si tiene email)
      if (emailCliente) {
        const htmlCliente = this.generarPlantillaTicket(
          ticket,
          estadoNuevo,
          mensaje
        );

        await this.enviarCorreo({
          to: emailCliente,
          subject: `📌 RA2P - Ticket ${ticket.ticketId} - ${estadoNuevo}`,
          html: htmlCliente
        });
        console.log(`📧 Correo enviado al cliente: ${emailCliente}`);
      }

      // 2. Correo para el administrador (excepto para estado Nuevo)
      if (estadoNuevo !== 'Nuevo') {
        const htmlAdmin = this.generarPlantillaTicket(
          ticket,
          estadoNuevo,
          `📌 Ticket ${ticket.ticketId} - Estado: ${estadoNuevo}\n\n👤 Cliente: ${nombreCliente}\n👤 Técnico: ${tecnicoNombre}\n📝 Observación: ${observaciones || 'Sin observaciones'}`
        );

        await this.enviarCorreo({
          to: process.env.ADMIN_EMAIL || 'alejorodrigo7@gmail.com',
          subject: `📌 Ticket ${ticket.ticketId} - ${estadoNuevo}`,
          html: htmlAdmin
        });
        console.log(`📧 Correo enviado al administrador`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error enviando notificación de cambio de estado:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // FUNCIONES EXISTENTES: Desconexión/Reconexión Ejecutada
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

    return this.enviarCorreo({
      to: [usuarioSolicitante.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

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

    return this.enviarCorreo({
      to: [usuarioSolicitante.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

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

    return this.enviarCorreo({
      to: [tecnico.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

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

    return this.enviarCorreo({
      to: [usuarioSolicitante.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

  async enviarNotificacionServicioRetroalimentado(servicio, usuarioSolicitante) {
    const asunto = `💬 SERVICIO RETROALIMENTADO - ${servicio.cliente}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Servicio Retroalimentado</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #6a1b9a; color: white; padding: 25px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px 25px; background: #ffffff; }
          .field { margin: 0 0 15px 0; padding: 12px 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #6a1b9a; }
          .field strong { color: #6a1b9a; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field span { font-size: 15px; color: #333; }
          .button { display: inline-block; padding: 12px 30px; background: #6a1b9a; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0 5px 0; font-weight: 600; }
          .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
          .footer .brand { font-weight: 600; color: #1a237e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Servicio Retroalimentado</h1>
          </div>
          <div class="content">
            <p><strong>Hola ${usuarioSolicitante.nombre},</strong></p>
            <p>El servicio ha sido <strong>retroalimentado</strong> correctamente:</p>
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
              <strong>Servicio</strong>
              <span>${servicio.nombreServicio || 'Sin descripción'}</span>
            </div>
            <div class="field">
              <strong>Retroalimentado por</strong>
              <span>${servicio.responsableRetroalimentacion || 'Sistema'}</span>
            </div>
            <div class="field">
              <strong>Observaciones</strong>
              <span>${servicio.observacionesRetroalimentacion || 'Sin observaciones'}</span>
            </div>
            <div style="text-align: center; margin: 20px 0 10px 0;">
              <p style="color: #6a1b9a; font-weight: 600;">💬 Servicio retroalimentado exitosamente</p>
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

    return this.enviarCorreo({
      to: [usuarioSolicitante.email],
      cc: [],
      subject: asunto,
      html: html
    });
  }

  async enviarResumenCaja(fecha, resumenHtml) {
    const asunto = `📊 Resumen de Caja - ${fecha}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resumen de Caja - ${fecha}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 700px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #6C5CE7; color: white; padding: 25px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0 0; opacity: 0.8; font-size: 14px; }
          .content { padding: 30px 25px; background: #ffffff; }
          .footer { padding: 20px 25px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; }
          .footer p { margin: 5px 0; color: #6c757d; font-size: 12px; }
          .footer .brand { font-weight: 600; color: #6C5CE7; }
          .resumen-caja { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .resumen-caja th { background: #6C5CE7; color: white; padding: 10px; text-align: left; font-size: 13px; }
          .resumen-caja td { padding: 10px; border-bottom: 1px solid #e9ecef; font-size: 14px; }
          .resumen-caja tr:hover td { background: #f8f9fa; }
          .total-general { font-size: 20px; font-weight: bold; color: #6C5CE7; text-align: center; padding: 15px; background: #f0edff; border-radius: 8px; margin-top: 15px; }
          .badge-cerrado { background: #00b894; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
          .badge-abierto { background: #fdcb6e; color: #2d3436; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
          .monto-positivo { color: #00b894; font-weight: 600; }
          .monto-negativo { color: #ff6b6b; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Resumen de Caja</h1>
            <p>${fecha}</p>
          </div>
          <div class="content">
            ${resumenHtml}
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

    return this.enviarCorreo({
      to: ['alejorodrigo7@gmail.com'],
      cc: [],
      subject: asunto,
      html: html
    });
  }
}

module.exports = new EmailService();