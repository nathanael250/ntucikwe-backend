USE deals_platform;

ALTER TABLE stores
ADD COLUMN profile_image VARCHAR(255) NULL AFTER banner;
