const { query } = require("../config/database");
const HttpError = require("../utils/httpError");

class Ad {
  static async create(payload) {
    const ownerRows = await query(
      "SELECT id, role, status FROM users WHERE id = ? LIMIT 1",
      [payload.owner_id]
    );
    const owner = ownerRows[0];

    if (!owner) {
      throw new HttpError(404, "Ad owner not found");
    }

    if (owner.status !== "active") {
      throw new HttpError(403, "Ad owner is not active");
    }

    const result = await query(
      `INSERT INTO ads
        (title, location, banner, owner_id, status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        payload.location || null,
        payload.banner || null,
        payload.owner_id,
        payload.status || "active",
        payload.start_date || null,
        payload.end_date || null
      ]
    );

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const rows = await query(
      `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
       FROM ads a
       INNER JOIN users u ON u.id = a.owner_id
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  }

  static async list({ limit, offset, status, location, owner_id }) {
    const conditions = [];
    const params = [];
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    if (status) {
      conditions.push("a.status = ?");
      params.push(status);
    }

    if (location) {
      conditions.push("a.location LIKE ?");
      params.push(`%${location}%`);
    }

    if (owner_id) {
      conditions.push("a.owner_id = ?");
      params.push(owner_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return query(
      `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
       FROM ads a
       INNER JOIN users u ON u.id = a.owner_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );
  }
}

module.exports = Ad;
