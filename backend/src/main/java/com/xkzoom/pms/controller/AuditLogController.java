package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.AuditLog;
import com.xkzoom.pms.mapper.AuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Tenant-scoped, administrator-only security audit trail. */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {
    private final AuditLogMapper mapper;

    @GetMapping
    public Result<Page<AuditLog>> list(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String action,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        long safeSize = Math.min(Math.max(size, 1), 100);
        LambdaQueryWrapper<AuditLog> query = new LambdaQueryWrapper<>();
        if (userId != null) query.eq(AuditLog::getUserId, userId);
        if (action != null && !action.isBlank()) query.eq(AuditLog::getAction, action.toUpperCase());
        query.orderByDesc(AuditLog::getOccurredAt);
        return Result.ok(mapper.selectPage(new Page<>(Math.max(current, 1), safeSize), query));
    }
}
