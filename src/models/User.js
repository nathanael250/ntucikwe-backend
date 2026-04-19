const bcrypt = require("bcryptjs");
const BaseModel = require("./BaseModel");
const { query } = require("../config/database");
const HttpError = require("../utils/httpError");

class User extends BaseModel {
  static normalizeRole(role) {
    if (role === undefined) {
      return undefined;
    }

    if (!["admin", "vendor", "public_user"].includes(role)) {
      throw new HttpError(400, "role must be admin, vendor, or public_user");
    }

    return role;
  }

  static normalizeStatus(status) {
    if (status === undefined) {
      return undefined;
    }

    if (!["active", "inactive", "blocked"].includes(status)) {
      throw new HttpError(400, "status must be active, inactive, or blocked");
    }

    return status;
  }

  static normalizeEmailVerified(value) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    if (value === 1 || value === "1" || value === "true") {
      return 1;
    }

    if (value === 0 || value === "0" || value === "false") {
      return 0;
    }

    throw new HttpError(400, "email_verified must be true or false");
  }

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
    const nextStatus = this.normalizeStatus(status);
    await query("UPDATE users SET status = ? WHERE id = ?", [nextStatus, id]);
    return this.getSafeUserById(id);
  }

  static async update(id, payload) {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new HttpError(404, "User not found");
    }

    const nextEmail =
      payload.email !== undefined ? String(payload.email).trim() : existingUser.email;
    if (nextEmail !== existingUser.email) {
      const emailOwner = await this.findByEmail(nextEmail);
      if (emailOwner && Number(emailOwner.id) !== Number(id)) {
        throw new HttpError(409, "Email already exists");
      }
    }

    let nextPhoneNumber =
      payload.phone_number !== undefined
        ? String(payload.phone_number).trim()
        : existingUser.phone_number;
    nextPhoneNumber = nextPhoneNumber || null;

    if (nextPhoneNumber && nextPhoneNumber !== existingUser.phone_number) {
      const rows = await query("SELECT id FROM users WHERE phone_number = ? LIMIT 1", [
        nextPhoneNumber
      ]);
      if (rows[0] && Number(rows[0].id) !== Number(id)) {
        throw new HttpError(409, "Phone number already exists");
      }
    }

    const nextPassword =
      payload.password !== undefined && payload.password !== ""
        ? await bcrypt.hash(payload.password, 10)
        : existingUser.password;
    const nextRole =
      payload.role !== undefined ? this.normalizeRole(payload.role) : existingUser.role;
    const nextStatus =
      payload.status !== undefined
        ? this.normalizeStatus(payload.status)
        : existingUser.status;
    const nextEmailVerified =
      payload.email_verified !== undefined
        ? this.normalizeEmailVerified(payload.email_verified)
        : existingUser.email_verified;

    await query(
      `UPDATE users
       SET first_name = ?,
           last_name = ?,
           email = ?,
           phone_number = ?,
           address = ?,
           password = ?,
           role = ?,
           email_verified = ?,
           status = ?
       WHERE id = ?`,
      [
        payload.first_name !== undefined ? payload.first_name : existingUser.first_name,
        payload.last_name !== undefined ? payload.last_name : existingUser.last_name,
        nextEmail,
        nextPhoneNumber,
        payload.address !== undefined ? payload.address || null : existingUser.address,
        nextPassword,
        nextRole,
        nextEmailVerified,
        nextStatus,
        id
      ]
    );

    return this.getSafeUserById(id);
  }

  static async findById(id) {
    const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async delete(id) {
    const existingUser = await this.getSafeUserById(id);
    if (!existingUser) {
      throw new HttpError(404, "User not found");
    }

    await query("DELETE FROM users WHERE id = ?", [id]);
    return existingUser;
  }
}

module.exports = User;
