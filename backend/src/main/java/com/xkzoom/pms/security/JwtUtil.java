package com.xkzoom.pms.security;

import com.xkzoom.pms.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 工具（HS256）
 *  - generate(userId, username): 生成 token
 *  - parse(token): 解析 token，失败抛 JwtException
 */
@Component
public class JwtUtil {

    private final JwtProperties props;
    private final SecretKey signingKey;

    public JwtUtil(JwtProperties props) {
        this.props = props;
        // HS256 至少 32 字节密钥
        this.signingKey = Keys.hmacShaKeyFor(props.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generate(Long userId, String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", userId);
        claims.put("username", username);
        claims.put("role", role);

        long now = System.currentTimeMillis();
        long expiresAt = now + props.getExpiresHours() * 3600_000L;

        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date(now))
                .expiration(new Date(expiresAt))
                .signWith(signingKey)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getPrefix() {
        return props.getPrefix();
    }

    public String getHeader() {
        return props.getHeader();
    }
}