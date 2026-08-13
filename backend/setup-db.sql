-- ============================================================================
-- PMS XKZOOM - Database Bootstrap
-- 用 root 账号跑一次：建库 + 建应用专用账号（最小权限）
-- 命令：mysql -h 127.0.0.1 -P 3306 -u root -p < setup-db.sql
-- ============================================================================

-- 1. 建库（utf8mb4 完整字符集，emoji/中文/部分罕见字符都支持）
CREATE DATABASE IF NOT EXISTS pms_xkzoom
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. 建应用专用账号（不用 root，应用连接用这个）
--    密码：Pms@App2026Secure （写进 backend/.env，不入库）
DROP USER IF EXISTS 'pms_app'@'localhost';
DROP USER IF EXISTS 'pms_app'@'127.0.0.1';
CREATE USER 'pms_app'@'localhost' IDENTIFIED BY 'Pms@App2026Secure';
CREATE USER 'pms_app'@'127.0.0.1' IDENTIFIED BY 'Pms@App2026Secure';

-- 3. 授权（最小权限原则：DML + DDL 限定在本库）
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, REFERENCES,
      CREATE VIEW, SHOW VIEW
  ON pms_xkzoom.*
  TO 'pms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, REFERENCES,
      CREATE VIEW, SHOW VIEW
  ON pms_xkzoom.*
  TO 'pms_app'@'127.0.0.1';

FLUSH PRIVILEGES;

-- 4. 验证
SELECT '=== DB ready ===' AS status;
SHOW DATABASES LIKE 'pms_xkzoom';
SELECT user, host FROM mysql.user WHERE user = 'pms_app';

-- 5. 切到 pms_xkzoom 库确认能读写
USE pms_xkzoom;
SELECT DATABASE() AS current_db, USER() AS current_user;