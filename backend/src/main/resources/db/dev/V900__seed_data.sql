-- ============================================================================
-- V900: Seed 数据
-- 默认密码：admin / admin123（密码哈希不在 SQL 里硬编码，由
--   DataInitializer 在 SpringBoot 启动时检测并用 PasswordEncoder 动态生成）
-- ============================================================================

SET NAMES utf8mb4;

-- admin 账号由 DataInitializer.java 在启动时插入（保证 BCrypt 哈希正确）

-- 3 个物业
INSERT INTO `property` (id, name, code, address, city, phone, star_rating, description, status) VALUES
  (1, '海景度假酒店',  'P001', '滨海路 88 号',    '厦门', '0592-8888-001', 5, '一线海景，配套泳池+SPA',  1),
  (2, '市中心商务酒店','P002', '中山路 100 号',   '上海', '021-6666-002', 4, '商务首选，临近地铁 1/2 号线', 1),
  (3, '山居民宿',      'P003', '莫干山 22 号',   '湖州', '0572-7777-003', 3, '精品民宿，含早餐',         1);

-- 5 个房型（跨物业）
INSERT INTO `room_type` (id, property_id, name, code, base_price, max_occupancy, area, bed_type, description, status) VALUES
  (1, 1, '海景大床房',  'RT001', 888.00, 2, 38.50, '大床', '落地窗海景', 1),
  (2, 1, '海景双床房',  'RT002', 798.00, 2, 36.00, '双床', '侧海景',     1),
  (3, 2, '商务标准间',  'RT003', 588.00, 2, 28.00, '双床', '市中心',     1),
  (4, 2, '行政套房',    'RT004', 1288.00, 2, 55.00, '大床', '含行政酒廊', 1),
  (5, 3, '山景木屋',    'RT005', 488.00, 4, 45.00, '大床', '独立小院',   1);

-- 20 个房间
INSERT INTO `room` (property_id, room_type_id, room_no, floor, status) VALUES
  (1, 1, '801', 8, 'AVAILABLE'), (1, 1, '802', 8, 'AVAILABLE'), (1, 1, '803', 8, 'AVAILABLE'), (1, 1, '805', 8, 'AVAILABLE'),
  (1, 2, '810', 8, 'AVAILABLE'), (1, 2, '811', 8, 'AVAILABLE'), (1, 2, '812', 8, 'AVAILABLE'),
  (2, 3, '301', 3, 'AVAILABLE'), (2, 3, '302', 3, 'AVAILABLE'), (2, 3, '303', 3, 'AVAILABLE'), (2, 3, '305', 3, 'AVAILABLE'), (2, 3, '306', 3, 'AVAILABLE'),
  (2, 4, '501', 5, 'AVAILABLE'), (2, 4, '502', 5, 'AVAILABLE'), (2, 4, '503', 5, 'AVAILABLE'),
  (3, 5, 'A01', 1, 'AVAILABLE'), (3, 5, 'A02', 1, 'AVAILABLE'), (3, 5, 'A03', 1, 'AVAILABLE'),
  (3, 5, 'B01', 1, 'AVAILABLE'), (3, 5, 'B02', 1, 'AVAILABLE'), (3, 5, 'B03', 1, 'AVAILABLE');

-- 1 个房价计划（标准价）
INSERT INTO `rate_plan` (id, property_id, room_type_id, name, code, base_price, currency, meal_plan, min_nights, active) VALUES
  (1, 1, 1, '标准价', 'STD', 888.00, 'CNY', 'NONE', 1, 1);

-- 30 天房价日历（从今天起 + 30 天）
INSERT INTO `rate_calendar` (rate_plan_id, room_type_id, stay_date, price, currency, available)
SELECT 1, 1,
       DATE_ADD(CURDATE(), INTERVAL n DAY),
       CASE
         WHEN DAYOFWEEK(DATE_ADD(CURDATE(), INTERVAL n DAY)) IN (1, 7) THEN 1088.00
         ELSE 888.00
       END,
       'CNY',
       1
FROM (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
  UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
  UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
  UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
) AS days;

-- 30 天库存（海景大床房 4 间）
INSERT INTO `inventory` (room_type_id, stay_date, total_rooms, sold_rooms, blocked_rooms, status)
SELECT 1,
       DATE_ADD(CURDATE(), INTERVAL n DAY),
       4, 0, 0, 'OPEN'
FROM (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
  UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
  UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
  UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
) AS days;

-- 5 个 OTA 渠道
INSERT INTO `channel` (code, name, api_base, enabled, last_status) VALUES
  ('CTRIP',   '携程',     'https://openapi.ctrip.com', 1, 'UNKNOWN'),
  ('MEITUAN', '美团酒店', 'https://api.meituan.com',   1, 'UNKNOWN'),
  ('FLIGGY',  '飞猪',     'https://open.alitrip.com',  1, 'UNKNOWN'),
  ('BOOKING', 'Booking',  'https://api.booking.com',   1, 'UNKNOWN'),
  ('AIRBNB',  'Airbnb',   'https://api.airbnb.com',    0, 'UNKNOWN');

-- 渠道房型映射（海景大床房 RT001 全部映射到 5 渠道）
INSERT INTO `channel_room_mapping` (channel_id, room_type_id, channel_room_code, markup_percent, active) VALUES
  (1, 1, 'CT-001', 5.00,  1),
  (2, 1, 'MT-001', 8.00,  1),
  (3, 1, 'FL-001', 6.00,  1),
  (4, 1, 'BK-001', 10.00, 1),
  (5, 1, 'AB-001', 12.00, 0);

-- 5 个客人
INSERT INTO `customer` (name, phone, email, gender, vip_level, preferences) VALUES
  ('张三',   '13800138001', 'zhangsan@example.com',  'M', 2, '偏好高层/无烟房'),
  ('李四',   '13800138002', 'lisi@example.com',      'M', 1, NULL),
  ('王五',   '13800138003', 'wangwu@example.com',    'F', 3, 'VIP/婴儿床'),
  ('赵六',   '13800138004', 'zhaoliu@example.com',    'F', 0, NULL),
  ('孙七',   '13800138005', 'sunqi@example.com',      'M', 4, '海景房/早餐');

-- 5 个订单（覆盖各状态）
INSERT INTO `booking` (booking_no, property_id, room_type_id, rate_plan_id, customer_id,
                       check_in_date, check_out_date, nights, rooms, guests,
                       room_price, total_amount, paid_amount, source, status, payment_status,
                       guest_name, guest_phone) VALUES
  ('BK20250813001', 1, 1, 1, 1, CURDATE(),                       DATE_ADD(CURDATE(), INTERVAL 2 DAY),  2, 1, 2, 888.00,  1776.00, 1776.00, 'DIRECT',  'CONFIRMED',    'PAID',    '张三', '13800138001'),
  ('BK20250813002', 1, 1, 1, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY),  DATE_ADD(CURDATE(), INTERVAL 3 DAY),  2, 1, 1, 1088.00, 2176.00, 1088.00, 'CTRIP',   'PENDING',      'PARTIAL', '李四', '13800138002'),
  ('BK20250813003', 2, 3, NULL, 3, CURDATE(),                  DATE_ADD(CURDATE(), INTERVAL 1 DAY),  1, 1, 2, 588.00,  588.00,  588.00,  'MEITUAN', 'CHECKED_IN',   'PAID',    '王五', '13800138003'),
  ('BK20250813004', 1, 2, NULL, 4, DATE_ADD(CURDATE(), INTERVAL -3 DAY), DATE_ADD(CURDATE(), INTERVAL -1 DAY), 2, 1, 2, 798.00,  1596.00, 1596.00, 'FLIGGY',  'CHECKED_OUT',  'PAID',    '赵六', '13800138004'),
  ('BK20250813005', 3, 5, NULL, 5, DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY),  2, 1, 4, 488.00,  976.00,  0.00,    'DIRECT',  'CANCELLED',    'REFUNDED','孙七', '13800138005');

-- 给已入住的订单写支付记录
INSERT INTO `payment` (booking_id, amount, method, type, transaction_no, operator) VALUES
  (1, 1776.00, 'WECHAT', 'PAYMENT', 'WX20250813001', 'admin'),
  (2, 1088.00, 'ALIPAY', 'PAYMENT', 'ALI20250813002', 'admin'),
  (3, 588.00,  'CARD',   'PAYMENT', 'CRD20250813003', 'admin'),
  (4, 1596.00, 'WECHAT', 'PAYMENT', 'WX20250813004',  'admin');