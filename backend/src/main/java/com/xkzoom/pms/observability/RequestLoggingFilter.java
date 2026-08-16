package com.xkzoom.pms.observability;

import java.io.IOException;
import java.util.UUID;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Correlates every HTTP response and emits one structured completion log. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {
    public static final String ATTR_REQUEST_ID = "requestId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String requestId = resolveRequestId(request);
        long started = System.nanoTime();
        request.setAttribute(ATTR_REQUEST_ID, requestId);
        response.setHeader("X-Request-ID", requestId);
        MDC.put("requestId", requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - started) / 1_000_000L;
            log.info("http_request method={} path={} status={} duration_ms={} request_id={}",
                    request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs, requestId);
            MDC.remove("requestId");
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String supplied = request.getHeader("X-Request-ID");
        if (supplied != null && supplied.matches("[A-Za-z0-9._-]{8,64}")) return supplied;
        return UUID.randomUUID().toString();
    }
}
