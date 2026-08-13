package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.dto.LoginRequest;
import com.xkzoom.pms.dto.LoginResponse;
import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.exception.BusinessException;
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
 * 认证：登录 + 当前用户信息
 *  - POST /api/auth/login    （白名单）
 *  - GET  /api/auth/me       （需 token）
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, req.getUsername())
        );
        if (user == null) {
            throw new BusinessException("用户名或密码错误");
        }
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new BusinessException("账号已禁用");
        }
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BusinessException("用户名或密码错误");
        }

        // 更新最后登录时间
        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);

        String token = jwtUtil.generate(user.getId(), user.getUsername(), user.getRole());
        return Result.ok(new LoginResponse(
                token, user.getId(), user.getUsername(), user.getRealName(), user.getRole()
        ));
    }

    @GetMapping("/me")
    public Result<Map<String, Object>> me(HttpServletRequest req) {
        Long uid = (Long) req.getAttribute(AuthInterceptor.ATTR_USER_ID);
        User user = userMapper.selectById(uid);
        if (user == null) throw new BusinessException("用户不存在");

        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("username", user.getUsername());
        data.put("realName", user.getRealName());
        data.put("email", user.getEmail());
        data.put("role", user.getRole());
        return Result.ok(data);
    }
}