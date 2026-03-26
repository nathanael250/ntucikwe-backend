USE deals_platform;

CREATE TABLE IF NOT EXISTS redemption_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    store_id BIGINT UNSIGNED NOT NULL,
    qr_token VARCHAR(100) NOT NULL UNIQUE,
    summary_message TEXT NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    total_original_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_savings DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'used', 'cancelled') NOT NULL DEFAULT 'pending',
    used_at DATETIME NULL,
    used_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_redemption_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_redemption_requests_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_redemption_requests_used_by
        FOREIGN KEY (used_by) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS redemption_request_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    redemption_request_id BIGINT UNSIGNED NOT NULL,
    deal_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    deal_title VARCHAR(200) NOT NULL,
    original_price DECIMAL(12,2) NOT NULL,
    discount_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_redemption_request_deal
        (redemption_request_id, deal_id),
    CONSTRAINT fk_redemption_items_request
        FOREIGN KEY (redemption_request_id) REFERENCES redemption_requests(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_redemption_items_deal
        FOREIGN KEY (deal_id) REFERENCES deals(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
