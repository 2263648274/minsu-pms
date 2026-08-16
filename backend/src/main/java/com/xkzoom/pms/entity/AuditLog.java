package com.xkzoom.pms.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("audit_log")
public class AuditLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long userId;
    private String username;
    private String role;
    private String action;
    private String resource;
    private String requestId;
    private String clientIp;
    private Integer httpStatus;
    private Integer success;
    private LocalDateTime occurredAt;
}
