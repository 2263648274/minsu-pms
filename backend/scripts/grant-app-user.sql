-- 修补授权（补 DROP 等 DDL 权限）
GRANT DROP, CREATE VIEW, SHOW VIEW, EVENT, TRIGGER
  ON pms_xkzoom.* TO 'pms_app'@'localhost';
GRANT DROP, CREATE VIEW, SHOW VIEW, EVENT, TRIGGER
  ON pms_xkzoom.* TO 'pms_app'@'127.0.0.1';
FLUSH PRIVILEGES;

-- 显示最终授权
SHOW GRANTS FOR 'pms_app'@'localhost';
SHOW GRANTS FOR 'pms_app'@'127.0.0.1';