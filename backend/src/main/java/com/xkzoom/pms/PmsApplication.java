package com.xkzoom.pms;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * PMS XKZOOM 后端启动入口
 * - MyBatis-Plus Mapper 自动扫描 com.xkzoom.pms.mapper
 * - 启用 Spring 定时任务（同步日志清理等后台任务）
 */
@SpringBootApplication
@MapperScan("com.xkzoom.pms.mapper")
@EnableScheduling
public class PmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(PmsApplication.class, args);
        System.out.println("\n========================================");
        System.out.println("  PMS Backend Started on port 8080");
        System.out.println("  API base: http://localhost:8080/api");
        System.out.println("========================================\n");
    }
}