package com.xkzoom.pms.config;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.xkzoom.pms.tenant.TenantContext;
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
}
