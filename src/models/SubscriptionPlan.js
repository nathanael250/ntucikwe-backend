const { query } = require("../config/database");

class SubscriptionPlan {
  static async create(payload) {
    const result = await query(
      `INSERT INTO subscription_plans
        (plan_name, description, price, duration_in_days, max_ads, max_deals, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.plan_name,
        payload.description || null,
        payload.price,
        payload.duration_in_days,
        payload.max_ads || 0,
        payload.max_deals || 0,
        payload.status || "active"
      ]
    );

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const rows = await query(
      "SELECT * FROM subscription_plans WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  }

  static async list({ status }) {
    const params = [];
    let whereClause = "";

    if (status) {
      whereClause = "WHERE status = ?";
      params.push(status);
    }

    return query(
      `SELECT * FROM subscription_plans
       ${whereClause}
       ORDER BY price ASC, duration_in_days ASC`,
      params
    );
  }
}

module.exports = SubscriptionPlan;
