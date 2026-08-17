package com.xkzoom.pms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 批量改价结果：范围内每天归类为新增 / 更新 / 跳过之一 */
@Data
@AllArgsConstructor
public class RateCalendarBatchResult {
    /** 范围内原本缺行、本次创建的天数 */
    private int inserted;
    /** 范围内已有行、本次按请求改价的天数 */
    private int updated;
    /** 因 skipOverridden=true 而保持原状的已覆盖天数 */
    private int skipped;
}
