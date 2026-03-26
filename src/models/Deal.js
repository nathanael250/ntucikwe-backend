const { pool, query } = require("../config/database");
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
    const imagePaths = this.normalizeImagePaths(payload.image_paths || payload.images);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
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

      for (const imagePath of imagePaths) {
        await connection.execute(
          "INSERT INTO deal_images (deal_id, image_path) VALUES (?, ?)",
          [result.insertId, imagePath]
        );
      }

      await connection.commit();
      return this.findById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static normalizeImagePaths(images) {
    if (!images) {
      return [];
    }

    if (!Array.isArray(images)) {
      throw new HttpError(400, "images must be an array");
    }

    return images.map((image) => {
      const imagePath =
        typeof image === "string"
          ? image
          : image && typeof image === "object"
            ? image.image_path || image.path || image.url
            : null;

      if (!imagePath || typeof imagePath !== "string" || imagePath.trim() === "") {
        throw new HttpError(400, "Each image must contain a valid path");
      }

      return imagePath.trim();
    });
  }

  static async attachImages(deals) {
    if (!deals || deals.length === 0) {
      return deals;
    }

    const dealIds = deals.map((deal) => Number(deal.id));
    const placeholders = dealIds.map(() => "?").join(", ");
    const images = await query(
      `SELECT id, deal_id, image_path, created_at
       FROM deal_images
       WHERE deal_id IN (${placeholders})
       ORDER BY id ASC`,
      dealIds
    );

    const imagesByDealId = images.reduce((accumulator, image) => {
      const key = Number(image.deal_id);
      accumulator[key] = accumulator[key] || [];
      accumulator[key].push(image);
      return accumulator;
    }, {});

    return deals.map((deal) => ({
      ...deal,
      images: imagesByDealId[Number(deal.id)] || []
    }));
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

    if (!rows[0]) {
      return null;
    }

    const [deal] = await this.attachImages([rows[0]]);
    return deal;
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

    const deals = await query(
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

    return this.attachImages(deals);
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
