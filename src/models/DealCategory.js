const { query } = require("../config/database");

class DealCategory {
  static async create({ category_name, sort_order = 0 }) {
    const result = await query(
      "INSERT INTO deal_categories (category_name, sort_order) VALUES (?, ?)",
      [category_name, sort_order]
    );

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const rows = await query("SELECT * FROM deal_categories WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async list() {
    return query("SELECT * FROM deal_categories ORDER BY sort_order ASC, category_name ASC");
  }
}

module.exports = DealCategory;
