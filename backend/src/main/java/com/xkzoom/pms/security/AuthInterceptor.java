package com.xkzoom.pms.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Authenticates API requests and establishes the tenant context used by the
 * MyBatis-Plus tenant interceptor.
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_USER_ID = "currentUserId";
    public static final String ATTR_TENANT_ID = "currentTenantId";
    public static final String ATTR_USERNAME = "currentUsername";
    public static final String ATTR_ROLE = "currentRole";

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse resp, Object handler) throws Exception {
        TenantContext.clear();

        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            return true;
        }

        String header = req.getHeader(jwtUtil.getHeader());
        if (header == null || !header.startsWith(jwtUtil.getPrefix())) {
            writeUnauthorized(resp, "缺少或非法的 Authorization 头");
            return false;
        }

        String token = header.substring(jwtUtil.getPrefix().length()).trim();
        try {
            Claims claims = jwtUtil.parse(token);
            Long uid = claims.get("uid", Long.class);
            Long tenantId = claims.get("tid", Long.class);
            String username = claims.get("username", String.class);
            String role = claims.get("role", String.class);
            if (uid == null || tenantId == null || tenantId <= 0) {
                writeUnauthorized(resp, "Token 缺少用户或租户信息，请重新登录");
                return false;
            }

            TenantContext.setTenantId(tenantId);
            req.setAttribute(ATTR_USER_ID, uid);
            req.setAttribute(ATTR_TENANT_ID, tenantId);
            req.setAttribute(ATTR_USERNAME, username);
            req.setAttribute(ATTR_ROLE, role);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            TenantContext.clear();
            writeUnauthorized(resp, "Token 无效或已过期");
            return false;
        }
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception ex) {
        TenantContext.clear();
    }

    private void writeUnauthorized(HttpServletResponse resp, String msg) throws Exception {
        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        resp.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resp.setCharacterEncoding("UTF-8");
        resp.getWriter().write(objectMapper.writeValueAsString(Result.unauthorized(msg)));
    }
}
