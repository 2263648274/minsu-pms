package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.dto.LoginRequest;
import com.xkzoom.pms.dto.LoginResponse;
import com.xkzoom.pms.entity.Tenant;
import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.TenantMapper;
import com.xkzoom.pms.mapper.UserMapper;
import com.xkzoom.pms.security.AuthInterceptor;
import com.xkzoom.pms.security.JwtUtil;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
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
public class AuthController {

    private final UserMapper userMapper;
    private final TenantMapper tenantMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        User user = userMapper.selectGlobalByUsername(req.getUsername());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
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
