USE deals_platform;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    order_code VARCHAR(100) NOT NULL UNIQUE,
    summary_message TEXT NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    total_original_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_savings DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    expires_at DATETIME NOT NULL,
    status ENUM('pending', 'partially_used', 'completed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    store_id BIGINT UNSIGNED NOT NULL,
    deal_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    deal_title VARCHAR(200) NOT NULL,
    original_price DECIMAL(12,2) NOT NULL,
    discount_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_deal
        FOREIGN KEY (deal_id) REFERENCES deals(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

ALTER TABLE redemption_requests
    ADD COLUMN order_id BIGINT UNSIGNED NULL FIRST;

INSERT INTO orders (
    user_id,
    order_code,
    summary_message,
    total_items,
    total_original_amount,
    total_discount_amount,
    total_savings,
    expires_at,
    status,
    created_at,
    updated_at
)
SELECT
    rr.user_id,
    CONCAT('ORD-LEGACY-', rr.id),
    rr.summary_message,
    rr.total_items,
    rr.total_original_amount,
    rr.total_discount_amount,
    rr.total_savings,
    rr.expires_at,
    CASE
        WHEN rr.status = 'used' THEN 'completed'
        WHEN rr.status = 'expired' THEN 'expired'
        WHEN rr.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END,
    rr.created_at,
    rr.updated_at
FROM redemption_requests rr
LEFT JOIN orders o ON o.order_code = CONCAT('ORD-LEGACY-', rr.id)
WHERE o.id IS NULL;

UPDATE redemption_requests rr
INNER JOIN orders o ON o.order_code = CONCAT('ORD-LEGACY-', rr.id)
SET rr.order_id = o.id
WHERE rr.order_id IS NULL;

INSERT INTO order_items (
    order_id,
    store_id,
    deal_id,
    quantity,
    deal_title,
    original_price,
    discount_price,
    created_at,
    updated_at
)
SELECT
    rr.order_id,
    rr.store_id,
    rri.deal_id,
    rri.quantity,
    rri.deal_title,
    rri.original_price,
    rri.discount_price,
    rri.created_at,
    rri.updated_at
FROM redemption_request_items rri
INNER JOIN redemption_requests rr ON rr.id = rri.redemption_request_id
LEFT JOIN order_items oi
    ON oi.order_id = rr.order_id
   AND oi.deal_id = rri.deal_id
   AND oi.store_id = rr.store_id
WHERE oi.id IS NULL;

ALTER TABLE redemption_requests
    MODIFY COLUMN order_id BIGINT UNSIGNED NOT NULL,
    ADD CONSTRAINT fk_redemption_requests_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    ADD UNIQUE KEY uq_redemption_requests_order_store (order_id, store_id);
