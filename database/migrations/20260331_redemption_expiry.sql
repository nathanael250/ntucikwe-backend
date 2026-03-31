USE deals_platform;

ALTER TABLE redemption_requests
    ADD COLUMN expires_at DATETIME NULL AFTER total_savings,
    MODIFY COLUMN status ENUM('pending', 'used', 'expired', 'cancelled') NOT NULL DEFAULT 'pending';

UPDATE redemption_requests
SET expires_at = DATE_ADD(created_at, INTERVAL 1440 MINUTE)
WHERE expires_at IS NULL;

ALTER TABLE redemption_requests
    MODIFY COLUMN expires_at DATETIME NOT NULL;

UPDATE redemption_requests
SET status = 'expired'
WHERE status = 'pending'
  AND expires_at < NOW();
