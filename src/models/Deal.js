const { query } = require("../config/database");
const HttpError = require("../utils/httpError");

class Deal {
  static computeDiscountRate(originalPrice, discountPrice) {
    const original = Number(originalPrice);
    const discount = Number(discountPrice);

    if (discount > original) {
      throw new HttpError(400, "Discount price cannot be greater than original price");
    }

    if (original <= 0) {
      throw new HttpError(400, "Original price must be greater than zero");
    }

    return Number((((original - discount) / original) * 100).toFixed(2));
  }

  static async create(payload) {
    const store = await query("SELECT id FROM stores WHERE id = ? LIMIT 1", [payload.store_id]);
    if (!store[0]) {
      throw new HttpError(404, "Store not found");
    }

    const discountRate = this.computeDiscountRate(
      payload.original_price,
      payload.discount_price
    );

    const result = await query(
      `INSERT INTO deals
        (title, store_id, original_price, discount_price, discount_rate, description,
         deal_category_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        payload.store_id,
        payload.original_price,
        payload.discount_price,
        discountRate,
        payload.description || null,
        payload.deal_category_id || null,
        payload.start_date || null,
        payload.end_date || null,
        payload.status || "active"
      ]
    );

    return this.findById(result.insertId);
  }

  static async expireEndedDeals() {
    return query(
      `UPDATE deals
       SET status = 'expired'
       WHERE end_date IS NOT NULL
         AND end_date < NOW()
         AND status <> 'expired'`
    );
  }

  static async findById(id) {
    const rows = await query(
      `SELECT d.*, s.store_name, s.location AS store_location,
              dc.category_name AS deal_category_name
       FROM deals d
       INNER JOIN stores s ON s.id = d.store_id
       LEFT JOIN deal_categories dc ON dc.id = d.deal_category_id
       WHERE d.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async list(filters) {
    await this.expireEndedDeals();

    const conditions = [];
    const params = [];
    const safeLimit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);
    const safeOffset = Math.max(Number(filters.offset) || 0, 0);

    if (filters.store_id) {
      conditions.push("d.store_id = ?");
      params.push(filters.store_id);
    }

    if (filters.deal_category_id) {
      conditions.push("d.deal_category_id = ?");
      params.push(filters.deal_category_id);
    }

    if (filters.status) {
      conditions.push("d.status = ?");
      params.push(filters.status);
    }

    if (filters.location) {
      conditions.push("s.location LIKE ?");
      params.push(`%${filters.location}%`);
    }

    if (filters.min_discount_rate) {
      conditions.push("d.discount_rate >= ?");
      params.push(Number(filters.min_discount_rate));
    }

    if (filters.search) {
      conditions.push("(d.title LIKE ? OR d.description LIKE ? OR s.store_name LIKE ?)");
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return query(
      `SELECT d.*, s.store_name, s.location AS store_location,
              dc.category_name AS deal_category_name
       FROM deals d
       INNER JOIN stores s ON s.id = d.store_id
       LEFT JOIN deal_categories dc ON dc.id = d.deal_category_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );
  }

  static async addImage({ deal_id, image_path }) {
    const deal = await this.findById(deal_id);
    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    const result = await query(
      "INSERT INTO deal_images (deal_id, image_path) VALUES (?, ?)",
      [deal_id, image_path]
    );

    const rows = await query("SELECT * FROM deal_images WHERE id = ? LIMIT 1", [result.insertId]);
    return rows[0] || null;
  }
}

module.exports = Deal;
