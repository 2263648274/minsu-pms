package com.xkzoom.pms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;

/**
 * 数据库 Schema & Seed 初始化（替代 Flyway）
 *  - 启动时按顺序执行 db/migration/V1__init_schema.sql 和 V900__seed_data.sql
 *  - 用 ScriptUtils 自带容错：遇到重复建表/重复键自动 Continue
 *  - 幂等：每次启动都跑（如果表已存在，CREATE IF NOT EXISTS 会跳过；INSERT 重复就失败不阻塞）
 *  - @Order(1)：在 DataInitializer（@Order(2)）之前跑
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class SqlSchemaInitializer implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        log.info("==> SqlSchemaInitializer: 开始执行 schema/seed SQL");
        runScript("db/migration/V1__init_schema.sql");
        runScript("db/migration/V900__seed_data.sql");
        log.info("==> SqlSchemaInitializer: SQL 初始化完成");
    }

    private void runScript(String path) {
        try {
            EncodedResource resource = new EncodedResource(new ClassPathResource(path), StandardCharsets.UTF_8);
            ScriptUtils.executeSqlScript(dataSource.getConnection(), resource);
            log.info("  ✓ {}", path);
        } catch (Exception e) {
            // 部分 SQL 失败（如重复 INSERT）不阻塞启动（INSERT 走 IGNORE）
            log.warn("  ⚠ {} 执行中遇到异常（继续）: {}", path, e.getMessage());
        }
    }
}