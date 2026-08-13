package com.xkzoom.pms.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 数据初始化：启动时确保 admin 账号存在，密码 admin123
 * - 如果 user 表没有 admin：用 PasswordEncoder 生成正确 BCrypt 哈希后插入
 * - 如果已有但密码哈希不匹配 admin123：覆盖重设
 * - @Order(2)：在 SqlSchemaInitializer（@Order(1)）之后跑，保证表已建好
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String targetUsername = "admin";
        String targetPassword = "admin123";

        User existing = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, targetUsername)
        );

        String hashed = passwordEncoder.encode(targetPassword);

        if (existing == null) {
            User admin = new User();
            admin.setUsername(targetUsername);
            admin.setPassword(hashed);
            admin.setRealName("系统管理员");
            admin.setEmail("admin@xkzoom.local");
            admin.setRole("ADMIN");
            admin.setStatus(1);
            admin.setCreatedAt(LocalDateTime.now());
            admin.setUpdatedAt(LocalDateTime.now());
            userMapper.insert(admin);
            log.info("✓ 已创建 admin 账号（密码 admin123）");
        } else {
            existing.setPassword(hashed);
            existing.setUpdatedAt(LocalDateTime.now());
            userMapper.updateById(existing);
            log.info("✓ admin 账号密码已重设为 admin123");
        }
    }
}