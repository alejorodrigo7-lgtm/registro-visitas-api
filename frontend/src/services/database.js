import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

let db;

// ============================================
// 🗄️ INICIALIZAR BASE DE DATOS
// ============================================
export const initDatabase = async () => {
  try {
    const isFirstTime = await AsyncStorage.getItem('@db_initialized');
    
    db = await SQLite.openDatabaseAsync('registro_visitas.db');
    
    if (!isFirstTime) {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        -- ============================================
        -- 📋 VISITAS
        -- ============================================
        CREATE TABLE IF NOT EXISTS visitas_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente TEXT NOT NULL,
          identificador TEXT NOT NULL,
          barrio TEXT NOT NULL,
          direccion TEXT NOT NULL,
          telefono TEXT NOT NULL,
          tipo TEXT NOT NULL,
          monto REAL DEFAULT 0,
          observaciones TEXT NOT NULL,
          foto TEXT,
          tecnico TEXT NOT NULL,
          tecnicoNombre TEXT NOT NULL,
          ubicacion_lat REAL,
          ubicacion_lng REAL,
          ubicacion_address TEXT,
          fecha_creacion TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0,
          intentos INTEGER DEFAULT 0,
          error TEXT
        );
        
        -- ============================================
        -- 💰 TRANSFERENCIAS
        -- ============================================
        CREATE TABLE IF NOT EXISTS transferencias_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente TEXT NOT NULL,
          identificador TEXT NOT NULL,
          barrio TEXT NOT NULL,
          direccion TEXT NOT NULL,
          telefono TEXT NOT NULL,
          monto REAL NOT NULL,
          metodo TEXT NOT NULL,
          banco TEXT,
          numero_cuenta TEXT,
          titular TEXT,
          observaciones TEXT,
          foto_comprobante TEXT,
          tecnico TEXT NOT NULL,
          tecnicoNombre TEXT NOT NULL,
          ubicacion_lat REAL,
          ubicacion_lng REAL,
          ubicacion_address TEXT,
          fecha_creacion TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0,
          intentos INTEGER DEFAULT 0,
          error TEXT
        );
        
        -- ============================================
        -- 🛠️ SERVICIOS
        -- ============================================
        CREATE TABLE IF NOT EXISTS servicios_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente TEXT NOT NULL,
          identificador TEXT NOT NULL,
          barrio TEXT NOT NULL,
          direccion TEXT NOT NULL,
          telefono TEXT NOT NULL,
          tipo_servicio TEXT NOT NULL,
          descripcion TEXT NOT NULL,
          materiales TEXT,
          tiempo_estimado INTEGER,
          prioridad TEXT DEFAULT 'Normal',
          tecnico TEXT NOT NULL,
          tecnicoNombre TEXT NOT NULL,
          ubicacion_lat REAL,
          ubicacion_lng REAL,
          ubicacion_address TEXT,
          fecha_creacion TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0,
          intentos INTEGER DEFAULT 0,
          error TEXT
        );
        
        -- ============================================
        -- 💰 CAJAS
        -- ============================================
        CREATE TABLE IF NOT EXISTS cajas_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT NOT NULL,
          monto REAL NOT NULL,
          descripcion TEXT NOT NULL,
          categoria TEXT NOT NULL,
          metodo TEXT NOT NULL,
          referencia TEXT,
          tecnico TEXT NOT NULL,
          tecnicoNombre TEXT NOT NULL,
          ubicacion_lat REAL,
          ubicacion_lng REAL,
          ubicacion_address TEXT,
          fecha_creacion TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0,
          intentos INTEGER DEFAULT 0,
          error TEXT
        );
        
        -- ============================================
        -- 🏪 BODEGAS
        -- ============================================
        CREATE TABLE IF NOT EXISTS bodegas_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          ubicacion TEXT NOT NULL,
          responsable TEXT NOT NULL,
          telefono TEXT NOT NULL,
          tipo TEXT NOT NULL,
          capacidad TEXT,
          observaciones TEXT,
          tecnico TEXT NOT NULL,
          tecnicoNombre TEXT NOT NULL,
          ubicacion_lat REAL,
          ubicacion_lng REAL,
          ubicacion_address TEXT,
          fecha_creacion TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0,
          intentos INTEGER DEFAULT 0,
          error TEXT
        );
        
        -- ============================================
        -- 📋 HORARIOS
        -- ============================================
        CREATE TABLE IF NOT EXISTS horarios_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tecnico TEXT NOT NULL,
          tecnicoNombre TEXT NOT NULL,
          dia_semana TEXT NOT NULL,
          hora_inicio TEXT NOT NULL,
          hora_fin TEXT NOT NULL,
          tipo TEXT DEFAULT 'Normal',
          ubicacion TEXT,
          observaciones TEXT,
          fecha_creacion TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0,
          intentos INTEGER DEFAULT 0,
          error TEXT
        );
        
        -- ============================================
        -- 👥 USUARIOS (CACHE)
        -- ============================================
        CREATE TABLE IF NOT EXISTS usuarios_cache (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          email TEXT NOT NULL,
          rol TEXT NOT NULL,
          telefono TEXT,
          fecha_actualizacion TEXT NOT NULL
        );
        
        -- ============================================
        -- 📋 CLIENTES (CACHE)
        -- ============================================
        CREATE TABLE IF NOT EXISTS clientes_cache (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          identificador TEXT NOT NULL,
          barrio TEXT NOT NULL,
          direccion TEXT NOT NULL,
          telefono TEXT NOT NULL,
          fecha_actualizacion TEXT NOT NULL
        );
        
        -- ============================================
        -- ÍNDICES
        -- ============================================
        CREATE INDEX IF NOT EXISTS idx_visitas_sincronizado ON visitas_pendientes(sincronizado);
        CREATE INDEX IF NOT EXISTS idx_transferencias_sincronizado ON transferencias_pendientes(sincronizado);
        CREATE INDEX IF NOT EXISTS idx_servicios_sincronizado ON servicios_pendientes(sincronizado);
        CREATE INDEX IF NOT EXISTS idx_cajas_sincronizado ON cajas_pendientes(sincronizado);
        CREATE INDEX IF NOT EXISTS idx_bodegas_sincronizado ON bodegas_pendientes(sincronizado);
        CREATE INDEX IF NOT EXISTS idx_horarios_sincronizado ON horarios_pendientes(sincronizado);
      `);
      
      await AsyncStorage.setItem('@db_initialized', 'true');
      console.log('✅ Base de datos local inicializada');
    }
    
    return db;
  } catch (error) {
    console.error('❌ Error al inicializar BD:', error);
    throw error;
  }
};

// ============================================
// 📋 GUARDAR VISITA OFFLINE
// ============================================
export const guardarVisitaOffline = async (data) => {
  try {
    if (!db) await initDatabase();
    
    const {
      cliente, identificador, barrio, direccion, telefono, tipo, monto,
      observaciones, foto, tecnico, tecnicoNombre, ubicacion,
    } = data;
    
    const result = await db.runAsync(`
      INSERT INTO visitas_pendientes (
        cliente, identificador, barrio, direccion, telefono, tipo, monto,
        observaciones, foto, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      cliente, identificador, barrio, direccion, telefono, tipo, monto || 0,
      observaciones, foto || null, tecnico, tecnicoNombre || 'Usuario',
      ubicacion?.latitude || null, ubicacion?.longitude || null, ubicacion?.address || null,
      new Date().toISOString(),
    ]);
    
    console.log(`✅ Visita guardada offline ID: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error('❌ Error guardando visita offline:', error);
    throw error;
  }
};

// ============================================
// 💰 GUARDAR TRANSFERENCIA OFFLINE
// ============================================
export const guardarTransferenciaOffline = async (data) => {
  try {
    if (!db) await initDatabase();
    
    const {
      cliente, identificador, barrio, direccion, telefono, monto,
      metodo, banco, numero_cuenta, titular, observaciones,
      foto_comprobante, tecnico, tecnicoNombre, ubicacion,
    } = data;
    
    const result = await db.runAsync(`
      INSERT INTO transferencias_pendientes (
        cliente, identificador, barrio, direccion, telefono, monto,
        metodo, banco, numero_cuenta, titular, observaciones,
        foto_comprobante, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      cliente, identificador, barrio, direccion, telefono, monto,
      metodo, banco || null, numero_cuenta || null, titular || null,
      observaciones || '', foto_comprobante || null,
      tecnico, tecnicoNombre || 'Usuario',
      ubicacion?.latitude || null, ubicacion?.longitude || null, ubicacion?.address || null,
      new Date().toISOString(),
    ]);
    
    console.log(`✅ Transferencia guardada offline ID: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error('❌ Error guardando transferencia offline:', error);
    throw error;
  }
};

// ============================================
// 🛠️ GUARDAR SERVICIO OFFLINE
// ============================================
export const guardarServicioOffline = async (data) => {
  try {
    if (!db) await initDatabase();
    
    const {
      cliente, identificador, barrio, direccion, telefono,
      tipo_servicio, descripcion, materiales, tiempo_estimado,
      prioridad, tecnico, tecnicoNombre, ubicacion,
    } = data;
    
    const result = await db.runAsync(`
      INSERT INTO servicios_pendientes (
        cliente, identificador, barrio, direccion, telefono,
        tipo_servicio, descripcion, materiales, tiempo_estimado,
        prioridad, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      cliente, identificador, barrio, direccion, telefono,
      tipo_servicio, descripcion, materiales || '', tiempo_estimado || 0,
      prioridad || 'Normal', tecnico, tecnicoNombre || 'Usuario',
      ubicacion?.latitude || null, ubicacion?.longitude || null, ubicacion?.address || null,
      new Date().toISOString(),
    ]);
    
    console.log(`✅ Servicio guardado offline ID: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error('❌ Error guardando servicio offline:', error);
    throw error;
  }
};

// ============================================
// 💰 GUARDAR CAJA OFFLINE
// ============================================
export const guardarCajaOffline = async (data) => {
  try {
    if (!db) await initDatabase();
    
    const {
      tipo, monto, descripcion, categoria, metodo,
      referencia, tecnico, tecnicoNombre, ubicacion,
    } = data;
    
    const result = await db.runAsync(`
      INSERT INTO cajas_pendientes (
        tipo, monto, descripcion, categoria, metodo,
        referencia, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      tipo, monto, descripcion, categoria, metodo,
      referencia || null, tecnico, tecnicoNombre || 'Usuario',
      ubicacion?.latitude || null, ubicacion?.longitude || null, ubicacion?.address || null,
      new Date().toISOString(),
    ]);
    
    console.log(`✅ Caja guardada offline ID: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error('❌ Error guardando caja offline:', error);
    throw error;
  }
};

// ============================================
// 🏪 GUARDAR BODEGA OFFLINE
// ============================================
export const guardarBodegaOffline = async (data) => {
  try {
    if (!db) await initDatabase();
    
    const {
      nombre, ubicacion, responsable, telefono, tipo,
      capacidad, observaciones, tecnico, tecnicoNombre, ubicacion_data,
    } = data;
    
    const result = await db.runAsync(`
      INSERT INTO bodegas_pendientes (
        nombre, ubicacion, responsable, telefono, tipo,
        capacidad, observaciones, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      nombre, ubicacion, responsable, telefono, tipo,
      capacidad || '', observaciones || '', tecnico, tecnicoNombre || 'Usuario',
      ubicacion_data?.latitude || null, ubicacion_data?.longitude || null, ubicacion_data?.address || null,
      new Date().toISOString(),
    ]);
    
    console.log(`✅ Bodega guardada offline ID: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error('❌ Error guardando bodega offline:', error);
    throw error;
  }
};

// ============================================
// 📋 GUARDAR HORARIO OFFLINE
// ============================================
export const guardarHorarioOffline = async (data) => {
  try {
    if (!db) await initDatabase();
    
    const {
      tecnico, tecnicoNombre, dia_semana, hora_inicio,
      hora_fin, tipo, ubicacion, observaciones,
    } = data;
    
    const result = await db.runAsync(`
      INSERT INTO horarios_pendientes (
        tecnico, tecnicoNombre, dia_semana, hora_inicio,
        hora_fin, tipo, ubicacion, observaciones,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      tecnico, tecnicoNombre, dia_semana, hora_inicio,
      hora_fin, tipo || 'Normal', ubicacion || '', observaciones || '',
      new Date().toISOString(),
    ]);
    
    console.log(`✅ Horario guardado offline ID: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error('❌ Error guardando horario offline:', error);
    throw error;
  }
};

// ============================================
// 📊 OBTENER TODAS LAS PENDIENTES
// ============================================
export const getTodasPendientes = async () => {
  try {
    if (!db) await initDatabase();
    
    const visitas = await db.getAllAsync(
      'SELECT *, "visita" as modulo FROM visitas_pendientes WHERE sincronizado = 0'
    );
    const transferencias = await db.getAllAsync(
      'SELECT *, "transferencia" as modulo FROM transferencias_pendientes WHERE sincronizado = 0'
    );
    const servicios = await db.getAllAsync(
      'SELECT *, "servicio" as modulo FROM servicios_pendientes WHERE sincronizado = 0'
    );
    const cajas = await db.getAllAsync(
      'SELECT *, "caja" as modulo FROM cajas_pendientes WHERE sincronizado = 0'
    );
    const bodegas = await db.getAllAsync(
      'SELECT *, "bodega" as modulo FROM bodegas_pendientes WHERE sincronizado = 0'
    );
    const horarios = await db.getAllAsync(
      'SELECT *, "horario" as modulo FROM horarios_pendientes WHERE sincronizado = 0'
    );
    
    return {
      visitas,
      transferencias,
      servicios,
      cajas,
      bodegas,
      horarios,
      total: visitas.length + transferencias.length + servicios.length + 
              cajas.length + bodegas.length + horarios.length,
    };
  } catch (error) {
    console.error('❌ Error obteniendo pendientes:', error);
    return { visitas: [], transferencias: [], servicios: [], cajas: [], bodegas: [], horarios: [], total: 0 };
  }
};

// ============================================
// 🔄 SINCRONIZAR TODOS LOS MÓDULOS
// ============================================
export const sincronizarTodos = async (api) => {
  try {
    const pendientes = await getTodasPendientes();
    const total = pendientes.total;
    
    if (total === 0) {
      console.log('✅ No hay datos pendientes');
      return { success: true, sincronizados: 0, total: 0 };
    }
    
    console.log(`🔄 Sincronizando ${total} elementos...`);
    
    let sincronizados = 0;
    let errores = 0;
    const resultados = [];
    
    // ============================================
    // 📋 Sincronizar Visitas
    // ============================================
    for (const item of pendientes.visitas) {
      try {
        const data = {
          cliente: item.cliente,
          identificador: item.identificador,
          barrio: item.barrio,
          direccion: item.direccion,
          telefono: item.telefono,
          tipo: item.tipo,
          monto: item.monto || 0,
          observaciones: item.observaciones,
          foto: item.foto || '',
          tecnico: item.tecnico,
          ubicacion: {
            latitude: item.ubicacion_lat,
            longitude: item.ubicacion_lng,
            address: item.ubicacion_address,
          },
          offline: true,
        };
        
        const response = await api.post('/visitas', data);
        if (response.data.success) {
          await db.runAsync(
            'UPDATE visitas_pendientes SET sincronizado = 1 WHERE id = ?',
            [item.id]
          );
          sincronizados++;
          resultados.push({ id: item.id, modulo: 'visita', status: 'ok' });
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE visitas_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
        resultados.push({ id: item.id, modulo: 'visita', status: 'error', error: error.message });
      }
    }
    
    // ============================================
    // 💰 Sincronizar Transferencias
    // ============================================
    for (const item of pendientes.transferencias) {
      try {
        const data = {
          cliente: item.cliente,
          identificador: item.identificador,
          barrio: item.barrio,
          direccion: item.direccion,
          telefono: item.telefono,
          monto: item.monto,
          metodo: item.metodo,
          banco: item.banco,
          numero_cuenta: item.numero_cuenta,
          titular: item.titular,
          observaciones: item.observaciones,
          foto_comprobante: item.foto_comprobante || '',
          tecnico: item.tecnico,
          ubicacion: {
            latitude: item.ubicacion_lat,
            longitude: item.ubicacion_lng,
            address: item.ubicacion_address,
          },
          offline: true,
        };
        
        const response = await api.post('/transferencias', data);
        if (response.data.success) {
          await db.runAsync(
            'UPDATE transferencias_pendientes SET sincronizado = 1 WHERE id = ?',
            [item.id]
          );
          sincronizados++;
          resultados.push({ id: item.id, modulo: 'transferencia', status: 'ok' });
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE transferencias_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
        resultados.push({ id: item.id, modulo: 'transferencia', status: 'error', error: error.message });
      }
    }
    
    // ============================================
    // 🛠️ Sincronizar Servicios
    // ============================================
    for (const item of pendientes.servicios) {
      try {
        const data = {
          cliente: item.cliente,
          identificador: item.identificador,
          barrio: item.barrio,
          direccion: item.direccion,
          telefono: item.telefono,
          tipo_servicio: item.tipo_servicio,
          descripcion: item.descripcion,
          materiales: item.materiales,
          tiempo_estimado: item.tiempo_estimado,
          prioridad: item.prioridad,
          tecnico: item.tecnico,
          ubicacion: {
            latitude: item.ubicacion_lat,
            longitude: item.ubicacion_lng,
            address: item.ubicacion_address,
          },
          offline: true,
        };
        
        const response = await api.post('/servicios', data);
        if (response.data.success) {
          await db.runAsync(
            'UPDATE servicios_pendientes SET sincronizado = 1 WHERE id = ?',
            [item.id]
          );
          sincronizados++;
          resultados.push({ id: item.id, modulo: 'servicio', status: 'ok' });
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE servicios_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
        resultados.push({ id: item.id, modulo: 'servicio', status: 'error', error: error.message });
      }
    }
    
    // ============================================
    // 💰 Sincronizar Cajas
    // ============================================
    for (const item of pendientes.cajas) {
      try {
        const data = {
          tipo: item.tipo,
          monto: item.monto,
          descripcion: item.descripcion,
          categoria: item.categoria,
          metodo: item.metodo,
          referencia: item.referencia,
          tecnico: item.tecnico,
          ubicacion: {
            latitude: item.ubicacion_lat,
            longitude: item.ubicacion_lng,
            address: item.ubicacion_address,
          },
          offline: true,
        };
        
        const response = await api.post('/cajas', data);
        if (response.data.success) {
          await db.runAsync(
            'UPDATE cajas_pendientes SET sincronizado = 1 WHERE id = ?',
            [item.id]
          );
          sincronizados++;
          resultados.push({ id: item.id, modulo: 'caja', status: 'ok' });
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE cajas_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
        resultados.push({ id: item.id, modulo: 'caja', status: 'error', error: error.message });
      }
    }
    
    // ============================================
    // 🏪 Sincronizar Bodegas
    // ============================================
    for (const item of pendientes.bodegas) {
      try {
        const data = {
          nombre: item.nombre,
          ubicacion: item.ubicacion,
          responsable: item.responsable,
          telefono: item.telefono,
          tipo: item.tipo,
          capacidad: item.capacidad,
          observaciones: item.observaciones,
          tecnico: item.tecnico,
          ubicacion_data: {
            latitude: item.ubicacion_lat,
            longitude: item.ubicacion_lng,
            address: item.ubicacion_address,
          },
          offline: true,
        };
        
        const response = await api.post('/bodegas', data);
        if (response.data.success) {
          await db.runAsync(
            'UPDATE bodegas_pendientes SET sincronizado = 1 WHERE id = ?',
            [item.id]
          );
          sincronizados++;
          resultados.push({ id: item.id, modulo: 'bodega', status: 'ok' });
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE bodegas_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
        resultados.push({ id: item.id, modulo: 'bodega', status: 'error', error: error.message });
      }
    }
    
    // ============================================
    // 📋 Sincronizar Horarios
    // ============================================
    for (const item of pendientes.horarios) {
      try {
        const data = {
          tecnico: item.tecnico,
          tecnicoNombre: item.tecnicoNombre,
          dia_semana: item.dia_semana,
          hora_inicio: item.hora_inicio,
          hora_fin: item.hora_fin,
          tipo: item.tipo,
          ubicacion: item.ubicacion,
          observaciones: item.observaciones,
          offline: true,
        };
        
        const response = await api.post('/horarios', data);
        if (response.data.success) {
          await db.runAsync(
            'UPDATE horarios_pendientes SET sincronizado = 1 WHERE id = ?',
            [item.id]
          );
          sincronizados++;
          resultados.push({ id: item.id, modulo: 'horario', status: 'ok' });
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE horarios_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
        resultados.push({ id: item.id, modulo: 'horario', status: 'error', error: error.message });
      }
    }
    
    console.log(`📊 Sincronización completada: ${sincronizados} exitosos, ${errores} errores`);
    return { success: true, sincronizados, errores, total, resultados };
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📊 CONTAR PENDIENTES POR MÓDULO
// ============================================
export const contarPendientes = async () => {
  try {
    if (!db) await initDatabase();
    
    const visitas = await db.getFirstAsync('SELECT COUNT(*) as total FROM visitas_pendientes WHERE sincronizado = 0');
    const transferencias = await db.getFirstAsync('SELECT COUNT(*) as total FROM transferencias_pendientes WHERE sincronizado = 0');
    const servicios = await db.getFirstAsync('SELECT COUNT(*) as total FROM servicios_pendientes WHERE sincronizado = 0');
    const cajas = await db.getFirstAsync('SELECT COUNT(*) as total FROM cajas_pendientes WHERE sincronizado = 0');
    const bodegas = await db.getFirstAsync('SELECT COUNT(*) as total FROM bodegas_pendientes WHERE sincronizado = 0');
    const horarios = await db.getFirstAsync('SELECT COUNT(*) as total FROM horarios_pendientes WHERE sincronizado = 0');
    
    return {
      visitas: visitas?.total || 0,
      transferencias: transferencias?.total || 0,
      servicios: servicios?.total || 0,
      cajas: cajas?.total || 0,
      bodegas: bodegas?.total || 0,
      horarios: horarios?.total || 0,
      total: (visitas?.total || 0) + (transferencias?.total || 0) + (servicios?.total || 0) +
             (cajas?.total || 0) + (bodegas?.total || 0) + (horarios?.total || 0),
    };
  } catch (error) {
    console.error('❌ Error contando pendientes:', error);
    return { visitas: 0, transferencias: 0, servicios: 0, cajas: 0, bodegas: 0, horarios: 0, total: 0 };
  }
};

// ============================================
// 📋 CACHE DE USUARIOS
// ============================================
export const guardarUsuariosCache = async (usuarios) => {
  try {
    if (!db) await initDatabase();
    
    for (const user of usuarios) {
      await db.runAsync(`
        INSERT OR REPLACE INTO usuarios_cache (id, nombre, email, rol, telefono, fecha_actualizacion)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        user._id || user.id,
        user.nombre,
        user.email,
        user.rol,
        user.telefono || '',
        new Date().toISOString(),
      ]);
    }
    console.log(`✅ ${usuarios.length} usuarios guardados en caché`);
  } catch (error) {
    console.error('❌ Error guardando usuarios caché:', error);
  }
};

export const getUsuariosCache = async () => {
  try {
    if (!db) await initDatabase();
    return await db.getAllAsync('SELECT * FROM usuarios_cache ORDER BY nombre ASC');
  } catch (error) {
    console.error('❌ Error obteniendo usuarios caché:', error);
    return [];
  }
};

// ============================================
// 📋 CACHE DE CLIENTES
// ============================================
export const guardarClientesCache = async (clientes) => {
  try {
    if (!db) await initDatabase();
    
    for (const cliente of clientes) {
      await db.runAsync(`
        INSERT OR REPLACE INTO clientes_cache (id, nombre, identificador, barrio, direccion, telefono, fecha_actualizacion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        cliente._id || cliente.id,
        cliente.nombre,
        cliente.identificador,
        cliente.barrio,
        cliente.direccion,
        cliente.telefono,
        new Date().toISOString(),
      ]);
    }
    console.log(`✅ ${clientes.length} clientes guardados en caché`);
  } catch (error) {
    console.error('❌ Error guardando clientes caché:', error);
  }
};

export const getClientesCache = async () => {
  try {
    if (!db) await initDatabase();
    return await db.getAllAsync('SELECT * FROM clientes_cache ORDER BY nombre ASC');
  } catch (error) {
    console.error('❌ Error obteniendo clientes caché:', error);
    return [];
  }
};

export const buscarClienteCache = async (identificador) => {
  try {
    if (!db) await initDatabase();
    return await db.getFirstAsync(
      'SELECT * FROM clientes_cache WHERE identificador = ?',
      [identificador]
    );
  } catch (error) {
    console.error('❌ Error buscando cliente en caché:', error);
    return null;
  }
};

// ============================================
// 🗑️ LIMPIAR DATOS SINCRONIZADOS
// ============================================
export const limpiarSincronizados = async () => {
  try {
    if (!db) await initDatabase();
    
    await db.runAsync('DELETE FROM visitas_pendientes WHERE sincronizado = 1');
    await db.runAsync('DELETE FROM transferencias_pendientes WHERE sincronizado = 1');
    await db.runAsync('DELETE FROM servicios_pendientes WHERE sincronizado = 1');
    await db.runAsync('DELETE FROM cajas_pendientes WHERE sincronizado = 1');
    await db.runAsync('DELETE FROM bodegas_pendientes WHERE sincronizado = 1');
    await db.runAsync('DELETE FROM horarios_pendientes WHERE sincronizado = 1');
    
    console.log('🗑️ Datos sincronizados eliminados');
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
  }
};

export default {
  initDatabase,
  guardarVisitaOffline,
  guardarTransferenciaOffline,
  guardarServicioOffline,
  guardarCajaOffline,
  guardarBodegaOffline,
  guardarHorarioOffline,
  getTodasPendientes,
  sincronizarTodos,
  contarPendientes,
  guardarUsuariosCache,
  getUsuariosCache,
  guardarClientesCache,
  getClientesCache,
  buscarClienteCache,
  limpiarSincronizados,
};