CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `username` VARCHAR(64) DEFAULT NULL,
  `role` VARCHAR(32) DEFAULT NULL,
  `action` VARCHAR(16) NOT NULL,
  `resource` VARCHAR(256) NOT NULL,
  `request_id` VARCHAR(64) NOT NULL,
  `client_ip` VARCHAR(64) DEFAULT NULL,
  `http_status` INT NOT NULL,
  `success` TINYINT NOT NULL DEFAULT 0,
  `occurred_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_tenant_time` (`tenant_id`, `occurred_at`),
  KEY `idx_audit_user_time` (`tenant_id`, `user_id`, `occurred_at`),
  CONSTRAINT `fk_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安全审计日志';
