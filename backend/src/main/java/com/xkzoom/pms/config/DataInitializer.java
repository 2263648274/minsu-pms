package com.xkzoom.pms.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 本地开发初始化：仅在 dev profile 下确保 admin 账号存在。
 * - 如果 user 表没有 admin：用 PasswordEncoder 生成正确 BCrypt 哈希后插入
 * - 如果已有：admin 密码和资料均保持不变，避免重启破坏本地状态
 * - 正式环境不会加载本初始化器，首个管理员必须走部署引导创建
 */
@Slf4j
@Component
@Profile("dev")
@Order(2)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String targetUsername = "admin";
        String targetPassword = "admin123";

        User existing = userMapper.selectGlobalByUsername(targetUsername);

        if (existing == null) {
            String hashed = passwordEncoder.encode(targetPassword);
            User admin = new User();
            admin.setTenantId(1L);
            admin.setUsername(targetUsername);
            admin.setPassword(hashed);
            admin.setRealName("系统管理员");
            admin.setEmail("admin@xkzoom.local");
            admin.setRole("ADMIN");
            admin.setStatus(1);
            admin.setCreatedAt(LocalDateTime.now());
            admin.setUpdatedAt(LocalDateTime.now());
            userMapper.insertBootstrapAdmin(admin);
            log.info("✓ 已创建 admin 账号（密码 admin123）");
        } else {
            log.info("✓ admin 账号已存在，保留现有密码");
        }
    }
}
