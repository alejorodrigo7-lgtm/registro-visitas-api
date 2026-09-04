const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    cliente: {
        nombre: { type: String, required: true },
        telefono: { type: String, default: '' },
        cedula: { type: String, default: '' },
        email: { type: String, default: '' },
        direccion: { type: String, default: '' }
    },
    tipo: {
        type: String,
        required: true,
        enum: ['Sin conexión', 'Velocidad lenta', 'Intermitencia', 'Problemas router', 'Otro']
    },
    zona: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    estado: {
        type: String,
        enum: ['Nuevo', 'Asignado', 'En Progreso', 'Resuelto', 'Cerrado'],
        default: 'Nuevo'
    },
    tecnicoAsignado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tecnicoNombre: { type: String, default: '' },
    imagenUrl: { type: String, default: '' },
    observaciones: { type: String, default: '' },
    solucion: { type: String, default: '' },
    origen: {
        type: String,
        enum: ['web', 'app'],
        default: 'web'
    },
    historial: [{
        estado: { type: String },
        observacion: { type: String },
        usuario: { type: String },
        fecha: { type: Date, default: Date.now }
    }],
    fechaCreacion: { type: Date, default: Date.now },
    fechaAsignacion: { type: Date },
    fechaInicio: { type: Date },
    fechaResolucion: { type: Date },
    fechaCierre: { type: Date },
    ultimaActualizacion: { type: Date, default: Date.now }
}, {
    timestamps: true
});

ticketSchema.pre('save', function(next) {
    this.ultimaActualizacion = new Date();
    next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
