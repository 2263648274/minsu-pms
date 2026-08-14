package com.xkzoom.pms.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 支付流水
 * 对应表 payment（V1__init_schema.sql）
 * - method: CASH / CARD / WECHAT / ALIPAY / TRANSFER / OTHER
 * - type:   PAYMENT（收款）/ REFUND（退款）
 */
@Data
@TableName("payment")
public class Payment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long bookingId;
    private BigDecimal amount;
    private String currency;
    private String method;
    private String type;
    private String transactionNo;
    private LocalDateTime paidAt;
    private String operator;
    private String remarks;
    private LocalDateTime createdAt;
    @TableLogic
    private Integer deleted;
}