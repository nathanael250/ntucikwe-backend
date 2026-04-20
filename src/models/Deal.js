const { pool, query } = require("../config/database");
const HttpError = require("../utils/httpError");

class Deal {
  static normalizeSpecification(specification) {
    if (
      specification === undefined ||
      specification === null ||
      specification === ""
    ) {
      return null;
    }

    if (typeof specification === "string") {
      try {
        return JSON.parse(specification);
      } catch (_error) {
        throw new HttpError(400, "specification must be valid JSON");
      }
    }

    if (typeof specification === "object" && !Array.isArray(specification)) {
      return specification;
    }

    throw new HttpError(400, "specification must be a JSON object");
  }

  static normalizeSchedule({ start_date, end_date }) {
    const normalizedStartDate = start_date || null;
    const normalizedEndDate = end_date || null;

    if (!normalizedEndDate) {
      throw new HttpError(400, "end_date is required for every deal");
    }

    const parsedEndDate = new Date(normalizedEndDate);
    if (Number.isNaN(parsedEndDate.getTime())) {
      throw new HttpError(400, "end_date must be a valid date/time");
    }

    if (!normalizedStartDate) {
      return {
        start_date: null,
        end_date: normalizedEndDate,
      };
    }

    const parsedStartDate = new Date(normalizedStartDate);
    if (Number.isNaN(parsedStartDate.getTime())) {
      throw new HttpError(400, "start_date must be a valid date/time");
    }

    if (parsedStartDate >= parsedEndDate) {
      throw new HttpError(400, "end_date must be later than start_date");
    }

    return {
      start_date: normalizedStartDate,
      end_date: normalizedEndDate,
    };
  }

  static computeDiscountRate(originalPrice, discountPrice) {
    const original = Number(originalPrice);
    const discount = Number(discountPrice);

    if (discount > original) {
      throw new HttpError(
        400,
        "Discount price cannot be greater than original price",
      );
    }

    if (original <= 0) {
      throw new HttpError(400, "Original price must be greater than zero");
    }

    return Number((((original - discount) / original) * 100).toFixed(2));
  }

  static async create(payload) {
    const store = await query("SELECT id FROM stores WHERE id = ? LIMIT 1", [
      payload.store_id,
    ]);
    if (!store[0]) {
      throw new HttpError(404, "Store not found");
    }

    const discountRate = this.computeDiscountRate(
      payload.original_price,
      payload.discount_price,
    );
    const schedule = this.normalizeSchedule(payload);
    const specification = this.normalizeSpecification(payload.specification);
    const imagePaths = this.normalizeImagePaths(
      payload.image_paths || payload.images,
    );
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO deals
          (title, store_id, original_price, discount_price, discount_rate, description,
           specification, deal_category_id, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.title,
          payload.store_id,
          payload.original_price,
          payload.discount_price,
          discountRate,
          payload.description || null,
          specification ? JSON.stringify(specification) : null,
          payload.deal_category_id || null,
          schedule.start_date,
          schedule.end_date,
          payload.status || "active",
        ],
      );

      for (const imagePath of imagePaths) {
        await connection.execute(
          "INSERT INTO deal_images (deal_id, image_path) VALUES (?, ?)",
          [result.insertId, imagePath],
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

      if (
        !imagePath ||
        typeof imagePath !== "string" ||
        imagePath.trim() === ""
      ) {
        throw new HttpError(400, "Each image must contain a valid path");
      }

      return imagePath.trim();
    });
  }

  static mergeSchedule(existingDeal, payload) {
    const startProvided = Object.prototype.hasOwnProperty.call(
      payload,
      "start_date",
    );
    const endProvided = Object.prototype.hasOwnProperty.call(payload, "end_date");

    const nextStartDate = startProvided
      ? payload.start_date || null
      : existingDeal.start_date;
    const nextEndDate = endProvided ? payload.end_date || null : existingDeal.end_date;

    return this.normalizeSchedule({
      start_date: nextStartDate,
      end_date: nextEndDate,
    });
  }

  static resolveStatus(existingDeal, payload, nextSchedule) {
    if (payload.status !== undefined && payload.status !== "") {
      return payload.status;
    }

    const endDate = nextSchedule.end_date ? new Date(nextSchedule.end_date) : null;
    if (endDate && !Number.isNaN(endDate.getTime()) && endDate <= new Date()) {
      return "expired";
    }

    return "active";
  }

  static mapDealState(deal) {
    const now = new Date();
    const endDate = deal.end_date ? new Date(deal.end_date) : null;
    const startDate = deal.start_date ? new Date(deal.start_date) : null;
    const isExpired =
      deal.status === "expired" ||
      (endDate && !Number.isNaN(endDate.getTime()) && endDate <= now);
    const isStarted =
      !startDate ||
      (startDate && !Number.isNaN(startDate.getTime()) && startDate <= now);

    return {
      ...deal,
      specification: this.normalizeSpecification(deal.specification),
      is_started: isStarted,
      is_expired: Boolean(isExpired),
      countdown_target: deal.end_date || null,
    };
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
      dealIds,
    );

    const imagesByDealId = images.reduce((accumulator, image) => {
      const key = Number(image.deal_id);
      accumulator[key] = accumulator[key] || [];
      accumulator[key].push(image);
      return accumulator;
    }, {});

    return deals.map((deal) => ({
      ...deal,
      images: imagesByDealId[Number(deal.id)] || [],
    }));
  }

  static async expireEndedDeals() {
    return query(
      `UPDATE deals
       SET status = 'expired'
       WHERE end_date IS NOT NULL
         AND end_date < NOW()
         AND status <> 'expired'`,
    );
  }

  static async findById(id) {
    await this.expireEndedDeals();

    const rows = await query(
      `SELECT d.*, s.store_name, s.location AS store_location,
              dc.category_name AS deal_category_name
       FROM deals d
       INNER JOIN stores s ON s.id = d.store_id
       LEFT JOIN deal_categories dc ON dc.id = d.deal_category_id
       WHERE d.id = ?
      LIMIT 1`,
      [id],
    );

    if (!rows[0]) {
      return null;
    }

    const [deal] = await this.attachImages([rows[0]]);
    return this.mapDealState(deal);
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
      conditions.push(
        "(d.title LIKE ? OR d.description LIKE ? OR s.store_name LIKE ?)",
      );
      params.push(
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
      );
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const deals = await query(
      `SELECT d.*, s.store_name, s.location AS store_location,
              dc.category_name AS deal_category_name
       FROM deals d
       INNER JOIN stores s ON s.id = d.store_id
       LEFT JOIN deal_categories dc ON dc.id = d.deal_category_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params,
    );

    const dealsWithImages = await this.attachImages(deals);
    return dealsWithImages.map((deal) => this.mapDealState(deal));
  }

  static async addImage({ deal_id, image_path }) {
    const deal = await this.findById(deal_id);
    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    const result = await query(
      "INSERT INTO deal_images (deal_id, image_path) VALUES (?, ?)",
      [deal_id, image_path],
    );

    const rows = await query("SELECT * FROM deal_images WHERE id = ? LIMIT 1", [
      result.insertId,
    ]);
    return rows[0] || null;
  }

  static async findImageById(imageId) {
    const rows = await query(
      `SELECT di.*, d.store_id
       FROM deal_images di
       INNER JOIN deals d ON d.id = di.deal_id
       WHERE di.id = ?
       LIMIT 1`,
      [imageId],
    );

    return rows[0] || null;
  }

  static async updateImage(imageId, imagePath) {
    const existingImage = await this.findImageById(imageId);
    if (!existingImage) {
      throw new HttpError(404, "Deal image not found");
    }

    await query("UPDATE deal_images SET image_path = ? WHERE id = ?", [
      imagePath,
      imageId,
    ]);

    const rows = await query("SELECT * FROM deal_images WHERE id = ? LIMIT 1", [imageId]);
    return rows[0] || null;
  }

  static async deleteImage(imageId) {
    const existingImage = await this.findImageById(imageId);
    if (!existingImage) {
      throw new HttpError(404, "Deal image not found");
    }

    await query("DELETE FROM deal_images WHERE id = ?", [imageId]);
    return existingImage;
  }

  static async update(id, payload) {
    const existingDeal = await this.findById(id);
    if (!existingDeal) {
      throw new HttpError(404, "Deal not found");
    }

    const nextStoreId = payload.store_id || existingDeal.store_id;
    const store = await query("SELECT id FROM stores WHERE id = ? LIMIT 1", [
      nextStoreId,
    ]);
    if (!store[0]) {
      throw new HttpError(404, "Store not found");
    }

    const nextOriginalPrice =
      payload.original_price !== undefined && payload.original_price !== ""
        ? payload.original_price
        : existingDeal.original_price;
    const nextDiscountPrice =
      payload.discount_price !== undefined && payload.discount_price !== ""
        ? payload.discount_price
        : existingDeal.discount_price;
    const nextDiscountRate = this.computeDiscountRate(
      nextOriginalPrice,
      nextDiscountPrice,
    );
    const nextSchedule = this.mergeSchedule(existingDeal, payload);
    const specificationProvided = Object.prototype.hasOwnProperty.call(
      payload,
      "specification",
    );
    const nextSpecification = specificationProvided
      ? this.normalizeSpecification(payload.specification)
      : existingDeal.specification;
    const replaceImages =
      String(payload.replace_images || "").toLowerCase() === "true" ||
      payload.replace_images === true ||
      payload.replace_images === 1 ||
      payload.replace_images === "1";
    const incomingImages = this.normalizeImagePaths(
      payload.image_paths || payload.images,
    );
    const nextStatus = this.resolveStatus(existingDeal, payload, nextSchedule);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE deals
         SET title = ?,
             store_id = ?,
             original_price = ?,
             discount_price = ?,
             discount_rate = ?,
             description = ?,
             specification = ?,
             deal_category_id = ?,
             start_date = ?,
             end_date = ?,
             status = ?
         WHERE id = ?`,
        [
          payload.title || existingDeal.title,
          nextStoreId,
          nextOriginalPrice,
          nextDiscountPrice,
          nextDiscountRate,
          payload.description !== undefined
            ? payload.description || null
            : existingDeal.description,
          nextSpecification ? JSON.stringify(nextSpecification) : null,
          payload.deal_category_id !== undefined
            ? payload.deal_category_id || null
            : existingDeal.deal_category_id,
          nextSchedule.start_date,
          nextSchedule.end_date,
          nextStatus,
          id,
        ],
      );

      if (replaceImages) {
        await connection.execute("DELETE FROM deal_images WHERE deal_id = ?", [id]);
      }

      for (const imagePath of incomingImages) {
        await connection.execute(
          "INSERT INTO deal_images (deal_id, image_path) VALUES (?, ?)",
          [id, imagePath],
        );
      }

      await connection.commit();
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async delete(id) {
    const existingDeal = await this.findById(id);
    if (!existingDeal) {
      throw new HttpError(404, "Deal not found");
    }

    await query("DELETE FROM deals WHERE id = ?", [id]);
    return existingDeal;
  }
}

module.exports = Deal;
