package com.xkzoom.pms.config;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.baomidou.mybatisplus.extension.plugins.inner.TenantLineInnerInterceptor;
import com.xkzoom.pms.tenant.TenantContext;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.insert.Insert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MybatisPlusConfigTest {

    private final TenantLineHandler handler = new MybatisPlusConfig().tenantLineHandler();

    @AfterEach
    void clearContext() {
        TenantContext.clear();
    }

    @Test
    void scopesBusinessTablesAndIgnoresOnlyGlobalTables() {
        assertTrue(handler.ignoreTable("tenant"));
        assertTrue(handler.ignoreTable("flyway_schema_history"));
        assertFalse(handler.ignoreTable("USER"));
        assertFalse(handler.ignoreTable("property"));
        assertFalse(handler.ignoreTable("booking"));
    }

    @Test
    void tenantExpressionFailsClosedWithoutContext() {
        assertThrows(IllegalStateException.class, handler::getTenantId);

        TenantContext.setTenantId(27L);

        assertEquals("27", handler.getTenantId().toString());
        assertEquals("tenant_id", handler.getTenantIdColumn());
    }

    /**
     * RateCalendarMapper.upsertRow 的原生 INSERT ... ON DUPLICATE KEY UPDATE
     * 必须能被租户拦截器解析并注入 tenant_id，且 ON DUPLICATE 子句保持原样，
     * 否则并发原子 upsert 在真实数据库上会缺租户列或解析失败。
     */
    @Test
    void rewritesRawUpsertWithTenantColumnAndKeepsDuplicateKeyClause() throws Exception {
        TenantContext.setTenantId(9L);
        String sql = "INSERT INTO rate_calendar "
                + "(rate_plan_id, room_type_id, stay_date, price, currency, available, min_nights, remarks, created_at, updated_at) "
                + "VALUES (?, ?, ?, ?, 'CNY', ?, ?, ?, ?, ?) "
                + "ON DUPLICATE KEY UPDATE price = VALUES(price), "
                + "available = COALESCE(VALUES(available), available), "
                + "min_nights = COALESCE(VALUES(min_nights), min_nights), "
                + "remarks = VALUES(remarks), updated_at = VALUES(updated_at)";

        Statement stmt = CCJSqlParserUtil.parse(sql);
        assertTrue(stmt instanceof Insert, "jsqlparser must parse the upsert statement");
        new ExposedTenantInterceptor(handler).rewrite((Insert) stmt);
        String rewritten = stmt.toString();
        // VALUES 占位符中唯一数字字面量就是注入的租户值，位于值列表末尾
        assertTrue(rewritten.toLowerCase().contains("tenant_id"), "tenant column must be injected: " + rewritten);
        assertTrue(rewritten.contains(", 9)"), "current tenant id must be appended as a value: " + rewritten);
        assertTrue(rewritten.toUpperCase().contains("ON DUPLICATE KEY UPDATE"), "duplicate-key clause must survive rewrite");
        assertTrue(rewritten.toUpperCase().contains("VALUES(PRICE)"), "duplicate-key update expressions must survive rewrite");
    }

    private static class ExposedTenantInterceptor extends TenantLineInnerInterceptor {
        ExposedTenantInterceptor(TenantLineHandler tenantHandler) {
            super(tenantHandler);
        }

        void rewrite(Insert insert) {
            processInsert(insert, 0, null, null);
        }
    }
}
