const crypto = require("crypto");
const { pool, query } = require("../config/database");
const HttpError = require("../utils/httpError");

class RedemptionRequest {
  static normalizeQrToken(value) {
    if (!value) {
      return "";
    }

    const rawValue = String(value).trim();
    const legacyPrefix = "deals-platform:redemption:";

    if (rawValue.startsWith(legacyPrefix)) {
      return rawValue.slice(legacyPrefix.length).trim();
    }

    return rawValue;
  }

  static getExpiryMinutes(customValue) {
    const rawValue = customValue || process.env.QR_EXPIRY_MINUTES || 1440;
    const expiryMinutes = Number(rawValue);

    if (!Number.isFinite(expiryMinutes) || expiryMinutes <= 0) {
      return 1440;
    }

    return Math.min(Math.floor(expiryMinutes), 10080);
  }

  static normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpError(400, "Items must be a non-empty array");
    }

    const mergedItems = new Map();

    for (const item of items) {
      const dealId = Number(item.deal_id);
      const quantity = Number(item.quantity || item.qty || 1);

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

  static buildStoreMessage({ storeName, totalItems, totalDiscountAmount, totalSavings, items }) {
    const itemText = items
      .map((item) => `${item.deal_title} x${item.quantity}`)
      .join(", ");

    return `Store: ${storeName}. Selected: ${itemText}. Total items: ${totalItems}. Payable: ${Number(
      totalDiscountAmount
    ).toFixed(2)}. Savings: ${Number(totalSavings).toFixed(2)}.`;
  }

  static buildOrderMessage({ storeSummaries, totalItems, totalDiscountAmount, totalSavings }) {
    const storesText = storeSummaries
      .map((storeSummary) => `${storeSummary.store_name} (${storeSummary.total_items} items)`)
      .join(", ");

    return `Stores: ${storesText}. Total items: ${totalItems}. Payable: ${Number(
      totalDiscountAmount
    ).toFixed(2)}. Savings: ${Number(totalSavings).toFixed(2)}.`;
  }

  static buildQrValue(qrToken) {
    return this.normalizeQrToken(qrToken);
  }

  static buildOrderCode() {
    return `ORD-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }

  static mapRedemptionState(redemption) {
    const isExpired =
      redemption.status === "expired" ||
      (redemption.status === "pending" &&
        redemption.expires_at &&
        new Date(redemption.expires_at) <= new Date());

    return {
      ...redemption,
      qr_value: this.buildQrValue(redemption.qr_token),
      is_used: redemption.status === "used",
      is_expired: isExpired,
      can_be_used: redemption.status === "pending" && !isExpired
    };
  }

  static async hydrateRedemptionById(id) {
    const requestRows = await query(
      `SELECT rr.*, o.order_code, o.status AS order_status, s.store_name,
              COALESCE(NULLIF(TRIM(CONCAT(customer.first_name, ' ', customer.last_name)), ''), o.customer_name) AS customer_name,
              COALESCE(customer.email, o.email) AS customer_email,
              COALESCE(customer.phone_number, o.phone_number) AS customer_phone_number,
              CONCAT(scanner.first_name, ' ', scanner.last_name) AS used_by_name
       FROM redemption_requests rr
       INNER JOIN orders o ON o.id = rr.order_id
       INNER JOIN stores s ON s.id = rr.store_id
       LEFT JOIN users customer ON customer.id = rr.user_id
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

    return this.mapRedemptionState({
      ...request,
      items
    });
  }

  static async hydrateOrderById(orderId) {
    const orderRows = await query(
      `SELECT o.*,
              COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), o.customer_name) AS customer_name,
              COALESCE(u.email, o.email) AS customer_email,
              COALESCE(u.phone_number, o.phone_number) AS customer_phone_number
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = ?
       LIMIT 1`,
      [orderId]
    );

    const order = orderRows[0];
    if (!order) {
      return null;
    }

    const items = await query(
      `SELECT oi.*, s.store_name
       FROM order_items oi
       INNER JOIN stores s ON s.id = oi.store_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [orderId]
    );

    const redemptionRows = await query(
      `SELECT rr.*, o.order_code, o.status AS order_status, s.store_name,
              COALESCE(NULLIF(TRIM(CONCAT(customer.first_name, ' ', customer.last_name)), ''), o.customer_name) AS customer_name,
              COALESCE(customer.email, o.email) AS customer_email,
              COALESCE(customer.phone_number, o.phone_number) AS customer_phone_number,
              CONCAT(scanner.first_name, ' ', scanner.last_name) AS used_by_name
       FROM redemption_requests rr
       INNER JOIN orders o ON o.id = rr.order_id
       INNER JOIN stores s ON s.id = rr.store_id
       LEFT JOIN users customer ON customer.id = rr.user_id
       LEFT JOIN users scanner ON scanner.id = rr.used_by
       WHERE rr.order_id = ?
       ORDER BY rr.id ASC`,
      [orderId]
    );

    const redemptionsWithItems = [];

    for (const redemption of redemptionRows) {
      const redemptionItems = await query(
        `SELECT rri.*, d.description, d.discount_rate
         FROM redemption_request_items rri
         INNER JOIN deals d ON d.id = rri.deal_id
         WHERE rri.redemption_request_id = ?
         ORDER BY rri.id ASC`,
        [redemption.id]
      );

      redemptionsWithItems.push(
        this.mapRedemptionState({
          ...redemption,
          items: redemptionItems
        })
      );
    }

    return {
      ...order,
      items,
      store_redemptions: redemptionsWithItems
    };
  }

  static async hydrateOrderByCode(orderCode) {
    const rows = await query(
      "SELECT id FROM orders WHERE order_code = ? LIMIT 1",
      [orderCode]
    );

    if (!rows[0]) {
      return null;
    }

    return this.hydrateOrderById(rows[0].id);
  }

  static async filterOrderForVendor(order, vendorId) {
    const rows = await query(
      `SELECT DISTINCT rr.store_id
       FROM redemption_requests rr
       INNER JOIN stores s ON s.id = rr.store_id
       WHERE rr.order_id = ?
         AND s.vendor_id = ?`,
      [order.id, vendorId]
    );

    const allowedStoreIds = rows.map((row) => Number(row.store_id));
    if (allowedStoreIds.length === 0) {
      throw new HttpError(403, "You do not have access to this order");
    }

    return {
      ...order,
      items: order.items.filter((item) => allowedStoreIds.includes(Number(item.store_id))),
      store_redemptions: order.store_redemptions.filter((redemption) =>
        allowedStoreIds.includes(Number(redemption.store_id))
      )
    };
  }

  static async findOrderForActor({ order_id, order_code, actor }) {
    if (!order_id && !order_code) {
      throw new HttpError(400, "order_id or order_code is required");
    }

    const order = order_id
      ? await this.hydrateOrderById(order_id)
      : await this.hydrateOrderByCode(order_code);

    if (!order) {
      return null;
    }

    await this.syncExpiredStatusesByOrder(order.id);
    await this.syncOrderStatus(order.id);
    const freshOrder = await this.hydrateOrderById(order.id);

    if (actor.role === "admin") {
      return freshOrder;
    }

    if (Number(freshOrder.user_id) === Number(actor.id)) {
      return freshOrder;
    }

    if (actor.role === "vendor") {
      return this.filterOrderForVendor(freshOrder, actor.id);
    }

    throw new HttpError(403, "You do not have access to this order");
  }

  static async listUsedForActor({ actor, limit, offset, store_id, order_code, search }) {
    const conditions = ["rr.status = 'used'"];
    const params = [];
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    if (actor.role === "vendor") {
      conditions.push("s.vendor_id = ?");
      params.push(actor.id);
    } else if (actor.role !== "admin") {
      throw new HttpError(403, "You do not have access to used QR codes");
    }

    if (store_id) {
      conditions.push("rr.store_id = ?");
      params.push(Number(store_id));
    }

    if (order_code) {
      conditions.push("o.order_code = ?");
      params.push(order_code);
    }

    if (search) {
      conditions.push(
        `(
          o.order_code LIKE ?
          OR s.store_name LIKE ?
          OR COALESCE(NULLIF(TRIM(CONCAT(customer.first_name, ' ', customer.last_name)), ''), o.customer_name, '') LIKE ?
          OR COALESCE(customer.email, o.email, '') LIKE ?
          OR COALESCE(customer.phone_number, o.phone_number, '') LIKE ?
        )`
      );
      params.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    const rows = await query(
      `SELECT rr.*, o.order_code, o.status AS order_status, s.store_name, s.vendor_id,
              COALESCE(NULLIF(TRIM(CONCAT(customer.first_name, ' ', customer.last_name)), ''), o.customer_name) AS customer_name,
              COALESCE(customer.email, o.email) AS customer_email,
              COALESCE(customer.phone_number, o.phone_number) AS customer_phone_number,
              CONCAT(scanner.first_name, ' ', scanner.last_name) AS used_by_name
       FROM redemption_requests rr
       INNER JOIN orders o ON o.id = rr.order_id
       INNER JOIN stores s ON s.id = rr.store_id
       LEFT JOIN users customer ON customer.id = rr.user_id
       LEFT JOIN users scanner ON scanner.id = rr.used_by
       WHERE ${conditions.join(" AND ")}
       ORDER BY rr.used_at DESC, rr.id DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    const results = [];

    for (const row of rows) {
      const items = await query(
        `SELECT rri.*, d.description, d.discount_rate
         FROM redemption_request_items rri
         INNER JOIN deals d ON d.id = rri.deal_id
         WHERE rri.redemption_request_id = ?
         ORDER BY rri.id ASC`,
        [row.id]
      );

      results.push(
        this.mapRedemptionState({
          ...row,
          items
        })
      );
    }

    return results;
  }

  static async syncExpiredStatusesByOrder(orderId, connection = null) {
    const runner = connection || { execute: async (sql, params) => query(sql, params) };

    await runner.execute(
      `UPDATE redemption_requests
       SET status = 'expired'
       WHERE order_id = ?
         AND status = 'pending'
         AND expires_at < NOW()`,
      [orderId]
    );
  }

  static async syncExpiredStatusByToken(qrToken) {
    const normalizedToken = this.normalizeQrToken(qrToken);
    const rows = await query(
      "SELECT order_id FROM redemption_requests WHERE qr_token = ? LIMIT 1",
      [normalizedToken]
    );

    if (!rows[0]) {
      return;
    }

    await this.syncExpiredStatusesByOrder(rows[0].order_id);
    await this.syncOrderStatus(rows[0].order_id);
  }

  static async syncOrderStatus(orderId, connection = null) {
    const statusRows = connection
      ? (await connection.execute(
          `SELECT status
           FROM redemption_requests
           WHERE order_id = ?`,
          [orderId]
        ))[0]
      : await query(
          `SELECT status
           FROM redemption_requests
           WHERE order_id = ?`,
          [orderId]
        );

    if (!statusRows || statusRows.length === 0) {
      return;
    }

    const statuses = statusRows.map((row) => row.status);
    let nextStatus = "pending";

    if (statuses.every((status) => status === "used")) {
      nextStatus = "completed";
    } else if (statuses.some((status) => status === "used")) {
      nextStatus = "partially_used";
    } else if (statuses.every((status) => status === "expired")) {
      nextStatus = "expired";
    } else if (statuses.every((status) => status === "cancelled")) {
      nextStatus = "cancelled";
    }

    if (connection) {
      await connection.execute(
        `UPDATE orders
         SET status = ?
         WHERE id = ?`,
        [nextStatus, orderId]
      );
      return;
    }

    await query(
      `UPDATE orders
       SET status = ?
       WHERE id = ?`,
      [nextStatus, orderId]
    );
  }

  static async createFromSelection({
    user_id,
    customer_name,
    phone_number,
    email,
    items,
    expires_in_minutes
  }) {
    const normalizedItems = this.normalizeItems(items);
    const normalizedCustomerName = customer_name ? String(customer_name).trim() : null;
    const normalizedPhoneNumber = phone_number ? String(phone_number).trim() : null;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    if (!user_id) {
      if (!normalizedCustomerName || !normalizedPhoneNumber || !normalizedEmail) {
        throw new HttpError(
          400,
          "Guest checkout requires customer_name, phone_number, and email"
        );
      }
    }

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

      const groupedByStore = itemSnapshots.reduce((accumulator, item) => {
        accumulator[item.store_id] = accumulator[item.store_id] || {
          store_id: item.store_id,
          store_name: item.store_name,
          items: []
        };
        accumulator[item.store_id].items.push(item);
        return accumulator;
      }, {});

      const storeGroups = Object.values(groupedByStore).map((group) => {
        const totals = group.items.reduce(
          (accumulator, item) => {
            accumulator.total_items += item.quantity;
            accumulator.total_original_amount += item.original_price * item.quantity;
            accumulator.total_discount_amount += item.discount_price * item.quantity;
            return accumulator;
          },
          {
            total_items: 0,
            total_original_amount: 0,
            total_discount_amount: 0
          }
        );

        totals.total_savings = totals.total_original_amount - totals.total_discount_amount;

        return {
          ...group,
          ...totals,
          summary_message: this.buildStoreMessage({
            storeName: group.store_name,
            totalItems: totals.total_items,
            totalDiscountAmount: totals.total_discount_amount,
            totalSavings: totals.total_savings,
            items: group.items
          })
        };
      });

      const orderTotals = storeGroups.reduce(
        (accumulator, group) => {
          accumulator.total_items += group.total_items;
          accumulator.total_original_amount += group.total_original_amount;
          accumulator.total_discount_amount += group.total_discount_amount;
          return accumulator;
        },
        {
          total_items: 0,
          total_original_amount: 0,
          total_discount_amount: 0
        }
      );

      orderTotals.total_savings =
        orderTotals.total_original_amount - orderTotals.total_discount_amount;

      const expiryMinutes = this.getExpiryMinutes(expires_in_minutes);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
      const orderCode = this.buildOrderCode();
      const orderSummaryMessage = this.buildOrderMessage({
        storeSummaries: storeGroups,
        totalItems: orderTotals.total_items,
        totalDiscountAmount: orderTotals.total_discount_amount,
        totalSavings: orderTotals.total_savings
      });

      const [insertOrder] = await connection.execute(
        `INSERT INTO orders
          (user_id, customer_name, phone_number, email, order_code, summary_message,
           total_items, total_original_amount, total_discount_amount, total_savings,
           expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          user_id,
          normalizedCustomerName,
          normalizedPhoneNumber,
          normalizedEmail,
          orderCode,
          orderSummaryMessage,
          orderTotals.total_items,
          orderTotals.total_original_amount.toFixed(2),
          orderTotals.total_discount_amount.toFixed(2),
          orderTotals.total_savings.toFixed(2),
          expiresAt
        ]
      );

      for (const item of itemSnapshots) {
        await connection.execute(
          `INSERT INTO order_items
            (order_id, store_id, deal_id, quantity, deal_title, original_price, discount_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            insertOrder.insertId,
            item.store_id,
            item.deal_id,
            item.quantity,
            item.deal_title,
            item.original_price.toFixed(2),
            item.discount_price.toFixed(2)
          ]
        );
      }

      for (const group of storeGroups) {
        const qrToken = crypto.randomBytes(24).toString("hex");

        const [insertRedemption] = await connection.execute(
          `INSERT INTO redemption_requests
            (order_id, user_id, store_id, qr_token, summary_message, total_items,
             total_original_amount, total_discount_amount, total_savings, expires_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            insertOrder.insertId,
            user_id,
            group.store_id,
            qrToken,
            group.summary_message,
            group.total_items,
            group.total_original_amount.toFixed(2),
            group.total_discount_amount.toFixed(2),
            group.total_savings.toFixed(2),
            expiresAt
          ]
        );

        for (const item of group.items) {
          await connection.execute(
            `INSERT INTO redemption_request_items
              (redemption_request_id, deal_id, quantity, deal_title, original_price, discount_price)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              insertRedemption.insertId,
              item.deal_id,
              item.quantity,
              item.deal_title,
              item.original_price.toFixed(2),
              item.discount_price.toFixed(2)
            ]
          );
        }
      }

      await connection.commit();
      return this.hydrateOrderById(insertOrder.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByToken(qrToken) {
    const normalizedToken = this.normalizeQrToken(qrToken);
    await this.syncExpiredStatusByToken(normalizedToken);

    const rows = await query(
      "SELECT id FROM redemption_requests WHERE qr_token = ? LIMIT 1",
      [normalizedToken]
    );

    if (!rows[0]) {
      return null;
    }

    return this.hydrateRedemptionById(rows[0].id);
  }

  static async markAsUsed({ qr_token, used_by }) {
    const normalizedToken = this.normalizeQrToken(qr_token);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id, order_id, status, expires_at
         FROM redemption_requests
         WHERE qr_token = ?
         LIMIT 1
         FOR UPDATE`,
        [normalizedToken]
      );

      const request = rows[0];
      if (!request) {
        throw new HttpError(404, "QR code not found");
      }

      if (request.status === "used") {
        throw new HttpError(409, "QR code has already been used");
      }

      if (request.status === "expired" || new Date(request.expires_at) <= new Date()) {
        await connection.execute(
          `UPDATE redemption_requests
           SET status = 'expired'
           WHERE id = ?`,
          [request.id]
        );

        await this.syncOrderStatus(request.order_id, connection);
        throw new HttpError(409, "QR code has expired");
      }

      await connection.execute(
        `UPDATE redemption_requests
         SET status = 'used',
             used_at = NOW(),
             used_by = ?
         WHERE id = ?`,
        [used_by, request.id]
      );

      await this.syncOrderStatus(request.order_id, connection);
      await connection.commit();
      return this.hydrateRedemptionById(request.id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = RedemptionRequest;
