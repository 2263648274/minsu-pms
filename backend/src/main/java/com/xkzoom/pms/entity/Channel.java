package com.xkzoom.pms.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("channel")
public class Channel {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String code;
    private String name;
    private String logoUrl;
    private String apiBase;
    private String appKey;
    private String appSecret;
    private Integer enabled;
    private LocalDateTime lastSyncAt;
    private String lastStatus;
    private String lastError;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}