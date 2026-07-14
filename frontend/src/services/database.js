import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

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
        CREATE INDEX IF NOT EXISTS idx_clientes_identificador ON clientes_cache(identificador);
        CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes_cache(nombre);
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
    
    const result = await db.runAsync(
      `INSERT INTO visitas_pendientes (
        cliente, identificador, barrio, direccion, telefono, tipo, monto,
        observaciones, foto, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        cliente, identificador, barrio, direccion, telefono, tipo, monto || 0,
        observaciones, foto || null, tecnico, tecnicoNombre || 'Usuario',
        ubicacion?.latitude || null, ubicacion?.longitude || null, ubicacion?.address || null,
        new Date().toISOString(),
      ]
    );
    
    console.log(`✅ Visita guardada offline ID: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error('❌ Error guardando visita offline:', error);
    throw error;
  }
};

// ============================================
// 📋 CACHE DE CLIENTES - GUARDAR
// ============================================
export const guardarClientesCache = async (clientes) => {
  try {
    if (!db) await initDatabase();
    
    for (const cliente of clientes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO clientes_cache 
        (id, nombre, identificador, barrio, direccion, telefono, fecha_actualizacion)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          cliente._id || cliente.id,
          cliente.nombre || '',
          cliente.identificador || '',
          cliente.barrio || '',
          cliente.direccion || '',
          cliente.telefono || '',
          new Date().toISOString(),
        ]
      );
    }
    console.log(`✅ ${clientes.length} clientes guardados en caché`);
  } catch (error) {
    console.error('❌ Error guardando clientes caché:', error);
  }
};

// ============================================
// 📋 CACHE DE CLIENTES - OBTENER TODOS
// ============================================
export const getClientesCache = async () => {
  try {
    if (!db) await initDatabase();
    const result = await db.getAllAsync('SELECT * FROM clientes_cache ORDER BY nombre ASC');
    return result;
  } catch (error) {
    console.error('❌ Error obteniendo clientes caché:', error);
    return [];
  }
};

// ============================================
// 📋 CACHE DE CLIENTES - CONTAR
// ============================================
export const contarClientesCache = async () => {
  try {
    if (!db) await initDatabase();
    const result = await db.getFirstAsync('SELECT COUNT(*) as total FROM clientes_cache');
    return result?.total || 0;
  } catch (error) {
    console.error('❌ Error contando clientes caché:', error);
    return 0;
  }
};

// ============================================
// 📋 CACHE DE CLIENTES - BUSCAR POR IDENTIFICADOR
// ============================================
export const buscarClienteCache = async (identificador) => {
  try {
    if (!db) await initDatabase();
    // Búsqueda exacta
    let result = await db.getFirstAsync(
      'SELECT * FROM clientes_cache WHERE identificador = ?',
      [identificador]
    );
    
    // Si no hay resultado, búsqueda parcial
    if (!result) {
      const resultados = await db.getAllAsync(
        `SELECT * FROM clientes_cache 
         WHERE identificador LIKE ? OR nombre LIKE ? 
         ORDER BY nombre ASC LIMIT 1`,
        [`%${identificador}%`, `%${identificador}%`]
      );
      if (resultados.length > 0) {
        result = resultados[0];
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error buscando cliente en caché:', error);
    return null;
  }
};

// ============================================
// 📋 CACHE DE CLIENTES - BUSCAR POR NOMBRE
// ============================================
export const buscarClientesPorNombreCache = async (texto) => {
  try {
    if (!db) await initDatabase();
    const result = await db.getAllAsync(
      `SELECT * FROM clientes_cache 
       WHERE nombre LIKE ? OR identificador LIKE ? 
       ORDER BY nombre ASC LIMIT 20`,
      [`%${texto}%`, `%${texto}%`]
    );
    return result;
  } catch (error) {
    console.error('❌ Error buscando clientes por nombre:', error);
    return [];
  }
};

// ============================================
// 🔄 SINCRONIZAR CLIENTES (TODOS - SIN LÍMITE)
// ============================================
let sincronizandoClientes = false;

export const sincronizarClientes = async (apiInstance) => {
  if (sincronizandoClientes) {
    console.log('⏳ Sincronización de clientes ya en progreso...');
    const clientes = await getClientesCache();
    return { success: true, count: clientes.length, cache: true };
  }
  
  sincronizandoClientes = true;
  
  try {
    if (!db) await initDatabase();
    
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📋 Sin conexión, usando caché local');
      const clientes = await getClientesCache();
      sincronizandoClientes = false;
      return { success: true, count: clientes.length, cache: true };
    }
    
    console.log('🔄 Sincronizando TODOS los clientes desde servidor...');
    
    const api = apiInstance || require('./api').default;
    // 🔥 SIN LÍMITE - obtener TODOS los clientes
    const response = await api.get('/clientes/todos');
    
    if (response.data.success) {
      const clientes = response.data.data || [];
      console.log(`📋 Recibidos ${clientes.length} clientes del servidor`);
      
      // Guardar en caché por lotes para no bloquear
      const batchSize = 500;
      let guardados = 0;
      for (let i = 0; i < clientes.length; i += batchSize) {
        const batch = clientes.slice(i, i + batchSize);
        await guardarClientesCache(batch);
        guardados += batch.length;
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} clientes (${guardados} total)`);
      }
      
      console.log(`✅ ${clientes.length} clientes sincronizados en caché`);
      sincronizandoClientes = false;
      return { success: true, count: clientes.length, cache: false };
    }
    sincronizandoClientes = false;
    return { success: false, error: 'Error al obtener clientes' };
  } catch (error) {
    console.error('❌ Error sincronizando clientes:', error);
    sincronizandoClientes = false;
    const clientes = await getClientesCache();
    return { success: true, count: clientes.length, cache: true, error: error.message };
  }
};

// ============================================
// 📊 CONTAR PENDIENTES
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
// 📋 OBTENER TODAS LAS PENDIENTES
// ============================================
export const getTodasPendientes = async () => {
  try {
    if (!db) await initDatabase();
    
    const visitas = await db.getAllAsync('SELECT *, "visita" as modulo FROM visitas_pendientes WHERE sincronizado = 0');
    const transferencias = await db.getAllAsync('SELECT *, "transferencia" as modulo FROM transferencias_pendientes WHERE sincronizado = 0');
    const servicios = await db.getAllAsync('SELECT *, "servicio" as modulo FROM servicios_pendientes WHERE sincronizado = 0');
    const cajas = await db.getAllAsync('SELECT *, "caja" as modulo FROM cajas_pendientes WHERE sincronizado = 0');
    const bodegas = await db.getAllAsync('SELECT *, "bodega" as modulo FROM bodegas_pendientes WHERE sincronizado = 0');
    const horarios = await db.getAllAsync('SELECT *, "horario" as modulo FROM horarios_pendientes WHERE sincronizado = 0');
    
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
// 🔄 SINCRONIZAR VISITAS PENDIENTES
// ============================================
export const sincronizarVisitas = async (apiInstance) => {
  try {
    const pendientes = await getTodasPendientes();
    const total = pendientes.total;
    
    if (total === 0) {
      console.log('✅ No hay datos pendientes');
      return { success: true, sincronizados: 0, total: 0 };
    }
    
    console.log(`🔄 Sincronizando ${total} elementos...`);
    
    const api = apiInstance || require('./api').default;
    let sincronizados = 0;
    let errores = 0;
    
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
          await db.runAsync('UPDATE visitas_pendientes SET sincronizado = 1 WHERE id = ?', [item.id]);
          sincronizados++;
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE visitas_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
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
          await db.runAsync('UPDATE transferencias_pendientes SET sincronizado = 1 WHERE id = ?', [item.id]);
          sincronizados++;
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE transferencias_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
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
          await db.runAsync('UPDATE servicios_pendientes SET sincronizado = 1 WHERE id = ?', [item.id]);
          sincronizados++;
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE servicios_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
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
          await db.runAsync('UPDATE cajas_pendientes SET sincronizado = 1 WHERE id = ?', [item.id]);
          sincronizados++;
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE cajas_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
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
          await db.runAsync('UPDATE bodegas_pendientes SET sincronizado = 1 WHERE id = ?', [item.id]);
          sincronizados++;
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE bodegas_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
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
          await db.runAsync('UPDATE horarios_pendientes SET sincronizado = 1 WHERE id = ?', [item.id]);
          sincronizados++;
        }
      } catch (error) {
        errores++;
        await db.runAsync(
          'UPDATE horarios_pendientes SET intentos = intentos + 1, error = ? WHERE id = ?',
          [error.message, item.id]
        );
      }
    }
    
    console.log(`📊 Sincronización completada: ${sincronizados} exitosos, ${errores} errores`);
    return { success: true, sincronizados, errores, total };
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📦 EXPORTAR
// ============================================
export default {
  initDatabase,
  guardarVisitaOffline,
  contarPendientes,
  getTodasPendientes,
  sincronizarVisitas,
  sincronizarClientes,
  getClientesCache,
  contarClientesCache,
  buscarClienteCache,
  buscarClientesPorNombreCache,
  guardarClientesCache,
};