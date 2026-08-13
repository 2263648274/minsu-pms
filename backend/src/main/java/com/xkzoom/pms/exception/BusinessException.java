package com.xkzoom.pms.exception;

/** 业务异常（用于 service 层抛出，由 GlobalExceptionHandler 转为 400 响应） */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}