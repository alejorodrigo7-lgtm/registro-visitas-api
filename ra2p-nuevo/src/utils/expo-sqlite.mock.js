// src/utils/expo-sqlite.mock.js
// Mock completo de expo-sqlite para web y Expo Go
// Reemplaza el módulo nativo que no existe en navegadores

// ============================================
// 📦 CLASE PRINCIPAL DE BASE DE DATOS
// ============================================
class SQLiteDatabase {
  constructor(dbName) {
    this.dbName = dbName || 'registro_visitas.db';
    this.tables = {};
    this._loadFromStorage();
    console.log(`🌐 SQLite mock inicializado: ${this.dbName}`);
  }

  // Cargar datos desde localStorage
  _loadFromStorage() {
    try {
      const data = localStorage.getItem(`sqlite_${this.dbName}`);
      if (data) {
        this.tables = JSON.parse(data);
      }
    } catch (e) {
      console.warn('No se pudieron cargar datos previos:', e);
    }
  }

  // Guardar datos en localStorage
  _saveToStorage() {
    try {
      localStorage.setItem(`sqlite_${this.dbName}`, JSON.stringify(this.tables));
    } catch (e) {
      console.warn('No se pudieron guardar datos:', e);
    }
  }

  // Obtener o crear tabla
  _getTable(tableName) {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    return this.tables[tableName];
  }

  // ============================================
  // 📋 API PRINCIPAL (expo-sqlite)
  // ============================================

  // Ejecutar SQL (CREATE TABLE, etc.)
  async execAsync(sql) {
    console.log('🌐 execAsync:', sql.substring(0, 100));
    
    // Detectar CREATE TABLE
    const createMatch = sql.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/i);
    if (createMatch) {
      const tableName = createMatch[1];
      if (!this.tables[tableName]) {
        this.tables[tableName] = [];
        this._saveToStorage();
        console.log(`✅ Tabla creada: ${tableName}`);
      }
    }
    
    return { rowsAffected: 0 };
  }

  // Ejecutar consulta con parámetros
  async runAsync(sql, params = []) {
    console.log('🌐 runAsync:', sql.substring(0, 100), params);
    
    const tableMatch = sql.match(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+(\w+)/i);
    if (!tableMatch) return { rowsAffected: 0, lastInsertRowId: 0 };
    
    const tableName = tableMatch[1];
    const table = this._getTable(tableName);
    
    // INSERT
    if (sql.toLowerCase().includes('insert into')) {
      const columnsMatch = sql.match(/INSERT INTO\s+\w+\s*\(([^)]+)\)/i);
      const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
      
      if (columnsMatch && valuesMatch) {
        const columns = columnsMatch[1].split(',').map(c => c.trim());
        const values = valuesMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
        
        const newRow = { id: Date.now() + Math.random() * 10000 };
        columns.forEach((col, index) => {
          if (col.toLowerCase() === 'id') return;
          const paramIndex = index - 1;
          const value = params[paramIndex] !== undefined ? params[paramIndex] : values[index] || null;
          newRow[col] = value;
        });
        
        table.push(newRow);
        this._saveToStorage();
        return { rowsAffected: 1, lastInsertRowId: newRow.id };
      }
    }
    
    // UPDATE
    if (sql.toLowerCase().includes('update')) {
      const idMatch = sql.match(/WHERE\s+id\s*=\s*['"]?(\d+)['"]?/i);
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        const index = table.findIndex(row => row.id === id);
        if (index !== -1) {
          const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
          if (setMatch) {
            const setParts = setMatch[1].split(',').map(p => p.trim());
            let paramIndex = 0;
            setParts.forEach(part => {
              const match = part.match(/(\w+)\s*=\s*/);
              if (match) {
                const column = match[1];
                if (column.toLowerCase() !== 'id') {
                  table[index][column] = params[paramIndex] !== undefined ? params[paramIndex] : null;
                  paramIndex++;
                }
              }
            });
            this._saveToStorage();
            return { rowsAffected: 1 };
          }
        }
      }
    }
    
    // DELETE
    if (sql.toLowerCase().includes('delete from')) {
      const idMatch = sql.match(/WHERE\s+id\s*=\s*['"]?(\d+)['"]?/i);
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        const newTable = table.filter(row => row.id !== id);
        if (newTable.length < table.length) {
          this.tables[tableName] = newTable;
          this._saveToStorage();
          return { rowsAffected: table.length - newTable.length };
        }
      }
    }
    
    return { rowsAffected: 0, lastInsertRowId: 0 };
  }

  // Obtener todos los resultados (SELECT)
  async getAllAsync(sql, params = []) {
    console.log('🌐 getAllAsync:', sql.substring(0, 100), params);
    
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return [];
    
    const tableName = tableMatch[1];
    const table = this._getTable(tableName);
    let results = [...table];
    
    // Filtrar WHERE
    if (sql.toLowerCase().includes('where')) {
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        const conditions = whereClause.split(/\s+AND\s+|\s+OR\s+/i);
        
        results = results.filter(row => {
          return conditions.every(condition => {
            const match = condition.match(/(\w+)\s*(=|!=|<>|LIKE)\s*['"]?([^'"]*)['"]?/i);
            if (!match) return true;
            
            const [, field, operator, value] = match;
            const rowValue = row[field];
            
            if (operator.toLowerCase() === 'like') {
              const pattern = value.replace(/%/g, '');
              return String(rowValue || '').toLowerCase().includes(pattern.toLowerCase());
            }
            
            return rowValue == value;
          });
        });
      }
    }
    
    // ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
    if (orderMatch) {
      const [, field, direction = 'ASC'] = orderMatch;
      results.sort((a, b) => {
        const valA = a[field] || '';
        const valB = b[field] || '';
        return direction.toUpperCase() === 'ASC' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    
    // LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      const offset = limitMatch[2] ? parseInt(limitMatch[2]) : 0;
      results = results.slice(offset, offset + limit);
    }
    
    return results;
  }

  // Obtener el primer resultado
  async getFirstAsync(sql, params = []) {
    const results = await this.getAllAsync(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  // ============================================
  // 🔧 TRANSACTION - CORREGIDO
  // ============================================
  transaction(callback) {
    try {
      const self = this;
      callback({
        executeSql: (sql, params, success, error) => {
          // Determinar si es SELECT o no
          const isSelect = sql.toLowerCase().includes('select');
          
          if (isSelect) {
            // SELECT: usar getAllAsync
            self.getAllAsync(sql, params)
              .then(result => {
                if (success) {
                  // Formato correcto para SQLite
                  success(null, { 
                    rows: { 
                      _array: result,
                      length: result.length,
                      item: (i) => result[i] 
                    },
                    insertId: 0,
                    rowsAffected: result.length
                  });
                }
              })
              .catch(err => {
                if (error) error(err);
              });
          } else {
            // INSERT/UPDATE/DELETE: usar runAsync
            self.runAsync(sql, params)
              .then(result => {
                if (success) {
                  success(null, {
                    rows: { _array: [], length: 0 },
                    insertId: result.lastInsertRowId || 0,
                    rowsAffected: result.rowsAffected || 0
                  });
                }
              })
              .catch(err => {
                if (error) error(err);
              });
          }
        }
      });
    } catch (e) {
      console.error('Transaction error:', e);
      if (callback) {
        try {
          callback({
            executeSql: (sql, params, success) => {
              if (success) {
                success(null, { rows: { _array: [] }, insertId: 0, rowsAffected: 0 });
              }
            }
          });
        } catch (e2) {
          console.error('Fallback transaction error:', e2);
        }
      }
    }
  }
}

// ============================================
// 📦 EXPORTAR LA API COMPLETA
// ============================================
const SQLite = {
  openDatabaseAsync: async (dbName) => {
    const db = new SQLiteDatabase(dbName);
    return db;
  },
  openDatabase: (dbName) => {
    return new SQLiteDatabase(dbName);
  },
  default: null,
};

// Exportar como módulo
export default SQLite;

// Exportar la clase por si se necesita
export { SQLiteDatabase };