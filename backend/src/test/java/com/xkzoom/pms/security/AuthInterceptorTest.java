package com.xkzoom.pms.security;

import com.xkzoom.pms.config.JwtProperties;
import com.xkzoom.pms.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthInterceptorTest {

    @AfterEach
    void clearContext() {
        TenantContext.clear();
    }

    @Test
    void establishesAndClearsTenantContext() throws Exception {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("tenant-test-secret-that-is-longer-than-32-bytes");
        JwtUtil jwtUtil = new JwtUtil(properties);
        AuthInterceptor interceptor = new AuthInterceptor(jwtUtil);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(
                "Authorization",
                "Bearer " + jwtUtil.generate(10L, 42L, "tester", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(10L, request.getAttribute(AuthInterceptor.ATTR_USER_ID));
        assertEquals(42L, request.getAttribute(AuthInterceptor.ATTR_TENANT_ID));
        assertEquals(42L, TenantContext.requireTenantId());

        interceptor.afterCompletion(request, response, new Object(), null);

        assertNull(TenantContext.getTenantId());
    }

    @Test
    void invalidTokenCannotReusePreviousTenantContext() throws Exception {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("tenant-test-secret-that-is-longer-than-32-bytes");
        AuthInterceptor interceptor = new AuthInterceptor(new JwtUtil(properties));
        TenantContext.setTenantId(99L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertEquals(false, interceptor.preHandle(request, response, new Object()));
        assertEquals(401, response.getStatus());
        assertNull(TenantContext.getTenantId());
    }
}
