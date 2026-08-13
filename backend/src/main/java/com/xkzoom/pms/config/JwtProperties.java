package com.xkzoom.pms.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * JWT 配置属性（从 application-dev.yml 的 pms.jwt 节点读）
 */
@Data
@Component
@ConfigurationProperties(prefix = "pms.jwt")
public class JwtProperties {
    /** 签名密钥（HS256，至少 32 字节） */
    private String secret;
    /** 有效期（小时） */
    private int expiresHours = 24;
    /** 请求头名称 */
    private String header = "Authorization";
    /** Token 前缀 */
    private String prefix = "Bearer ";
}