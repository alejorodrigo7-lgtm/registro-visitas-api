const ReciboImpresion = require('../models/ReciboImpresion');
const Cliente = require('../models/Cliente');
const User = require('../models/User');

const generarNumeroRC = async () => {
  let intentos = 0;
  while (intentos < 20) {
    const numero = Math.floor(1000000 + Math.random() * 9000000).toString();
    const existe = await ReciboImpresion.findOne({ numeroRC: numero });
    if (!existe) return numero;
    intentos++;
  }
  throw new Error('No se pudo generar un numero RC unico.');
};

const formatearFecha = (fecha) => {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return dia + '/' + mes + '/' + anio;
};

const construirHTMLRecibo = (recibo) => {
  const fechaStr = formatearFecha(recibo.fecha);
  const productosHTML = recibo.productos.map(p =>
    '<tr><td class="prod">' + p.tipo + ' ' + p.codigo + '</td><td class="val">$ ' + p.valor.toFixed(2) + '</td></tr>'
  ).join('');
  const rolTexto = recibo.digitadorRol === 'Coordinador' ? 'COOR' : recibo.digitadorRol.toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 80mm; padding: 4mm 3mm; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 3px 0; }
  .sep-double { border-top: 2px solid #000; margin: 3px 0; }
  .row { display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  td.prod { text-align: left; }
  td.val { text-align: right; white-space: nowrap; }
  .small { font-size: 9px; }
  .total { font-size: 12px; font-weight: bold; }
  .mt { margin-top: 4px; }
  .mb { margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="center bold">TELECOMUNICACIONES LA RED S.A.</div>
  <div class="center">RUC. 1792554136001</div>
  <div class="center">Regimen Simplificado</div>
  <div class="center bold mt">C - QUITO ${recibo.numeroRC}</div>
  <div class="center small mt">:: COPIA DE DOCUMENTO ::</div>
  <div class="center small">Impreso por: ${recibo.digitadorNombre.toUpperCase()} - JDZ</div>
  <div class="sep-double mt"></div>
  <div class="bold">RC COORDINADOR Nro. ${recibo.numeroRC}</div>
  <div>Fecha: ${fechaStr}</div>
  <div class="sep-double"></div>
  <div class="center bold mb">--- RECIBO DE CAJA ECUADOR ---</div>
  <div><span class="bold">Cliente:</span> ${recibo.clienteNombre.toUpperCase()}</div>
  <div><span class="bold">C (CEDULA):</span> # ${recibo.clienteCedula}</div>
  <div>${recibo.clienteDireccion ? recibo.clienteDireccion.toUpperCase() : ''}</div>
  <div class="sep"></div>
  <div class="row bold"><span>Producto</span><span>Valor</span></div>
  <div class="sep"></div>
  <table>${productosHTML}</table>
  <div class="sep"></div>
  <table>
    <tr><td class="prod bold">SUBTOTAL:</td><td class="val bold">$ ${recibo.subtotal.toFixed(2)}</td></tr>
    <tr><td class="prod total">TOTAL A PAGAR:</td><td class="val total">$ ${recibo.total.toFixed(2)}</td></tr>
  </table>
  <div class="sep"></div>
  <div>Forma Pago: ${recibo.formaPago}</div>
  <div class="sep"></div>
  <div>Digitador: ${recibo.digitadorNombre.toUpperCase()} - ${rolTexto}</div>
  <div class="sep-double mt"></div>
  <div class="center small mt">Revise su factura en este link:</div>
  <div class="center small">https://cableunion.comprobantes-electronicos.com</div>
</body>
</html>`;
};

exports.generar = async (req, res) => {
  try {
    const { cedula, clienteNombre, clienteDireccion, fecha, productos, formaPago } = req.body;
    if (!cedula || !clienteNombre || !fecha || !productos || productos.length === 0) {
      return res.status(400).json({ success: false, message: 'Faltan campos: cedula, clienteNombre, fecha y al menos un producto' });
    }
    for (const p of productos) {
      if (!p.tipo || !p.codigo || typeof p.valor !== 'number') {
        return res.status(400).json({ success: false, message: 'Cada producto debe tener tipo, codigo y valor numerico' });
      }
    }
    const digitador = await User.findById(req.user._id);
    if (!digitador) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const subtotal = productos.reduce((sum, p) => sum + Number(p.valor), 0);
    const total = subtotal;
    const numeroRC = await generarNumeroRC();

    const recibo = new ReciboImpresion({
      numeroRC,
      clienteNombre: clienteNombre.trim(),
      clienteCedula: cedula.trim(),
      clienteDireccion: (clienteDireccion || '').trim(),
      fecha: new Date(fecha),
      productos,
      subtotal,
      total,
      formaPago: formaPago || 'EFECTIVO COBRADOR',
      digitadorUsuarioId: digitador._id,
      digitadorNombre: digitador.nombre || digitador.email,
      digitadorRol: digitador.rol,
    });
    await recibo.save();

    try {
      const cliente = await Cliente.findOne({ identificador: cedula.trim() });
      if (cliente) {
        cliente.productos = productos.map(p => ({ tipo: p.tipo, codigo: p.codigo, valor: p.valor }));
        await cliente.save();
      }
    } catch (err) {
      console.error('Aviso: no se pudieron guardar productos en el cliente:', err.message);
    }

    const html = construirHTMLRecibo(recibo);
    res.status(201).json({ success: true, message: 'Recibo generado correctamente', data: { recibo, html } });
  } catch (error) {
    console.error('Error generando recibo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reimprimir = async (req, res) => {
  try {
    const { id } = req.params;
    const recibo = await ReciboImpresion.findById(id);
    if (!recibo) return res.status(404).json({ success: false, message: 'Recibo no encontrado' });
    const html = construirHTMLRecibo(recibo);
    res.json({ success: true, data: { recibo, html } });
  } catch (error) {
    console.error('Error reimprimiendo recibo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.buscarClientePorCedula = async (req, res) => {
  try {
    const { cedula } = req.params;
    if (!cedula) return res.status(400).json({ success: false, message: 'Cedula requerida' });
    const cliente = await Cliente.findOne({ identificador: cedula.trim() });
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado. Podes completar los datos manualmente.' });
    }
    res.json({
      success: true,
      data: {
        nombre: cliente.nombre,
        cedula: cliente.identificador,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        productos: cliente.productos || [],
      },
    });
  } catch (error) {
    console.error('Error buscando cliente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const { cedula, limit = 50 } = req.query;
    const filtro = {};
    if (cedula) filtro.clienteCedula = cedula.trim();
    const recibos = await ReciboImpresion.find(filtro).sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ success: true, count: recibos.length, data: recibos });
  } catch (error) {
    console.error('Error listando recibos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};