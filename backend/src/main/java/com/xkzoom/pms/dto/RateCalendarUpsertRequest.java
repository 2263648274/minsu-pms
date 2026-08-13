package com.xkzoom.pms.dto;

import javax.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RateCalendarUpsertRequest {
    @NotNull
    private Long ratePlanId;
    @NotNull
    private Long roomTypeId;
    @NotNull
    private LocalDate stayDate;
    @NotNull
    private BigDecimal price;
    private Integer available;
    private Integer minNights;
    private String remarks;
}