CREATE DATABASE IF NOT EXISTS deals_platform;
USE deals_platform;

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(30) UNIQUE,
    address TEXT,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'vendor', 'public_user') NOT NULL DEFAULT 'public_user',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE store_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE deal_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE stores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_id BIGINT UNSIGNED NOT NULL,
    store_name VARCHAR(150) NOT NULL,
    description TEXT,
    banner VARCHAR(255),
    profile_image VARCHAR(255),
    location VARCHAR(150),
    address TEXT,
    store_category_id BIGINT UNSIGNED,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_stores_vendor
        FOREIGN KEY (vendor_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_stores_category
        FOREIGN KEY (store_category_id) REFERENCES store_categories(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE deals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    store_id BIGINT UNSIGNED NOT NULL,
    original_price DECIMAL(12,2) NOT NULL,
    discount_price DECIMAL(12,2) NOT NULL,
    discount_rate DECIMAL(5,2) DEFAULT 0.00,
    description TEXT,
    specification JSON NULL,
    deal_category_id BIGINT UNSIGNED,
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    status ENUM('active', 'inactive', 'expired') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_deals_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_deals_category
        FOREIGN KEY (deal_category_id) REFERENCES deal_categories(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_deal_prices CHECK (discount_price <= original_price)
);

CREATE TABLE deal_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    deal_id BIGINT UNSIGNED NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_deal_images_deal
        FOREIGN KEY (deal_id) REFERENCES deals(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE ads (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(150),
    banner VARCHAR(255),
    owner_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ads_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('unread', 'read') NOT NULL DEFAULT 'unread',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE subscription_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    duration_in_days INT NOT NULL,
    max_ads INT NOT NULL DEFAULT 0,
    max_deals INT NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    customer_name VARCHAR(200) NULL,
    phone_number VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
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

CREATE TABLE order_items (
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

CREATE TABLE redemption_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    store_id BIGINT UNSIGNED NOT NULL,
    qr_token VARCHAR(100) NOT NULL UNIQUE,
    summary_message TEXT NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    total_original_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_savings DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    expires_at DATETIME NOT NULL,
    status ENUM('pending', 'used', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
    used_at DATETIME NULL,
    used_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_redemption_requests_order_store (order_id, store_id),
    CONSTRAINT fk_redemption_requests_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
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

CREATE TABLE redemption_request_items (
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
