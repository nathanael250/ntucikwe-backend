ALTER TABLE users
ADD COLUMN business_proof_document VARCHAR(255) NULL AFTER status,
ADD COLUMN business_proof_uploaded_at DATETIME NULL AFTER business_proof_document;
