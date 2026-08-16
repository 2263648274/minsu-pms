package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.dto.LoginRequest;
import com.xkzoom.pms.dto.LoginResponse;
import com.xkzoom.pms.entity.Tenant;
import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.entity.AuditLog;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.TenantMapper;
import com.xkzoom.pms.mapper.UserMapper;
import com.xkzoom.pms.mapper.AuditLogMapper;
import com.xkzoom.pms.security.AuthInterceptor;
import com.xkzoom.pms.security.JwtUtil;
import com.xkzoom.pms.security.LoginAttemptService;
import com.xkzoom.pms.tenant.TenantContext;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Authentication endpoints. Usernames remain globally unique, while each
 * authenticated token is bound to the user's persisted tenant.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserMapper userMapper;
    private final TenantMapper tenantMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final LoginAttemptService loginAttemptService;
    private final AuditLogMapper auditLogMapper;

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
        String attemptKey = clientIp(request) + ":" + req.getUsername().toLowerCase();
        if (loginAttemptService.isBlocked(attemptKey)) {
            log.warn("security_event=login_throttled username={} ip={}", req.getUsername(), clientIp(request));
            throw new BusinessException("登录失败次数过多，请 15 分钟后重试");
        }
        User user = userMapper.selectGlobalByUsername(req.getUsername());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            loginAttemptService.recordFailure(attemptKey);
            log.warn("security_event=login_failed username={} ip={}", req.getUsername(), clientIp(request));
            throw new BusinessException("用户名或密码错误");
        }
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new BusinessException("账号已禁用");
        }
        if (user.getTenantId() == null) {
            throw new BusinessException("账号未分配租户");
        }

        Tenant tenant = tenantMapper.selectById(user.getTenantId());
        if (tenant == null || tenant.getStatus() == null || tenant.getStatus() != 1) {
            throw new BusinessException("所属租户已停用");
        }

        LocalDateTime loginAt = LocalDateTime.now();
        userMapper.updateLastLogin(user.getId(), user.getTenantId(), loginAt);
        loginAttemptService.recordSuccess(attemptKey);
        recordSuccessfulLogin(user, request);

        String token = jwtUtil.generate(
                user.getId(), user.getTenantId(), user.getUsername(), user.getRole());
        return Result.ok(new LoginResponse(
                token,
                user.getId(),
                user.getTenantId(),
                tenant.getName(),
                user.getUsername(),
                user.getRealName(),
                user.getRole()
        ));
    }

    private void recordSuccessfulLogin(User user, HttpServletRequest request) {
        try {
            TenantContext.setTenantId(user.getTenantId());
            AuditLog entry = new AuditLog();
            entry.setTenantId(user.getTenantId());
            entry.setUserId(user.getId());
            entry.setUsername(user.getUsername());
            entry.setRole(user.getRole());
            entry.setAction("LOGIN");
            entry.setResource("/api/auth/login");
            entry.setRequestId(java.util.UUID.randomUUID().toString());
            entry.setClientIp(clientIp(request));
            entry.setHttpStatus(200);
            entry.setSuccess(1);
            entry.setOccurredAt(LocalDateTime.now());
            auditLogMapper.insert(entry);
        } catch (Exception auditFailure) {
            log.error("Failed to persist login audit event userId={}", user.getId(), auditFailure);
        } finally {
            TenantContext.clear();
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    @GetMapping("/me")
    public Result<Map<String, Object>> me(HttpServletRequest req) {
        Long uid = (Long) req.getAttribute(AuthInterceptor.ATTR_USER_ID);
        Long tenantId = (Long) req.getAttribute(AuthInterceptor.ATTR_TENANT_ID);
        User user = userMapper.selectById(uid);
        if (user == null || !tenantId.equals(user.getTenantId())) {
            throw new BusinessException("用户不存在或租户归属已变更");
        }

        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("tenantId", user.getTenantId());
        data.put("username", user.getUsername());
        data.put("realName", user.getRealName());
        data.put("email", user.getEmail());
        data.put("role", user.getRole());
        return Result.ok(data);
    }
}
