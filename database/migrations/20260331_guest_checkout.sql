ALTER TABLE orders
    MODIFY COLUMN user_id BIGINT UNSIGNED NULL,
    ADD COLUMN customer_name VARCHAR(200) NULL AFTER user_id,
    ADD COLUMN phone_number VARCHAR(30) NULL AFTER customer_name,
    ADD COLUMN email VARCHAR(150) NULL AFTER phone_number;

ALTER TABLE redemption_requests
    MODIFY COLUMN user_id BIGINT UNSIGNED NULL;
