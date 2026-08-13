package com.xkzoom.pms.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("rate_plan")
public class RatePlan {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long propertyId;
    private Long roomTypeId;
    private String name;
    private String code;
    private BigDecimal basePrice;
    private String currency;
    private String mealPlan;
    private Integer minNights;
    private Integer maxNights;
    private String description;
    private Integer active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}