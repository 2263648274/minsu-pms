package com.xkzoom.pms.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.AuditLog;
import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.mapper.AuditLogMapper;
import com.xkzoom.pms.mapper.UserMapper;
import com.xkzoom.pms.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Authenticates API requests and establishes the tenant context used by the
 * MyBatis-Plus tenant interceptor.
 */
@Component
@Slf4j
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_USER_ID = "currentUserId";
    public static final String ATTR_TENANT_ID = "currentTenantId";
    public static final String ATTR_USERNAME = "currentUsername";
    public static final String ATTR_ROLE = "currentRole";
    public static final String ATTR_REQUEST_ID = "requestId";

    private static final Set<String> ADMIN_ONLY_MUTATION_PREFIXES = Set.of(
            "/api/channels",
            "/api/properties",
            "/api/rooms",
            "/api/room-types",
            "/api/rate-plans",
            "/api/sync-logs"
    );
    private static final Set<String> ADMIN_ONLY_ALL_PREFIXES = Set.of("/api/audit-logs");

    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;
    private final AuditLogMapper auditLogMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuthInterceptor(JwtUtil jwtUtil, UserMapper userMapper, AuditLogMapper auditLogMapper) {
        this.jwtUtil = jwtUtil;
        this.userMapper = userMapper;
        this.auditLogMapper = auditLogMapper;
    }

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
            User currentUser = userMapper.selectById(uid);
            if (currentUser == null
                    || currentUser.getStatus() == null
                    || currentUser.getStatus() != 1
                    || !tenantId.equals(currentUser.getTenantId())) {
                TenantContext.clear();
                writeUnauthorized(resp, "账号已停用或租户归属已变更，请重新登录");
                return false;
            }
            role = currentUser.getRole();
            username = currentUser.getUsername();
            if (!"ADMIN".equalsIgnoreCase(role) && !"STAFF".equalsIgnoreCase(role)) {
                TenantContext.clear();
                writeUnauthorized(resp, "账号角色无效，请联系管理员");
                return false;
            }

            String requestId = requestId(req);
            req.setAttribute(ATTR_REQUEST_ID, requestId);
            resp.setHeader("X-Request-ID", requestId);
            req.setAttribute(ATTR_USER_ID, uid);
            req.setAttribute(ATTR_TENANT_ID, tenantId);
            req.setAttribute(ATTR_USERNAME, username);
            req.setAttribute(ATTR_ROLE, role);

            if (requiresAdmin(req) && !"ADMIN".equalsIgnoreCase(role)) {
                writeForbidden(resp, "该配置操作仅管理员可执行");
                recordAudit(req, resp, null);
                TenantContext.clear();
                return false;
            }
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
        recordAudit(request, response, ex);
        TenantContext.clear();
    }

    private boolean requiresAdmin(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (ADMIN_ONLY_ALL_PREFIXES.stream()
                .anyMatch(prefix -> path.equals(prefix) || path.startsWith(prefix + "/"))) {
            return true;
        }
        String method = request.getMethod();
        if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method)) {
            return false;
        }
        return ADMIN_ONLY_MUTATION_PREFIXES.stream()
                .anyMatch(prefix -> path.equals(prefix) || path.startsWith(prefix + "/"));
    }

    private String requestId(HttpServletRequest request) {
        String supplied = request.getHeader("X-Request-ID");
        if (supplied != null && supplied.matches("[A-Za-z0-9._-]{8,64}")) return supplied;
        return UUID.randomUUID().toString();
    }

    private void recordAudit(HttpServletRequest request, HttpServletResponse response, Exception ex) {
        String method = request.getMethod();
        if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method)
                || request.getAttribute(ATTR_USER_ID) == null) {
            return;
        }
        try {
            AuditLog entry = new AuditLog();
            entry.setTenantId((Long) request.getAttribute(ATTR_TENANT_ID));
            entry.setUserId((Long) request.getAttribute(ATTR_USER_ID));
            entry.setUsername((String) request.getAttribute(ATTR_USERNAME));
            entry.setRole((String) request.getAttribute(ATTR_ROLE));
            entry.setAction(method.toUpperCase());
            entry.setResource(request.getRequestURI());
            entry.setRequestId((String) request.getAttribute(ATTR_REQUEST_ID));
            entry.setClientIp(clientIp(request));
            entry.setHttpStatus(response.getStatus());
            entry.setSuccess(ex == null && response.getStatus() < 400 ? 1 : 0);
            entry.setOccurredAt(LocalDateTime.now());
            auditLogMapper.insert(entry);
        } catch (Exception auditFailure) {
            log.error("Failed to persist security audit event requestId={}",
                    request.getAttribute(ATTR_REQUEST_ID), auditFailure);
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private void writeUnauthorized(HttpServletResponse resp, String msg) throws Exception {
        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        resp.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resp.setCharacterEncoding("UTF-8");
        resp.getWriter().write(objectMapper.writeValueAsString(Result.unauthorized(msg)));
    }

    private void writeForbidden(HttpServletResponse resp, String msg) throws Exception {
        resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
        resp.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resp.setCharacterEncoding("UTF-8");
        resp.getWriter().write(objectMapper.writeValueAsString(Result.forbidden(msg)));
    }
}
