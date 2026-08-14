package com.xkzoom.pms.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * OTA 渠道同步日志
 * 对应表 ota_sync_log（V1__init_schema.sql）
 * - operation: PUSH_AVAIL / PUSH_RATE / FETCH_BOOKING / PUSH_BOOKING / ...
 * - status:     OK / ERROR / SKIP
 * - occurredAt: 实际发生时间（前端展示时优先用此字段，无则用 createdAt 兜底）
 */
@Data
@TableName("ota_sync_log")
public class OtaSyncLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long channelId;
    private String operation;
    private String status;
    private String request;
    private String response;
    private String errorMsg;
    private Integer durationMs;
    private LocalDateTime occurredAt;
}