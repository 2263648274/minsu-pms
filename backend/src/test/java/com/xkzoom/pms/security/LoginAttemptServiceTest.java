package com.xkzoom.pms.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginAttemptServiceTest {

    @Test
    void blocksAfterFiveFailuresAndSuccessClearsCounter() {
        LoginAttemptService service = new LoginAttemptService();
        String key = "127.0.0.1:admin";

        for (int i = 0; i < 5; i++) {
            assertFalse(service.isBlocked(key));
            service.recordFailure(key);
        }
        assertTrue(service.isBlocked(key));

        service.recordSuccess(key);
        assertFalse(service.isBlocked(key));
    }
}
