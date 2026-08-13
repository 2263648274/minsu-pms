package com.xkzoom.pms.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("booking")
public class Booking {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String bookingNo;
    private Long propertyId;
    private Long roomTypeId;
    private Long ratePlanId;
    private Long customerId;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer nights;
    private Integer rooms;
    private Integer guests;
    private BigDecimal roomPrice;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private String currency;
    private String source;
    private String status;
    private String paymentStatus;
    private String guestName;
    private String guestPhone;
    private String specialRequests;
    private String internalNotes;
    private LocalDateTime confirmedAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}