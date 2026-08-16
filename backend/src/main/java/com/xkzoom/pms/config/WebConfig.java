package com.xkzoom.pms.config;

import com.xkzoom.pms.security.AuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Web 配置：CORS + 拦截器
 *  - /api/auth/login, /api/auth/me 不需要 token（白名单）
 *  - 其它 /api/** 全部走 AuthInterceptor
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Value("${pms.cors.allowed-origins}")
    private String allowedOrigins;

    /** 不需要鉴权的白名单 */
    private static final List<String> WHITELIST = List.of(
            "/api/auth/login",
            "/api/health"
    );

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(WHITELIST);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization", "X-Request-ID")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
