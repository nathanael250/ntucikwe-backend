const { query } = require("../config/database");

class StoreCategory {
  static async create({ category_name, sort_order = 0 }) {
    const result = await query(
      "INSERT INTO store_categories (category_name, sort_order) VALUES (?, ?)",
      [category_name, sort_order]
    );

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const rows = await query("SELECT * FROM store_categories WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async list() {
    return query("SELECT * FROM store_categories ORDER BY sort_order ASC, category_name ASC");
  }
}

module.exports = StoreCategory;
