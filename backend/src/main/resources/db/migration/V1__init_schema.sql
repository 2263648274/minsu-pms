-- ============================================================================
-- V1: PMS 核心 Schema（14 张表）
-- InnoDB + utf8mb4 + 逻辑删除字段 deleted (0=正常, 1=删除)
-- 字段命名：created_at / updated_at 时间戳，金额 DECIMAL(10,2)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------
-- 1. 用户表（管理员账号）
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username`    VARCHAR(64)  NOT NULL                COMMENT '登录用户名',
  `password`    VARCHAR(255) NOT NULL                COMMENT 'BCrypt 加密密码',
  `real_name`   VARCHAR(64)           DEFAULT NULL   COMMENT '真实姓名',
  `email`       VARCHAR(128)          DEFAULT NULL   COMMENT '邮箱',
  `phone`       VARCHAR(32)           DEFAULT NULL   COMMENT '手机号',
  `role`        VARCHAR(32)  NOT NULL DEFAULT 'ADMIN' COMMENT '角色：ADMIN/STAFF',
  `status`      TINYINT      NOT NULL DEFAULT 1       COMMENT '1=启用 0=禁用',
  `last_login_at` DATETIME             DEFAULT NULL   COMMENT '上次登录时间',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`     TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员账号';

-- -----------------------------------------------------------------
-- 2. 物业表（一栋楼/一家酒店）
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `property`;
CREATE TABLE `property` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(128) NOT NULL                COMMENT '物业名称',
  `code`        VARCHAR(32)  NOT NULL                COMMENT '内部代号',
  `address`     VARCHAR(256)          DEFAULT NULL   COMMENT '地址',
  `city`        VARCHAR(64)           DEFAULT NULL   COMMENT '城市',
  `phone`       VARCHAR(32)           DEFAULT NULL   COMMENT '联系电话',
  `star_rating` TINYINT               DEFAULT NULL   COMMENT '星级 1-5',
  `description` TEXT                  DEFAULT NULL   COMMENT '简介',
  `status`      TINYINT      NOT NULL DEFAULT 1       COMMENT '1=营业 0=停业',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`     TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物业';

-- -----------------------------------------------------------------
-- 3. 房型表
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `room_type`;
CREATE TABLE `room_type` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `property_id`  BIGINT       NOT NULL                COMMENT '所属物业',
  `name`         VARCHAR(64)  NOT NULL                COMMENT '房型名称（标准间/大床房/套房）',
  `code`         VARCHAR(32)  NOT NULL                COMMENT '内部代号',
  `base_price`   DECIMAL(10,2) NOT NULL DEFAULT 0     COMMENT '默认房价',
  `max_occupancy` TINYINT      NOT NULL DEFAULT 2      COMMENT '最大入住人数',
  `area`         DECIMAL(6,2)          DEFAULT NULL   COMMENT '面积 m²',
  `bed_type`     VARCHAR(32)           DEFAULT NULL   COMMENT '床型（大床/双床）',
  `description`  TEXT                  DEFAULT NULL,
  `status`       TINYINT      NOT NULL DEFAULT 1,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`      TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_property_code` (`property_id`, `code`),
  KEY `idx_property` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房型';

-- -----------------------------------------------------------------
-- 4. 房间实例
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `room`;
CREATE TABLE `room` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `property_id`  BIGINT       NOT NULL,
  `room_type_id` BIGINT       NOT NULL,
  `room_no`      VARCHAR(32)  NOT NULL                COMMENT '门牌号',
  `floor`        SMALLINT              DEFAULT NULL   COMMENT '楼层',
  `status`       VARCHAR(16)  NOT NULL DEFAULT 'AVAILABLE' COMMENT 'AVAILABLE/OCCUPIED/CLEANING/MAINTENANCE/OFFLINE',
  `remarks`      VARCHAR(256)          DEFAULT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`      TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_property_room_no` (`property_id`, `room_no`),
  KEY `idx_room_type` (`room_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间';

-- -----------------------------------------------------------------
-- 5. 房价计划
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `rate_plan`;
CREATE TABLE `rate_plan` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `property_id`  BIGINT       NOT NULL,
  `room_type_id` BIGINT       NOT NULL,
  `name`         VARCHAR(128) NOT NULL                COMMENT '计划名称（标准价/会员价/周末价）',
  `code`         VARCHAR(32)  NOT NULL                COMMENT '计划代号',
  `base_price`   DECIMAL(10,2) NOT NULL DEFAULT 0,
  `currency`     VARCHAR(8)   NOT NULL DEFAULT 'CNY',
  `meal_plan`    VARCHAR(32)           DEFAULT 'NONE' COMMENT 'NONE/BREAKFAST/HALF_BOARD/FULL_BOARD/ALL_INCLUSIVE',
  `min_nights`   SMALLINT     NOT NULL DEFAULT 1,
  `max_nights`   SMALLINT              DEFAULT NULL,
  `description`  TEXT                  DEFAULT NULL,
  `active`       TINYINT      NOT NULL DEFAULT 1,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`      TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_room_type_code` (`room_type_id`, `code`),
  KEY `idx_property` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房价计划';

-- -----------------------------------------------------------------
-- 6. 房价日历（rate_plan × date 的具体价格）
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `rate_calendar`;
CREATE TABLE `rate_calendar` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `rate_plan_id` BIGINT       NOT NULL,
  `room_type_id` BIGINT       NOT NULL,
  `stay_date`    DATE         NOT NULL                COMMENT '入住日期',
  `price`        DECIMAL(10,2) NOT NULL,
  `currency`     VARCHAR(8)   NOT NULL DEFAULT 'CNY',
  `available`    TINYINT      NOT NULL DEFAULT 1      COMMENT '1=可售 0=不可售',
  `min_nights`   SMALLINT              DEFAULT NULL,
  `remarks`      VARCHAR(256)          DEFAULT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_date` (`rate_plan_id`, `stay_date`),
  KEY `idx_room_type_date` (`room_type_id`, `stay_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房价日历';

-- -----------------------------------------------------------------
-- 7. 库存/房态（room_type × date）
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `room_type_id`  BIGINT       NOT NULL,
  `stay_date`     DATE         NOT NULL,
  `total_rooms`   SMALLINT     NOT NULL DEFAULT 0    COMMENT '当日该房型总房间数',
  `sold_rooms`    SMALLINT     NOT NULL DEFAULT 0    COMMENT '已订数',
  `blocked_rooms` SMALLINT     NOT NULL DEFAULT 0    COMMENT '关房数',
  `status`        VARCHAR(16)  NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN/CLOSED/LIMITED',
  `remarks`       VARCHAR(256)          DEFAULT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_room_type_date` (`room_type_id`, `stay_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存房态';

-- -----------------------------------------------------------------
-- 8. 客人
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `customer`;
CREATE TABLE `customer` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(64)  NOT NULL,
  `phone`      VARCHAR(32)           DEFAULT NULL,
  `email`      VARCHAR(128)          DEFAULT NULL,
  `id_card`    VARCHAR(32)           DEFAULT NULL,
  `gender`     VARCHAR(8)            DEFAULT NULL   COMMENT 'M/F/U',
  `nationality` VARCHAR(32)          DEFAULT 'CN',
  `birthday`   DATE                  DEFAULT NULL,
  `vip_level`  TINYINT      NOT NULL DEFAULT 0      COMMENT '0=普通 1-5 等级',
  `preferences` TEXT                 DEFAULT NULL,
  `blacklist`  TINYINT      NOT NULL DEFAULT 0,
  `remarks`    VARCHAR(512)          DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`    TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客人';

-- -----------------------------------------------------------------
-- 9. 订单
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `booking`;
CREATE TABLE `booking` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `booking_no`      VARCHAR(32)  NOT NULL                COMMENT '订单号',
  `property_id`     BIGINT       NOT NULL,
  `room_type_id`    BIGINT       NOT NULL,
  `rate_plan_id`    BIGINT                DEFAULT NULL,
  `customer_id`     BIGINT       NOT NULL,
  `check_in_date`   DATE         NOT NULL,
  `check_out_date`  DATE         NOT NULL,
  `nights`          SMALLINT     NOT NULL,
  `rooms`           SMALLINT     NOT NULL DEFAULT 1,
  `guests`          SMALLINT     NOT NULL DEFAULT 1,
  `room_price`      DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_amount`    DECIMAL(10,2) NOT NULL DEFAULT 0,
  `paid_amount`     DECIMAL(10,2) NOT NULL DEFAULT 0,
  `currency`        VARCHAR(8)   NOT NULL DEFAULT 'CNY',
  `source`          VARCHAR(16)  NOT NULL DEFAULT 'DIRECT' COMMENT 'DIRECT/CTRIP/MEITUAN/FLIGGY/BOOKING/AIRBNB',
  `status`          VARCHAR(16)  NOT NULL DEFAULT 'PENDING'
                                  COMMENT 'PENDING/CONFIRMED/CHECKED_IN/CHECKED_OUT/CANCELLED/NO_SHOW',
  `payment_status`  VARCHAR(16)  NOT NULL DEFAULT 'UNPAID'
                                  COMMENT 'UNPAID/PARTIAL/PAID/REFUNDED',
  `guest_name`      VARCHAR(64)           DEFAULT NULL  COMMENT '入住人（可与 customer.name 不同）',
  `guest_phone`     VARCHAR(32)           DEFAULT NULL,
  `special_requests` VARCHAR(512)         DEFAULT NULL,
  `internal_notes`  TEXT                  DEFAULT NULL,
  `confirmed_at`    DATETIME              DEFAULT NULL,
  `checked_in_at`   DATETIME              DEFAULT NULL,
  `checked_out_at`  DATETIME              DEFAULT NULL,
  `cancelled_at`    DATETIME              DEFAULT NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`         TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_booking_no` (`booking_no`),
  KEY `idx_property` (`property_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_dates` (`check_in_date`, `check_out_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单';

-- -----------------------------------------------------------------
-- 10. 支付记录
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `payment`;
CREATE TABLE `payment` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `booking_id`   BIGINT       NOT NULL,
  `amount`       DECIMAL(10,2) NOT NULL,
  `currency`     VARCHAR(8)   NOT NULL DEFAULT 'CNY',
  `method`       VARCHAR(16)  NOT NULL DEFAULT 'CASH' COMMENT 'CASH/CARD/WECHAT/ALIPAY/TRANSFER/OTHER',
  `type`         VARCHAR(16)  NOT NULL DEFAULT 'PAYMENT' COMMENT 'PAYMENT/REFUND',
  `transaction_no` VARCHAR(64)          DEFAULT NULL,
  `paid_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `operator`     VARCHAR(64)           DEFAULT NULL  COMMENT '操作人',
  `remarks`      VARCHAR(256)          DEFAULT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted`      TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_booking` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付流水';

-- -----------------------------------------------------------------
-- 11. OTA 渠道
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `channel`;
CREATE TABLE `channel` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `code`         VARCHAR(32)  NOT NULL                COMMENT 'CTRIP/MEITUAN/FLIGGY/BOOKING/AIRBNB',
  `name`         VARCHAR(64)  NOT NULL,
  `logo_url`     VARCHAR(256)          DEFAULT NULL,
  `api_base`     VARCHAR(256)          DEFAULT NULL   COMMENT 'API 基础地址',
  `app_key`      VARCHAR(128)          DEFAULT NULL,
  `app_secret`   VARCHAR(256)          DEFAULT NULL,
  `enabled`      TINYINT      NOT NULL DEFAULT 1,
  `last_sync_at` DATETIME              DEFAULT NULL,
  `last_status`  VARCHAR(16)           DEFAULT 'UNKNOWN' COMMENT 'OK/ERROR/UNKNOWN',
  `last_error`   VARCHAR(512)          DEFAULT NULL,
  `remarks`      VARCHAR(256)          DEFAULT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`      TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTA 渠道';

-- -----------------------------------------------------------------
-- 12. 渠道房型映射
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `channel_room_mapping`;
CREATE TABLE `channel_room_mapping` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `channel_id`    BIGINT       NOT NULL,
  `room_type_id`  BIGINT       NOT NULL,
  `channel_room_code` VARCHAR(64) NOT NULL             COMMENT '渠道侧房型代号',
  `channel_rate_code` VARCHAR(64)          DEFAULT NULL COMMENT '渠道侧房价代号',
  `markup_percent` DECIMAL(5,2) NOT NULL DEFAULT 0     COMMENT '加价比例 %',
  `active`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_channel_room` (`channel_id`, `room_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='渠道房型映射';

-- -----------------------------------------------------------------
-- 13. OTA 同步日志
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS `ota_sync_log`;
CREATE TABLE `ota_sync_log` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `channel_id`  BIGINT       NOT NULL,
  `operation`   VARCHAR(32)  NOT NULL                COMMENT 'PUSH_AVAIL/PUSH_RATE/FETCH_BOOKING/...',
  `status`      VARCHAR(16)  NOT NULL DEFAULT 'OK'   COMMENT 'OK/ERROR/SKIP',
  `request`     TEXT                  DEFAULT NULL,
  `response`    TEXT                  DEFAULT NULL,
  `error_msg`   VARCHAR(512)          DEFAULT NULL,
  `duration_ms` INT                   DEFAULT NULL,
  `occurred_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_channel_time` (`channel_id`, `occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTA 同步日志';

SET FOREIGN_KEY_CHECKS = 1;