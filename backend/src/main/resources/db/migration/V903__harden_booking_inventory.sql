-- ============================================================================
-- V903: booking idempotency and durable inventory reservation state.
-- ============================================================================

ALTER TABLE `booking`
  ADD COLUMN `idempotency_key` VARCHAR(64) DEFAULT NULL AFTER `booking_no`,
  ADD COLUMN `request_fingerprint` CHAR(64) DEFAULT NULL AFTER `idempotency_key`,
  ADD COLUMN `inventory_reserved` TINYINT NOT NULL DEFAULT 0 AFTER `payment_status`,
  ADD UNIQUE KEY `uk_booking_tenant_idempotency` (`tenant_id`, `idempotency_key`);
