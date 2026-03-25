const { query } = require("../config/database");

class Notification {
  static async create({ user_id, title, description }) {
    const result = await query(
      `INSERT INTO notifications (user_id, title, description)
       VALUES (?, ?, ?)`,
      [user_id, title, description || null]
    );

    const rows = await query("SELECT * FROM notifications WHERE id = ? LIMIT 1", [
      result.insertId
    ]);
    return rows[0] || null;
  }

  static async listByUser(user_id) {
    return query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );
  }

  static async markAsRead(id, user_id) {
    await query(
      `UPDATE notifications
       SET status = 'read'
       WHERE id = ? AND user_id = ?`,
      [id, user_id]
    );

    const rows = await query(
      "SELECT * FROM notifications WHERE id = ? AND user_id = ? LIMIT 1",
      [id, user_id]
    );

    return rows[0] || null;
  }
}

module.exports = Notification;
