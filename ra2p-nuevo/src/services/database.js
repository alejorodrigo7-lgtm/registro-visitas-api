// src/services/database.js
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ============================================
// IMPORTAR MÓDULOS SEGÚN PLATAFORMA
// ============================================
let SQLite;
let WebSQLite;

if (Platform.OS === 'web') {
  WebSQLite = require('../utils/expo-sqlite.mock').default;
  SQLite = WebSQLite;
  console.log('🌐 Usando mock de SQLite para web');
} else {
  SQLite = require('expo-sqlite');
  console.log('📱 Usando SQLite nativo');
}

let dbInstance = null;
let dbInitialized = false;

// ============================================
// 🗄️ INICIALIZAR BASE DE DATOS
// ============================================
export const initDatabase = async () => {
  try {
    if (dbInitialized && dbInstance) {
      console.log('✅ Base de datos ya inicializada');
      return dbInstance;
    }

    if (Platform.OS === 'web') {
      console.log('🌐 Abriendo base de datos web (localStorage)');
      dbInstance = await SQLite.openDatabaseAsync('registro_visitas.db');
    } else {
      console.log('📱 Abriendo base de datos nativa');
      dbInstance = await SQLite.openDatabaseAsync('registro_visitas.db');
    }

    dbInitialized = true;
    console.log('✅ Base de datos local inicializada');
    return dbInstance;
  } catch (error) {
    console.error('❌ Error al inicializar BD:', error);
    throw error;
  }
};

// ============================================
// 📋 FUNCIONES DE COMPATIBILIDAD
// ============================================

export const getDb = async () => {
  if (!dbInitialized) {
    await initDatabase();
  }
  return dbInstance;
};

export const executeQuery = async (sql, params = []) => {
  const db = await getDb();
  
  if (Platform.OS === 'web') {
    if (sql.toLowerCase().includes('select')) {
      return await db.getAllAsync(sql, params);
    } else {
      return await db.runAsync(sql, params);
    }
  } else {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  }
};

// ============================================
// 📋 CONTAR PENDIENTES
// ============================================
const contarPendientesFn = async () => {
  try {
    let total = 0;
    try {
      const sql = 'SELECT COUNT(*) as total FROM visitas_pendientes WHERE sincronizado = 0';
      const result = await executeQuery(sql);
      if (Platform.OS === 'web') {
        total = result?.total || 0;
      } else {
        total = result?.rows?.item(0)?.total || 0;
      }
    } catch (e) {
      console.log('⚠️ Tabla visitas_pendientes no existe aún');
    }
    return { total };
  } catch (error) {
    console.error('❌ Error contando pendientes:', error);
    return { total: 0 };
  }
};

// ============================================
// 🔄 SINCRONIZAR CLIENTES
// ============================================
const sincronizarClientesFn = async (apiInstance) => {
  try {
    console.log('🔄 Sincronizando clientes...');
    const api = apiInstance || (await import('./api')).default;
    
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📋 Sin conexión, usando caché local');
      const clientes = await getClientesCacheFn();
      return { success: true, count: clientes.length, cache: true };
    }
    
    const response = await api.get('/clientes/todos');
    if (response.data.success) {
      const clientes = response.data.data || [];
      console.log(`✅ ${clientes.length} clientes sincronizados`);
      await guardarClientesCacheFn(clientes);
      return { success: true, count: clientes.length, cache: false };
    }
    return { success: false, error: 'Error al obtener clientes' };
  } catch (error) {
    console.error('❌ Error sincronizando clientes:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📋 CACHE DE CLIENTES (TODAS USAN executeQuery)
// ============================================
const getClientesCacheFn = async () => {
  try {
    const sql = 'SELECT * FROM clientes_cache ORDER BY nombre ASC';
    const result = await executeQuery(sql);
    
    if (Platform.OS === 'web') {
      return result || [];
    } else {
      const rows = [];
      if (result?.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          rows.push(result.rows.item(i));
        }
      }
      return rows;
    }
  } catch (error) {
    console.error('❌ Error obteniendo clientes caché:', error);
    return [];
  }
};

const guardarClientesCacheFn = async (clientes) => {
  try {
    for (const cliente of clientes) {
      const id = cliente._id || cliente.id;
      if (!id) continue;
      
      const sql = `
        INSERT OR REPLACE INTO clientes_cache 
        (id, nombre, identificador, barrio, direccion, telefono, fecha_actualizacion)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        cliente.nombre || '',
        cliente.identificador || '',
        cliente.barrio || '',
        cliente.direccion || '',
        cliente.telefono || '',
        new Date().toISOString(),
      ];
      
      await executeQuery(sql, params);
    }
    console.log(`✅ ${clientes.length} clientes guardados en caché`);
  } catch (error) {
    console.error('❌ Error guardando clientes caché:', error);
  }
};

const contarClientesCacheFn = async () => {
  try {
    const sql = 'SELECT COUNT(*) as total FROM clientes_cache';
    const result = await executeQuery(sql);
    
    if (Platform.OS === 'web') {
      return result?.total || 0;
    } else {
      return result?.rows?.item(0)?.total || 0;
    }
  } catch (error) {
    console.error('❌ Error contando clientes caché:', error);
    return 0;
  }
};

const buscarClienteCacheFn = async (identificador) => {
  try {
    const sql = 'SELECT * FROM clientes_cache WHERE identificador = ?';
    const result = await executeQuery(sql, [identificador]);
    
    if (Platform.OS === 'web') {
      return result || null;
    } else {
      return result?.rows?.item(0) || null;
    }
  } catch (error) {
    console.error('❌ Error buscando cliente en caché:', error);
    return null;
  }
};

const buscarClientesPorNombreCacheFn = async (texto) => {
  try {
    const sql = `
      SELECT * FROM clientes_cache 
      WHERE nombre LIKE ? OR identificador LIKE ? 
      ORDER BY nombre ASC LIMIT 20
    `;
    const params = [`%${texto}%`, `%${texto}%`];
    const result = await executeQuery(sql, params);
    
    if (Platform.OS === 'web') {
      return result || [];
    } else {
      const rows = [];
      if (result?.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          rows.push(result.rows.item(i));
        }
      }
      return rows;
    }
  } catch (error) {
    console.error('❌ Error buscando clientes por nombre:', error);
    return [];
  }
};

// ============================================
// 📋 GUARDAR VISITA OFFLINE
// ============================================
const guardarVisitaOfflineFn = async (data) => {
  try {
    const sql = `
      INSERT INTO visitas_pendientes (
        cliente, identificador, barrio, direccion, telefono, tipo, monto,
        observaciones, foto, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        fecha_creacion, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;
    
    const params = [
      data.cliente || '',
      data.identificador || '',
      data.barrio || '',
      data.direccion || '',
      data.telefono || '',
      data.tipo || 'Visita',
      data.monto || 0,
      data.observaciones || '',
      data.foto || null,
      data.tecnico || '',
      data.tecnicoNombre || 'Usuario',
      data.ubicacion?.latitude || null,
      data.ubicacion?.longitude || null,
      data.ubicacion?.address || null,
      new Date().toISOString(),
    ];
    
    const result = await executeQuery(sql, params);
    return { lastInsertRowId: result?.insertId || Date.now() };
  } catch (error) {
    console.error('❌ Error guardando visita offline:', error);
    throw error;
  }
};

// ============================================
// 📋 GUARDAR MONSERRATH OFFLINE
// ============================================
const guardarMonserrathOfflineFn = async (data) => {
  try {
    const sql = `
      INSERT INTO monserrath_pendientes (
        cliente, identificador, barrio, direccion, telefono,
        fecha, hora_llegada, hora_salida, material_usado,
        observaciones, tecnico, tecnicoNombre,
        ubicacion_lat, ubicacion_lng, ubicacion_address,
        sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;
    
    const params = [
      data.cliente || '',
      data.identificador || '',
      data.barrio || '',
      data.direccion || '',
      data.telefono || '',
      data.fecha || new Date().toISOString(),
      data.hora_llegada || '',
      data.hora_salida || '',
      data.material_usado || '',
      data.observaciones || '',
      data.tecnico || '',
      data.tecnicoNombre || 'Usuario',
      data.ubicacion?.latitude || null,
      data.ubicacion?.longitude || null,
      data.ubicacion?.address || null,
    ];
    
    const result = await executeQuery(sql, params);
    return { lastInsertRowId: result?.insertId || Date.now() };
  } catch (error) {
    console.error('❌ Error guardando Monserrath offline:', error);
    throw error;
  }
};

// ============================================
// 📋 OBTENER TODAS LAS PENDIENTES
// ============================================
const getTodasPendientesFn = async () => {
  try {
    const tables = [
      { name: 'visitas_pendientes', key: 'visitas' },
      { name: 'monserrath_pendientes', key: 'monserrath' },
      { name: 'transferencias_pendientes', key: 'transferencias' },
      { name: 'servicios_pendientes', key: 'servicios' },
      { name: 'cajas_pendientes', key: 'cajas' },
      { name: 'bodegas_pendientes', key: 'bodegas' },
      { name: 'horarios_pendientes', key: 'horarios' },
    ];
    
    const result = {};
    let total = 0;
    
    for (const table of tables) {
      try {
        const sql = `SELECT * FROM ${table.name} WHERE sincronizado = 0`;
        const rows = await executeQuery(sql);
        
        let items = [];
        if (Platform.OS === 'web') {
          items = rows || [];
        } else {
          if (rows?.rows) {
            for (let i = 0; i < rows.rows.length; i++) {
              items.push(rows.rows.item(i));
            }
          }
        }
        result[table.key] = items;
        total += items.length;
      } catch (e) {
        result[table.key] = [];
      }
    }
    result.total = total;
    return result;
  } catch (error) {
    console.error('❌ Error obteniendo pendientes:', error);
    return {
      visitas: [],
      monserrath: [],
      transferencias: [],
      servicios: [],
      cajas: [],
      bodegas: [],
      horarios: [],
      total: 0
    };
  }
};

// ============================================
// 🔄 SINCRONIZAR VISITAS
// ============================================
const sincronizarVisitasFn = async (apiInstance) => {
  try {
    const pendientes = await getTodasPendientesFn();
    const total = pendientes.total;
    
    if (total === 0) {
      console.log('✅ No hay datos pendientes');
      return { success: true, sincronizados: 0, total: 0 };
    }
    
    console.log(`🔄 Sincronizando ${total} elementos...`);
    const api = apiInstance || (await import('./api')).default;
    let sincronizados = 0;
    let errores = 0;
    
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
          const sql = 'UPDATE visitas_pendientes SET sincronizado = 1 WHERE id = ?';
          await executeQuery(sql, [item.id]);
          sincronizados++;
        }
      } catch (error) {
        errores++;
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
export const db = {
  getDb,
  initDatabase,
  executeQuery,
};

// Exportar con nombres que espera MenuPrincipal
export const contarPendientes = contarPendientesFn;
export const sincronizarClientes = sincronizarClientesFn;
export const getClientesCache = getClientesCacheFn;
export const guardarClientesCache = guardarClientesCacheFn;
export const contarClientesCache = contarClientesCacheFn;
export const buscarClienteCache = buscarClienteCacheFn;
export const buscarClientesPorNombreCache = buscarClientesPorNombreCacheFn;
export const guardarVisitaOffline = guardarVisitaOfflineFn;
export const guardarMonserrathOffline = guardarMonserrathOfflineFn;
export const getTodasPendientes = getTodasPendientesFn;
export const sincronizarVisitas = sincronizarVisitasFn;

export default {
  getDb,
  initDatabase,
  executeQuery,
  contarPendientes: contarPendientesFn,
  sincronizarClientes: sincronizarClientesFn,
  getClientesCache: getClientesCacheFn,
  guardarClientesCache: guardarClientesCacheFn,
  contarClientesCache: contarClientesCacheFn,
  buscarClienteCache: buscarClienteCacheFn,
  buscarClientesPorNombreCache: buscarClientesPorNombreCacheFn,
  guardarVisitaOffline: guardarVisitaOfflineFn,
  guardarMonserrathOffline: guardarMonserrathOfflineFn,
  getTodasPendientes: getTodasPendientesFn,
  sincronizarVisitas: sincronizarVisitasFn,
};