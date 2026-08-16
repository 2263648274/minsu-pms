package com.xkzoom.pms.security;

import com.xkzoom.pms.config.JwtProperties;
import com.xkzoom.pms.entity.AuditLog;
import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.mapper.AuditLogMapper;
import com.xkzoom.pms.mapper.UserMapper;
import com.xkzoom.pms.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthInterceptorTest {

    @AfterEach
    void clearContext() {
        TenantContext.clear();
    }

    @Test
    void establishesCurrentUserAndAuditsMutation() throws Exception {
        JwtUtil jwtUtil = jwtUtil();
        UserMapper userMapper = mock(UserMapper.class);
        AuditLogMapper auditMapper = mock(AuditLogMapper.class);
        when(userMapper.selectById(10L)).thenReturn(user(10L, 42L, "tester", "ADMIN", 1));
        AuthInterceptor interceptor = new AuthInterceptor(jwtUtil, userMapper, auditMapper);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/bookings");
        request.setRequestURI("/api/bookings");
        request.addHeader(
                "Authorization",
                "Bearer " + jwtUtil.generate(10L, 42L, "tester", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(10L, request.getAttribute(AuthInterceptor.ATTR_USER_ID));
        assertEquals(42L, request.getAttribute(AuthInterceptor.ATTR_TENANT_ID));
        assertEquals(42L, TenantContext.requireTenantId());

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(auditMapper).insert(any(AuditLog.class));
        assertNull(TenantContext.getTenantId());
    }

    @Test
    void staffCannotMutateAdministratorConfiguration() throws Exception {
        JwtUtil jwtUtil = jwtUtil();
        UserMapper userMapper = mock(UserMapper.class);
        AuditLogMapper auditMapper = mock(AuditLogMapper.class);
        when(userMapper.selectById(11L)).thenReturn(user(11L, 42L, "staffer", "STAFF", 1));
        AuthInterceptor interceptor = new AuthInterceptor(jwtUtil, userMapper, auditMapper);

        MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/channels/1");
        request.setRequestURI("/api/channels/1");
        request.addHeader(
                "Authorization",
                "Bearer " + jwtUtil.generate(11L, 42L, "staffer", "STAFF"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(403, response.getStatus());
        verify(auditMapper).insert(any(AuditLog.class));
        assertNull(TenantContext.getTenantId());
    }

    @Test
    void disabledUserCannotContinueWithPreviouslyIssuedToken() throws Exception {
        JwtUtil jwtUtil = jwtUtil();
        UserMapper userMapper = mock(UserMapper.class);
        when(userMapper.selectById(12L)).thenReturn(user(12L, 42L, "disabled", "ADMIN", 0));
        AuthInterceptor interceptor = new AuthInterceptor(jwtUtil, userMapper, mock(AuditLogMapper.class));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bookings");
        request.setRequestURI("/api/bookings");
        request.addHeader(
                "Authorization",
                "Bearer " + jwtUtil.generate(12L, 42L, "disabled", "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(401, response.getStatus());
        assertNull(TenantContext.getTenantId());
    }

    @Test
    void invalidTokenCannotReusePreviousTenantContext() throws Exception {
        AuthInterceptor interceptor = new AuthInterceptor(
                jwtUtil(), mock(UserMapper.class), mock(AuditLogMapper.class));
        TenantContext.setTenantId(99L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(401, response.getStatus());
        assertNull(TenantContext.getTenantId());
    }

    private JwtUtil jwtUtil() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("tenant-test-secret-that-is-longer-than-32-bytes");
        return new JwtUtil(properties);
    }

    private User user(Long id, Long tenantId, String username, String role, int status) {
        User user = new User();
        user.setId(id);
        user.setTenantId(tenantId);
        user.setUsername(username);
        user.setRole(role);
        user.setStatus(status);
        return user;
    }
}
