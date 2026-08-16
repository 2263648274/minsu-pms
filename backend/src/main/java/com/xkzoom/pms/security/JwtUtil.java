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
 * JWT utility. Every issued token binds a user to exactly one tenant.
 */
@Component
public class JwtUtil {

    private final JwtProperties props;
    private final SecretKey signingKey;

    public JwtUtil(JwtProperties props) {
        this.props = props;
        if (props.getSecret() == null || props.getSecret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("pms.jwt.secret must contain at least 32 UTF-8 bytes");
        }
        this.signingKey = Keys.hmacShaKeyFor(props.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generate(Long userId, Long tenantId, String username, String role) {
        if (tenantId == null || tenantId <= 0) {
            throw new IllegalArgumentException("tenantId must be positive");
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", userId);
        claims.put("tid", tenantId);
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
