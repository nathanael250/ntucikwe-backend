const { query } = require("../config/database");
const HttpError = require("../utils/httpError");

class Store {
  static async assertVendorOwnership(storeId, vendorId) {
    const store = await this.findById(storeId);
    if (!store) {
      throw new HttpError(404, "Store not found");
    }

    if (Number(store.vendor_id) !== Number(vendorId)) {
      throw new HttpError(403, "You can only manage your own store");
    }

    return store;
  }

  static async create(payload) {
    const owner = await query(
      "SELECT id, role, status FROM users WHERE id = ? LIMIT 1",
      [payload.vendor_id]
    );
    const vendor = owner[0];

    if (!vendor || vendor.role !== "vendor") {
      throw new HttpError(400, "Store owner must be an active vendor");
    }

    if (vendor.status !== "active") {
      throw new HttpError(403, "Vendor account is not active");
    }

    const result = await query(
      `INSERT INTO stores
        (vendor_id, store_name, description, banner, profile_image, location, address, store_category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.vendor_id,
        payload.store_name,
        payload.description || null,
        payload.banner || null,
        payload.profile_image || null,
        payload.location || null,
        payload.address || null,
        payload.store_category_id || null
      ]
    );

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const rows = await query(
      `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) AS vendor_name,
              sc.category_name AS store_category_name
       FROM stores s
       INNER JOIN users u ON u.id = s.vendor_id
       LEFT JOIN store_categories sc ON sc.id = s.store_category_id
       WHERE s.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async list({ limit, offset, vendor_id, store_category_id, location, search }) {
    const conditions = [];
    const params = [];
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    if (vendor_id) {
      conditions.push("s.vendor_id = ?");
      params.push(vendor_id);
    }

    if (store_category_id) {
      conditions.push("s.store_category_id = ?");
      params.push(store_category_id);
    }

    if (location) {
      conditions.push("s.location LIKE ?");
      params.push(`%${location}%`);
    }

    if (search) {
      conditions.push("(s.store_name LIKE ? OR s.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return query(
      `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) AS vendor_name,
              sc.category_name AS store_category_name
       FROM stores s
       INNER JOIN users u ON u.id = s.vendor_id
       LEFT JOIN store_categories sc ON sc.id = s.store_category_id
       ${whereClause}
       ORDER BY s.id DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );
  }

  static async update(id, payload) {
    const existingStore = await this.findById(id);
    if (!existingStore) {
      throw new HttpError(404, "Store not found");
    }

    await query(
      `UPDATE stores
       SET store_name = ?,
           description = ?,
           banner = ?,
           profile_image = ?,
           location = ?,
           address = ?,
           store_category_id = ?
       WHERE id = ?`,
      [
        payload.store_name || existingStore.store_name,
        payload.description !== undefined ? payload.description : existingStore.description,
        payload.banner !== undefined ? payload.banner : existingStore.banner,
        payload.profile_image !== undefined
          ? payload.profile_image
          : existingStore.profile_image,
        payload.location !== undefined ? payload.location : existingStore.location,
        payload.address !== undefined ? payload.address : existingStore.address,
        payload.store_category_id !== undefined
          ? payload.store_category_id
          : existingStore.store_category_id,
        id
      ]
    );

    return this.findById(id);
  }
}

module.exports = Store;
