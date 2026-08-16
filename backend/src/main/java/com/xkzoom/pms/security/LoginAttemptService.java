package com.xkzoom.pms.security;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/** Small per-node login throttle; production can replace it with a shared store. */
@Service
public class LoginAttemptService {
    private static final int MAX_FAILURES = 5;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        Attempt attempt = attempts.get(key);
        if (attempt == null) return false;
        if (attempt.firstFailure.plus(WINDOW).isBefore(Instant.now())) {
            attempts.remove(key, attempt);
            return false;
        }
        return attempt.failures >= MAX_FAILURES;
    }

    public void recordFailure(String key) {
        Instant now = Instant.now();
        attempts.compute(key, (ignored, current) -> {
            if (current == null || current.firstFailure.plus(WINDOW).isBefore(now)) {
                return new Attempt(1, now);
            }
            return new Attempt(current.failures + 1, current.firstFailure);
        });
    }

    public void recordSuccess(String key) {
        attempts.remove(key);
    }

    private static final class Attempt {
        private final int failures;
        private final Instant firstFailure;

        private Attempt(int failures, Instant firstFailure) {
            this.failures = failures;
            this.firstFailure = firstFailure;
        }
    }
}
