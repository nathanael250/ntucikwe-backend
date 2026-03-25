const bcrypt = require("bcryptjs");
const BaseModel = require("./BaseModel");
const { query } = require("../config/database");
const HttpError = require("../utils/httpError");

class User extends BaseModel {
  static async create(payload) {
    const existing = await this.findByEmail(payload.email);
    if (existing) {
      throw new HttpError(409, "Email already exists");
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const result = await query(
      `INSERT INTO users
        (first_name, last_name, email, phone_number, address, password, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.first_name,
        payload.last_name,
        payload.email,
        payload.phone_number || null,
        payload.address || null,
        hashedPassword,
        payload.role || "public_user"
      ]
    );

    return this.getSafeUserById(result.insertId);
  }

  static async findByEmail(email) {
    const rows = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  }

  static async getSafeUserById(id) {
    const rows = await query(
      `SELECT id, first_name, last_name, email, phone_number, address, role,
              email_verified, status, created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  }

  static async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new HttpError(401, "Invalid email or password");
    }

    if (user.status !== "active") {
      throw new HttpError(403, `User account is ${user.status}`);
    }

    return this.getSafeUserById(user.id);
  }

  static async list({ limit, offset, role, status, search }) {
    const conditions = [];
    const params = [];
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    if (role) {
      conditions.push("role = ?");
      params.push(role);
    }

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    if (search) {
      conditions.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return query(
      `SELECT id, first_name, last_name, email, phone_number, address, role,
              email_verified, status, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY id DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );
  }

  static async updateStatus(id, status) {
    await query("UPDATE users SET status = ? WHERE id = ?", [status, id]);
    return this.getSafeUserById(id);
  }
}

module.exports = User;
