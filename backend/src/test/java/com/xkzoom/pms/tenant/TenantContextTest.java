package com.xkzoom.pms.tenant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TenantContextTest {

    @AfterEach
    void clearContext() {
        TenantContext.clear();
    }

    @Test
    void requiresAnExplicitTenant() {
        assertThrows(IllegalStateException.class, TenantContext::requireTenantId);

        TenantContext.setTenantId(42L);

        assertEquals(42L, TenantContext.requireTenantId());
    }

    @Test
    void rejectsInvalidTenantIds() {
        assertThrows(IllegalArgumentException.class, () -> TenantContext.setTenantId(null));
        assertThrows(IllegalArgumentException.class, () -> TenantContext.setTenantId(0L));
    }
}
