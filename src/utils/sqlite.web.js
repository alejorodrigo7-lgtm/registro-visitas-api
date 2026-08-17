// src/utils/sqlite.web.js
// Adaptador de SQLite para web usando localStorage
// Soporta API asíncrona de expo-sqlite

class WebSQLite {
  constructor() {
    this.dbName = 'ra2p_db';
    this._isInitialized = false;
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  async openDatabaseAsync(dbName) {
    this.dbName = dbName || this.dbName;
    this._isInitialized = true;
    console.log(`🌐 Base de datos web inicializada: ${this.dbName}`);
    return this;
  }

  async execAsync(sql) {
    console.log('🌐 execAsync (ignorado en web):', sql.substring(0, 100));
    // En web, ignoramos los PRAGMA y CREATE TABLE porque usamos localStorage
    return { rowsAffected: 0 };
  }

  // ============================================
  // CONSULTAS
  // ============================================
  async runAsync(sql, params = []) {
    console.log('🌐 runAsync:', sql.substring(0, 50), params);
    
    try {
      const tableName = this._extractTableName(sql);
      const data = this._getData(tableName);
      
      if (sql.toLowerCase().includes('insert')) {
        const newItem = this._parseInsert(sql, params);
        newItem.id = Date.now() + Math.random() * 1000;
        data.push(newItem);
        this._saveData(tableName, data);
        return { lastInsertRowId: newItem.id, rowsAffected: 1 };
      }
      
      if (sql.toLowerCase().includes('update')) {
        // Actualiza el primer item que coincida (simplificado)
        const idMatch = sql.match(/WHERE\s+id\s*=\s*(\d+)/i);
        if (idMatch) {
          const id = parseInt(idMatch[1]);
          const index = data.findIndex(item => item.id === id);
          if (index !== -1) {
            // Reemplaza con los nuevos valores
            const updates = this._parseUpdate(sql, params);
            data[index] = { ...data[index], ...updates };
            this._saveData(tableName, data);
            return { rowsAffected: 1 };
          }
        }
        return { rowsAffected: 0 };
      }
      
      if (sql.toLowerCase().includes('delete')) {
        const idMatch = sql.match(/WHERE\s+id\s*=\s*(\d+)/i);
        if (idMatch) {
          const id = parseInt(idMatch[1]);
          const newData = data.filter(item => item.id !== id);
          this._saveData(tableName, newData);
          return { rowsAffected: data.length - newData.length };
        }
        return { rowsAffected: 0 };
      }
      
      return { rowsAffected: 0 };
    } catch (e) {
      console.error('Error en runAsync:', e);
      return { rowsAffected: 0 };
    }
  }

  async getFirstAsync(sql, params = []) {
    console.log('🌐 getFirstAsync:', sql.substring(0, 50), params);
    const results = await this.getAllAsync(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async getAllAsync(sql, params = []) {
    console.log('🌐 getAllAsync:', sql.substring(0, 50), params);
    
    try {
      const tableName = this._extractTableName(sql);
      let data = this._getData(tableName);
      
      // Filtro WHERE básico
      if (sql.toLowerCase().includes('where')) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*(=|LIKE)\s*(['"]?)([^'"]*)(['"]?)/i);
        if (whereMatch) {
          const [, field, operator, , value] = whereMatch;
          if (operator.toLowerCase() === 'like') {
            const pattern = value.replace(/%/g, '');
            data = data.filter(item => {
              const fieldValue = item[field]?.toString() || '';
              return fieldValue.toLowerCase().includes(pattern.toLowerCase());
            });
          } else {
            data = data.filter(item => item[field] == value);
          }
        }
      }
      
      // ORDER BY
      const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
      if (orderMatch) {
        const [, field, direction = 'ASC'] = orderMatch;
        data.sort((a, b) => {
          const valA = a[field] || '';
          const valB = b[field] || '';
          return direction.toUpperCase() === 'ASC' 
            ? valA > valB ? 1 : -1
            : valA < valB ? 1 : -1;
        });
      }
      
      // LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        data = data.slice(0, limit);
      }
      
      return data;
    } catch (e) {
      console.error('Error en getAllAsync:', e);
      return [];
    }
  }

  // ============================================
  // MÉTODOS DE COMPATIBILIDAD
  // ============================================
  transaction(callback) {
    try {
      callback({
        executeSql: (sql, params, success, error) => {
          try {
            const result = this.getAllAsync(sql, params);
            if (success) success(null, result);
          } catch (e) {
            if (error) error(e);
          }
        }
      });
    } catch (e) {
      console.error('Transaction error:', e);
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================
  
  _getTableName(sql) {
    // Extrae el nombre de la tabla de SQL
    const match = sql.match(/(?:FROM|INTO|UPDATE|TABLE)\s+(\w+)/i);
    return match ? match[1] : null;
  }

  _extractTableName(sql) {
    let table = this._getTableName(sql);
    if (!table) {
      // Intenta con CREATE TABLE
      const createMatch = sql.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/i);
      if (createMatch) table = createMatch[1];
    }
    return table || 'default';
  }

  _getData(tableName) {
    try {
      const key = `${this.dbName}_${tableName}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveData(tableName, data) {
    try {
      const key = `${this.dbName}_${tableName}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error guardando ${tableName}:`, e);
    }
  }

  _parseInsert(sql, params) {
    const item = {};
    // Extrae columnas
    const columnsMatch = sql.match(/\((.*?)\)\s*VALUES/i);
    if (columnsMatch) {
      const columns = columnsMatch[1].split(',').map(c => c.trim());
      // Los params son los valores
      params.forEach((value, index) => {
        if (index < columns.length) {
          item[columns[index]] = value;
        }
      });
    }
    return item;
  }

  _parseUpdate(sql, params) {
    const updates = {};
    // Extrae SET column = value
    const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
    if (setMatch) {
      const parts = setMatch[1].split(',').map(p => p.trim());
      let paramIndex = 0;
      parts.forEach(part => {
        const match = part.match(/(\w+)\s*=\s*/);
        if (match) {
          updates[match[1]] = params[paramIndex] || null;
          paramIndex++;
        }
      });
    }
    return updates;
  }
}

// Exporta una instancia única
const webSQLite = new WebSQLite();
export default webSQLite;