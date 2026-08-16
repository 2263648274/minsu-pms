-- ============================================================================
-- V901: tenant ownership and tenant-scoped uniqueness
-- The legacy single-tenant data is assigned to tenant 1.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `tenant` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(64)  NOT NULL,
  `name`       VARCHAR(128) NOT NULL,
  `status`     TINYINT      NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`    TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户';

INSERT INTO `tenant` (`id`, `code`, `name`, `status`)
VALUES (1, 'DEFAULT', '默认租户', 1)
ON DUPLICATE KEY UPDATE `id` = `id`;

ALTER TABLE `user`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  ADD KEY `idx_user_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_user_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `property`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_code`,
  ADD UNIQUE KEY `uk_property_tenant_code` (`tenant_id`, `code`),
  ADD CONSTRAINT `fk_property_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `room_type`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_property_code`,
  ADD UNIQUE KEY `uk_room_type_tenant_code` (`tenant_id`, `property_id`, `code`),
  ADD KEY `idx_room_type_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_room_type_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `room`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_property_room_no`,
  ADD UNIQUE KEY `uk_room_tenant_no` (`tenant_id`, `property_id`, `room_no`),
  ADD KEY `idx_room_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_room_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `rate_plan`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_room_type_code`,
  ADD UNIQUE KEY `uk_rate_plan_tenant_code` (`tenant_id`, `room_type_id`, `code`),
  ADD KEY `idx_rate_plan_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_rate_plan_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `rate_calendar`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_plan_date`,
  ADD UNIQUE KEY `uk_rate_calendar_tenant_date` (`tenant_id`, `rate_plan_id`, `stay_date`),
  ADD KEY `idx_rate_calendar_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_rate_calendar_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `inventory`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_room_type_date`,
  ADD UNIQUE KEY `uk_inventory_tenant_date` (`tenant_id`, `room_type_id`, `stay_date`),
  ADD KEY `idx_inventory_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_inventory_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `customer`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  ADD KEY `idx_customer_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_customer_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `booking`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_booking_no`,
  ADD UNIQUE KEY `uk_booking_tenant_no` (`tenant_id`, `booking_no`),
  ADD KEY `idx_booking_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_booking_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `payment`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  ADD KEY `idx_payment_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_payment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `channel`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_code`,
  ADD UNIQUE KEY `uk_channel_tenant_code` (`tenant_id`, `code`),
  ADD CONSTRAINT `fk_channel_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `channel_room_mapping`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  DROP INDEX `uk_channel_room`,
  ADD UNIQUE KEY `uk_channel_room_tenant` (`tenant_id`, `channel_id`, `room_type_id`),
  ADD KEY `idx_channel_room_mapping_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_channel_room_mapping_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);

ALTER TABLE `ota_sync_log`
  ADD COLUMN `tenant_id` BIGINT NOT NULL DEFAULT 1 AFTER `id`,
  ADD KEY `idx_ota_sync_log_tenant` (`tenant_id`),
  ADD CONSTRAINT `fk_ota_sync_log_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`);
