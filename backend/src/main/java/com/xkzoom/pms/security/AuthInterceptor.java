package com.xkzoom.pms.security;

import com.xkzoom.pms.common.Result;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 鉴权拦截器：所有 /api/**（白名单除外）都要带 Authorization: Bearer xxx
 * 解析后把 userId/username/role 放到 request attribute
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_USER_ID   = "currentUserId";
    public static final String ATTR_USERNAME  = "currentUsername";
    public static final String ATTR_ROLE      = "currentRole";

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse resp, Object handler) throws Exception {
        // OPTIONS 直接放行（CORS 预检）
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
            String username = claims.get("username", String.class);
            String role = claims.get("role", String.class);
            req.setAttribute(ATTR_USER_ID, uid);
            req.setAttribute(ATTR_USERNAME, username);
            req.setAttribute(ATTR_ROLE, role);
            return true;
        } catch (JwtException e) {
            writeUnauthorized(resp, "Token 无效或已过期: " + e.getMessage());
            return false;
        }
    }

    private void writeUnauthorized(HttpServletResponse resp, String msg) throws Exception {
        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        resp.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resp.setCharacterEncoding("UTF-8");
        resp.getWriter().write(objectMapper.writeValueAsString(Result.unauthorized(msg)));
    }
}