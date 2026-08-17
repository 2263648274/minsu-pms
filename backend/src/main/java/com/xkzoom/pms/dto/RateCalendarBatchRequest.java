package com.xkzoom.pms.dto;

import javax.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/** 批量改价：mode = FIXED/PERCENT_OFF/INCREASE */
@Data
public class RateCalendarBatchRequest {
    @NotNull
    private Long ratePlanId;
    @NotNull
    private Long roomTypeId;
    @NotNull
    private LocalDate fromDate;
    @NotNull
    private LocalDate toDate;
    /** FIXED: 直接覆盖；PERCENT_OFF: 百分比折扣（10 = 9折）；INCREASE: 加固定金额 */
    @NotNull
    private String mode;
    /** FIXED 用；PERCENT_OFF 时为正整数 1-99；INCREASE 时为加价金额 */
    private BigDecimal value;
    /** true=保留范围内已有显式覆盖，只为缺失日期创建记录；false/null=范围内每天 upsert */
    private Boolean skipOverridden;
    /** 是否同时关房（available=0） */
    private Boolean closeRoom;
    private String remarks;
}