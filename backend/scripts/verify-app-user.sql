-- 应用账号验证脚本：用 pms_app 登录 + 切到 pms_xkzoom + 看权限
USE pms_xkzoom;
SELECT '=== Connection ===' AS step;
SELECT DATABASE() AS current_database;
SELECT USER() AS current_user_login;
SELECT '=== Tables (should be empty initially) ===' AS step;
SHOW TABLES;
SELECT '=== Permissions smoke test ===' AS step;
CREATE TABLE IF NOT EXISTS _smoke_test (id INT PRIMARY KEY);
DROP TABLE _smoke_test;
SELECT 'CREATE/DROP OK - DDL works' AS result;