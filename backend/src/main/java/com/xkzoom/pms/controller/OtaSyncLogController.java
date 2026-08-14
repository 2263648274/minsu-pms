package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.OtaSyncLog;
import com.xkzoom.pms.mapper.OtaSyncLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * OTA 同步日志接口 —— Phase 2 配套 ChannelSyncLog.vue
 *
 * 字段命名说明（与 V1__init_schema.sql 对齐，MyBatis-Plus 自动下划线转驼峰）：
 *   operation     前端 type   （inventory_push → PUSH_AVAIL 等，前端映射）
 *   status        OK / ERROR / SKIP
 *   errorMsg      前端 errorMessage
 *   durationMs    前端同
 *   occurredAt    前端 createdAt
 *
 * 前端 ChannelSyncLog 的 `trigger`（auto/manual/webhook）字段不在 DB schema 里，
 * 由前端 service 层兜底为 'auto'。Phase 3 OTA 真实接入时再决定是否落库。
 */
@RestController
@RequestMapping("/api/sync-logs")
@RequiredArgsConstructor
public class OtaSyncLogController {

    private final OtaSyncLogMapper mapper;

    /**
     * 分页查询同步日志
     * @param channelId   渠道 ID（可选）
     * @param operation   操作类型：PUSH_AVAIL/PUSH_RATE/FETCH_BOOKING/PUSH_BOOKING（可选）
     * @param status      状态：OK/ERROR/SKIP（可选）
     * @param from        开始日期（含）
     * @param to          结束日期（含）
     * @param current     当前页
     * @param size        每页条数
     */
    @GetMapping
    public Result<Page<OtaSyncLog>> list(
            @RequestParam(required = false) Long channelId,
            @RequestParam(required = false) String operation,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        LambdaQueryWrapper<OtaSyncLog> w = new LambdaQueryWrapper<>();
        if (channelId != null) w.eq(OtaSyncLog::getChannelId, channelId);
        if (operation != null && !operation.isBlank()) w.eq(OtaSyncLog::getOperation, operation);
        if (status != null && !status.isBlank()) w.eq(OtaSyncLog::getStatus, status);
        if (from != null) w.ge(OtaSyncLog::getOccurredAt, from.atStartOfDay());
        if (to != null) w.le(OtaSyncLog::getOccurredAt, to.atTime(23, 59, 59));
        w.orderByDesc(OtaSyncLog::getOccurredAt);
        return Result.ok(mapper.selectPage(new Page<>(current, size), w));
    }

    /** 同步日志详情（含 request / response / errorMsg 全量） */
    @GetMapping("/{id}")
    public Result<OtaSyncLog> get(@PathVariable Long id) {
        OtaSyncLog log = mapper.selectById(id);
        if (log == null) return Result.error(404, "同步日志不存在");
        return Result.ok(log);
    }

    /**
     * 新增同步日志（手动推送 / 调试 / OTA 适配器回调）
     * request / response 推荐用 JSON 字符串（前端详情对话框展示时 JSON.stringify 还原）
     */
    @PostMapping
    public Result<OtaSyncLog> create(@RequestBody OtaSyncLog log) {
        log.setId(null);
        if (log.getOccurredAt() == null) log.setOccurredAt(LocalDateTime.now());
        if (log.getStatus() == null) log.setStatus("OK");
        mapper.insert(log);
        return Result.ok(log);
    }

    /**
     * 聚合统计：成功数 / 失败数 / 平均耗时（前端顶部"成功率 / 共 N 条"用）
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats(
            @RequestParam(required = false) Long channelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LambdaQueryWrapper<OtaSyncLog> w = new LambdaQueryWrapper<>();
        if (channelId != null) w.eq(OtaSyncLog::getChannelId, channelId);
        if (from != null) w.ge(OtaSyncLog::getOccurredAt, from.atStartOfDay());
        if (to != null) w.le(OtaSyncLog::getOccurredAt, to.atTime(23, 59, 59));

        List<OtaSyncLog> all = mapper.selectList(w);
        long total = all.size();
        long success = all.stream().filter(l -> "OK".equals(l.getStatus())).count();
        long error = all.stream().filter(l -> "ERROR".equals(l.getStatus())).count();
        long skip = all.stream().filter(l -> "SKIP".equals(l.getStatus())).count();
        double avgDuration = all.stream()
                .filter(l -> l.getDurationMs() != null)
                .mapToInt(OtaSyncLog::getDurationMs)
                .average().orElse(0);

        Map<String, Object> r = new HashMap<>();
        r.put("total", total);
        r.put("success", success);
        r.put("error", error);
        r.put("skip", skip);
        r.put("successRate", total == 0 ? 0 : Math.round(success * 1000.0 / total) / 1000.0);
        r.put("avgDurationMs", Math.round(avgDuration));
        return Result.ok(r);
    }
}