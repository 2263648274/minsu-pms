package com.xkzoom.pms.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("rate_calendar")
public class RateCalendar {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long ratePlanId;
    private Long roomTypeId;
    private LocalDate stayDate;
    private BigDecimal price;
    private String currency;
    private Integer available;
    private Integer minNights;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}