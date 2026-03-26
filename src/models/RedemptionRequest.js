const crypto = require("crypto");
const { pool, query } = require("../config/database");
const HttpError = require("../utils/httpError");

class RedemptionRequest {
  static normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpError(400, "Items must be a non-empty array");
    }

    const mergedItems = new Map();

    for (const item of items) {
      const dealId = Number(item.deal_id);
      const quantity = Number(item.quantity || 1);

      if (!dealId || Number.isNaN(dealId)) {
        throw new HttpError(400, "Each selected item must include a valid deal_id");
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new HttpError(400, "Each selected item must include a valid quantity");
      }

      const currentQuantity = mergedItems.get(dealId) || 0;
      mergedItems.set(dealId, currentQuantity + quantity);
    }

    return [...mergedItems.entries()].map(([deal_id, quantity]) => ({
      deal_id,
      quantity
    }));
  }

  static buildMessage({ storeName, totalItems, totalDiscountAmount, totalSavings, items }) {
    const itemText = items
      .map((item) => `${item.deal_title} x${item.quantity}`)
      .join(", ");

    return `Store: ${storeName}. Selected: ${itemText}. Total items: ${totalItems}. Payable: ${Number(
      totalDiscountAmount
    ).toFixed(2)}. Savings: ${Number(totalSavings).toFixed(2)}.`;
  }

  static buildQrValue(qrToken) {
    return `deals-platform:redemption:${qrToken}`;
  }

  static async hydrateById(id) {
    const requestRows = await query(
      `SELECT rr.*, s.store_name,
              CONCAT(customer.first_name, ' ', customer.last_name) AS customer_name,
              customer.email AS customer_email,
              CONCAT(scanner.first_name, ' ', scanner.last_name) AS used_by_name
       FROM redemption_requests rr
       INNER JOIN stores s ON s.id = rr.store_id
       INNER JOIN users customer ON customer.id = rr.user_id
       LEFT JOIN users scanner ON scanner.id = rr.used_by
       WHERE rr.id = ?
       LIMIT 1`,
      [id]
    );

    const request = requestRows[0];
    if (!request) {
      return null;
    }

    const items = await query(
      `SELECT rri.*, d.description, d.discount_rate
       FROM redemption_request_items rri
       INNER JOIN deals d ON d.id = rri.deal_id
       WHERE rri.redemption_request_id = ?
       ORDER BY rri.id ASC`,
      [id]
    );

    return {
      ...request,
      qr_value: this.buildQrValue(request.qr_token),
      items
    };
  }

  static async createFromSelection({ user_id, items }) {
    const normalizedItems = this.normalizeItems(items);
    const dealIds = [...new Set(normalizedItems.map((item) => item.deal_id))];
    const placeholders = dealIds.map(() => "?").join(", ");
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [dealRows] = await connection.execute(
        `SELECT d.id, d.title, d.store_id, d.original_price, d.discount_price, d.status,
                d.end_date, s.store_name
         FROM deals d
         INNER JOIN stores s ON s.id = d.store_id
         WHERE d.id IN (${placeholders})`,
        dealIds
      );

      if (dealRows.length !== dealIds.length) {
        throw new HttpError(404, "One or more selected deals do not exist");
      }

      const dealMap = new Map(dealRows.map((deal) => [Number(deal.id), deal]));
      const firstStoreId = Number(dealRows[0].store_id);

      const itemSnapshots = normalizedItems.map((selectedItem) => {
        const deal = dealMap.get(selectedItem.deal_id);
        if (!deal) {
          throw new HttpError(404, `Deal ${selectedItem.deal_id} not found`);
        }

        if (deal.status !== "active") {
          throw new HttpError(400, `Deal ${deal.title} is not active`);
        }

        if (deal.end_date && new Date(deal.end_date) < new Date()) {
          throw new HttpError(400, `Deal ${deal.title} has already expired`);
        }

        if (Number(deal.store_id) !== firstStoreId) {
          throw new HttpError(
            400,
            "All selected deals must belong to the same store for one QR checkout"
          );
        }

        return {
          deal_id: Number(deal.id),
          store_id: Number(deal.store_id),
          store_name: deal.store_name,
          deal_title: deal.title,
          quantity: selectedItem.quantity,
          original_price: Number(deal.original_price),
          discount_price: Number(deal.discount_price)
        };
      });

      const totals = itemSnapshots.reduce(
        (accumulator, item) => {
          accumulator.totalItems += item.quantity;
          accumulator.totalOriginalAmount += item.original_price * item.quantity;
          accumulator.totalDiscountAmount += item.discount_price * item.quantity;
          return accumulator;
        },
        {
          totalItems: 0,
          totalOriginalAmount: 0,
          totalDiscountAmount: 0
        }
      );

      totals.totalSavings = totals.totalOriginalAmount - totals.totalDiscountAmount;

      const summaryMessage = this.buildMessage({
        storeName: itemSnapshots[0].store_name,
        totalItems: totals.totalItems,
        totalDiscountAmount: totals.totalDiscountAmount,
        totalSavings: totals.totalSavings,
        items: itemSnapshots
      });

      const qrToken = crypto.randomBytes(24).toString("hex");

      const [insertRequest] = await connection.execute(
        `INSERT INTO redemption_requests
          (user_id, store_id, qr_token, summary_message, total_items,
           total_original_amount, total_discount_amount, total_savings, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          user_id,
          firstStoreId,
          qrToken,
          summaryMessage,
          totals.totalItems,
          totals.totalOriginalAmount.toFixed(2),
          totals.totalDiscountAmount.toFixed(2),
          totals.totalSavings.toFixed(2)
        ]
      );

      for (const item of itemSnapshots) {
        await connection.execute(
          `INSERT INTO redemption_request_items
            (redemption_request_id, deal_id, quantity, deal_title, original_price, discount_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            insertRequest.insertId,
            item.deal_id,
            item.quantity,
            item.deal_title,
            item.original_price.toFixed(2),
            item.discount_price.toFixed(2)
          ]
        );
      }

      await connection.commit();
      return this.hydrateById(insertRequest.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByToken(qrToken) {
    const rows = await query(
      "SELECT id FROM redemption_requests WHERE qr_token = ? LIMIT 1",
      [qrToken]
    );

    if (!rows[0]) {
      return null;
    }

    return this.hydrateById(rows[0].id);
  }

  static async markAsUsed({ qr_token, used_by }) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id, status
         FROM redemption_requests
         WHERE qr_token = ?
         LIMIT 1
         FOR UPDATE`,
        [qr_token]
      );

      const request = rows[0];
      if (!request) {
        throw new HttpError(404, "QR code not found");
      }

      if (request.status === "used") {
        throw new HttpError(409, "QR code has already been used");
      }

      await connection.execute(
        `UPDATE redemption_requests
         SET status = 'used',
             used_at = NOW(),
             used_by = ?
         WHERE id = ?`,
        [used_by, request.id]
      );

      await connection.commit();
      return this.hydrateById(request.id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = RedemptionRequest;
