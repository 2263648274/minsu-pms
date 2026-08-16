package com.xkzoom.pms.exception;

import com.xkzoom.pms.common.Result;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GlobalExceptionHandlerTest {

    @Test
    void unexpectedExceptionDoesNotLeakImplementationDetails() {
        Result<Void> result = new GlobalExceptionHandler()
                .handleAny(new IllegalStateException("database password was invalid"));

        assertEquals(500, result.getCode());
        assertEquals("系统内部错误，请联系管理员", result.getMessage());
        assertFalse(result.getMessage().contains("password"));
    }
}
