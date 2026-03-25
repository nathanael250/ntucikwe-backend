const { query } = require("../config/database");

class BaseModel {
  static async findById(tableName, id) {
    const rows = await query(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  static async deleteById(tableName, id) {
    const result = await query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = BaseModel;
