package com.xkzoom.pms.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 统一响应格式：{ code, message, data }
 * code: 200=成功, 400=业务错误, 401=未登录, 403=无权限, 500=系统错误
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> implements Serializable {

    private int code;
    private String message;
    private T data;

    public static <T> Result<T> ok() {
        return new Result<>(200, "OK", null);
    }

    public static <T> Result<T> ok(T data) {
        return new Result<>(200, "OK", data);
    }

    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }

    public static <T> Result<T> badRequest(String message) {
        return new Result<>(400, message, null);
    }

    public static <T> Result<T> unauthorized(String message) {
        return new Result<>(401, message, null);
    }

    public static <T> Result<T> serverError(String message) {
        return new Result<>(500, message, null);
    }
}