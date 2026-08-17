package com.xkzoom.pms.service;

import com.xkzoom.pms.dto.RateCalendarBatchRequest;
import com.xkzoom.pms.dto.RateCalendarBatchResult;
import com.xkzoom.pms.dto.RateCalendarUpsertRequest;
import com.xkzoom.pms.entity.RateCalendar;
import com.xkzoom.pms.entity.RatePlan;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.RateCalendarMapper;
import com.xkzoom.pms.mapper.RatePlanMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 房价日历"清除覆盖 / 跳过已覆盖"语义的业务场景测试（issue #4）。
 *
 * 显式覆盖语义：rate_calendar 中存在行 = 显式覆盖；缺行 = 前端回落房型基础价。
 * 租户边界在单测里通过 ratePlanMapper.selectById 返回 null 模拟——
 * 生产环境租户拦截器会把跨租户计划过滤成不可见。
 */
@ExtendWith(MockitoExtension.class)
class RateCalendarServiceTest {

    private static final Long PLAN_ID = 10L;
    private static final Long ROOM_TYPE_ID = 5L;

    @Mock
    private RateCalendarMapper rateCalendarMapper;

    @Mock
    private RatePlanMapper ratePlanMapper;

    private RateCalendarService service() {
        return new RateCalendarService(rateCalendarMapper, ratePlanMapper);
    }

    // ========== 场景 A：清除单日覆盖 ==========

    @Test
    @DisplayName("清除已有覆盖：删除该计划该日的显式记录并返回 true")
    void clearOverrideDeletesExplicitRowAndReportsTrue() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));
        RateCalendar existing = row(LocalDate.of(2026, 8, 2), "688.00");
        existing.setId(77L);
        when(rateCalendarMapper.selectOne(any())).thenReturn(existing);
        when(rateCalendarMapper.deleteById(77L)).thenReturn(1);

        boolean cleared = service().clearOverride(PLAN_ID, LocalDate.of(2026, 8, 2));

        assertTrue(cleared);
        verify(rateCalendarMapper).deleteById(77L);
    }

    @Test
    @DisplayName("清除无覆盖日期：幂等返回 false，不报错也不删除")
    void clearOverrideIsIdempotentWhenNoRowExists() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));
        when(rateCalendarMapper.selectOne(any())).thenReturn(null);

        boolean cleared = service().clearOverride(PLAN_ID, LocalDate.of(2026, 8, 2));

        assertFalse(cleared);
        verify(rateCalendarMapper, never()).deleteById(any(Long.class));
    }

    @Test
    @DisplayName("清除时计划不存在或跨租户：统一报“不存在或无权访问”，不泄露存在性")
    void clearOverrideRejectsUnknownPlanWithoutLeakingExistence() {
        when(ratePlanMapper.selectById(999L)).thenReturn(null);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service().clearOverride(999L, LocalDate.of(2026, 8, 2)));

        assertEquals("房价计划不存在或无权访问", e.getMessage());
        verify(rateCalendarMapper, never()).deleteById(any(Long.class));
    }

    // ========== 场景 B：批量 skipOverridden=true（跳过已覆盖） ==========

    @Test
    @DisplayName("跳过已覆盖：已有覆盖保持原价，缺失日按请求价创建，计数 inserted/skipped 正确")
    void batchSkipOverriddenKeepsExistingRowsAndInsertsMissingDays() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));
        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 8, 3);
        when(rateCalendarMapper.selectList(any()))
                .thenReturn(List.of(row(LocalDate.of(2026, 8, 2), "688.00")));

        RateCalendarBatchRequest req = batchReq(from, to, "FIXED", new BigDecimal("400.00"));
        req.setSkipOverridden(true);
        RateCalendarBatchResult result = service().batchUpdate(req);

        assertEquals(2, result.getInserted());
        assertEquals(0, result.getUpdated());
        assertEquals(1, result.getSkipped());

        ArgumentCaptor<RateCalendar> inserted = ArgumentCaptor.forClass(RateCalendar.class);
        verify(rateCalendarMapper, times(2)).insert(inserted.capture());
        assertEquals(List.of("2026-08-01", "2026-08-03"),
                inserted.getAllValues().stream().map(r -> r.getStayDate().toString()).toList());
        inserted.getAllValues().forEach(r -> {
            assertEquals(PLAN_ID, r.getRatePlanId());
            assertEquals(ROOM_TYPE_ID, r.getRoomTypeId());
            assertEquals(new BigDecimal("400.00"), r.getPrice());
            assertEquals("CNY", r.getCurrency());
            assertEquals(1, r.getAvailable());
        });
        // 已覆盖日不允许被改动
        verify(rateCalendarMapper, never()).updateById(any(RateCalendar.class));
    }

    // ========== 场景 C：批量 skipOverridden=false（全量 upsert） ==========

    @Test
    @DisplayName("全量 upsert：已有日更新为请求价，缺失日创建，计数正确")
    void batchUpsertAllUpdatesExistingAndInsertsMissing() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));
        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 8, 3);
        RateCalendar existing = row(LocalDate.of(2026, 8, 2), "688.00");
        existing.setId(77L);
        when(rateCalendarMapper.selectList(any())).thenReturn(List.of(existing));

        RateCalendarBatchRequest req = batchReq(from, to, "FIXED", new BigDecimal("400.00"));
        req.setSkipOverridden(false);
        RateCalendarBatchResult result = service().batchUpdate(req);

        assertEquals(2, result.getInserted());
        assertEquals(1, result.getUpdated());
        assertEquals(0, result.getSkipped());
        assertEquals(new BigDecimal("400.00"), existing.getPrice());
        verify(rateCalendarMapper).updateById(existing);
    }

    @Test
    @DisplayName("PERCENT_OFF：已有日按自身价打折，缺失日回落计划基础价打折")
    void batchPercentOffFallsBackToPlanBasePriceForMissingDays() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));
        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 8, 2);
        RateCalendar existing = row(LocalDate.of(2026, 8, 2), "688.00");
        when(rateCalendarMapper.selectList(any())).thenReturn(List.of(existing));

        // value=10 表示 9 折
        RateCalendarBatchRequest req = batchReq(from, to, "PERCENT_OFF", new BigDecimal("10"));
        RateCalendarBatchResult result = service().batchUpdate(req);

        assertEquals(1, result.getInserted());
        assertEquals(1, result.getUpdated());

        ArgumentCaptor<RateCalendar> inserted = ArgumentCaptor.forClass(RateCalendar.class);
        verify(rateCalendarMapper).insert(inserted.capture());
        // 缺失日：500.00 × 0.9
        assertEquals(new BigDecimal("450.00"), inserted.getValue().getPrice());
        // 已有日：688.00 × 0.9
        assertEquals(new BigDecimal("619.20"), existing.getPrice());
    }

    // ========== 场景 D：请求校验（先校验后写入） ==========

    @Test
    @DisplayName("反向日期范围被拒绝")
    void batchRejectsReversedRange() {
        BusinessException e = assertThrows(BusinessException.class, () -> service().batchUpdate(
                batchReq(LocalDate.of(2026, 8, 5), LocalDate.of(2026, 8, 1), "FIXED", new BigDecimal("400.00"))));

        assertEquals("起始日期不能晚于结束日期", e.getMessage());
        verify(rateCalendarMapper, never()).insert(any(RateCalendar.class));
        verify(rateCalendarMapper, never()).updateById(any(RateCalendar.class));
    }

    @Test
    @DisplayName("超过 366 天的范围被拒绝")
    void batchRejectsRangeBeyondLimit() {
        BusinessException e = assertThrows(BusinessException.class, () -> service().batchUpdate(
                batchReq(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 2), "FIXED", new BigDecimal("400.00"))));

        assertEquals("批量范围一次最多 366 天", e.getMessage());
        verify(rateCalendarMapper, never()).selectList(any());
    }

    @Test
    @DisplayName("未知 mode 被拒绝且不产生任何写入")
    void batchRejectsUnknownModeBeforeAnyWrite() {
        BusinessException e = assertThrows(BusinessException.class, () -> service().batchUpdate(
                batchReq(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2), "MAGIC", new BigDecimal("400.00"))));

        assertEquals("不支持的批量模式: MAGIC", e.getMessage());
        verify(rateCalendarMapper, never()).insert(any(RateCalendar.class));
        verify(rateCalendarMapper, never()).updateById(any(RateCalendar.class));
    }

    @Test
    @DisplayName("计划与房型不匹配被拒绝，且不产生任何写入")
    void batchRejectsRoomTypeMismatch() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));

        RateCalendarBatchRequest req = batchReq(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2), "FIXED", new BigDecimal("400.00"));
        req.setRoomTypeId(999L);

        BusinessException e = assertThrows(BusinessException.class, () -> service().batchUpdate(req));

        assertEquals("房价计划与房型不匹配", e.getMessage());
        verify(rateCalendarMapper, never()).selectList(any());
        verify(rateCalendarMapper, never()).insert(any(RateCalendar.class));
    }

    @Test
    @DisplayName("PERCENT_OFF 折扣超出 1-99 整数范围被拒绝")
    void batchRejectsInvalidPercentValue() {
        assertThrows(BusinessException.class, () -> service().batchUpdate(
                batchReq(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2), "PERCENT_OFF", new BigDecimal("150"))));
        assertThrows(BusinessException.class, () -> service().batchUpdate(
                batchReq(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2), "PERCENT_OFF", new BigDecimal("0"))));
        verify(rateCalendarMapper, never()).insert(any(RateCalendar.class));
    }

    @Test
    @DisplayName("FIXED 模式缺少 value 被拒绝")
    void batchRejectsFixedModeWithoutValue() {
        assertThrows(BusinessException.class, () -> service().batchUpdate(
                batchReq(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2), "FIXED", null)));
        verify(rateCalendarMapper, never()).insert(any(RateCalendar.class));
    }

    @Test
    @DisplayName("计划不存在或跨租户：统一报“不存在或无权访问”，不泄露存在性")
    void batchRejectsUnknownPlanWithoutLeakingExistence() {
        when(ratePlanMapper.selectById(999L)).thenReturn(null);

        RateCalendarBatchRequest req = batchReq(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2), "FIXED", new BigDecimal("400.00"));
        req.setRatePlanId(999L);

        BusinessException e = assertThrows(BusinessException.class, () -> service().batchUpdate(req));

        assertEquals("房价计划不存在或无权访问", e.getMessage());
        verify(rateCalendarMapper, never()).selectList(any());
        verify(rateCalendarMapper, never()).insert(any(RateCalendar.class));
    }

    // ========== 场景 E：单日 upsert 的关联校验与并发幂等 ==========

    @Test
    @DisplayName("单日 upsert：计划与房型不匹配被拒绝")
    void upsertRejectsRoomTypeMismatch() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));

        RateCalendarUpsertRequest req = upsertReq(LocalDate.of(2026, 8, 1), "400.00");
        req.setRoomTypeId(999L);

        BusinessException e = assertThrows(BusinessException.class, () -> service().upsert(req));

        assertEquals("房价计划与房型不匹配", e.getMessage());
        verify(rateCalendarMapper, never()).insert(any(RateCalendar.class));
    }

    @Test
    @DisplayName("并发撞租户级唯一键：insert 抛 DuplicateKeyException 后当前读赢家行并合并，不产生重复行")
    void upsertFallsBackToUpdateOnDuplicateKey() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(plan("500.00"));
        RateCalendar winner = row(LocalDate.of(2026, 8, 1), "688.00");
        winner.setId(55L);
        // 初始快照读未命中 → insert 撞唯一键 → FOR UPDATE 当前读拿到并发赢家
        when(rateCalendarMapper.selectOne(any())).thenReturn(null);
        when(rateCalendarMapper.selectByPlanAndDateForUpdate(PLAN_ID, LocalDate.of(2026, 8, 1)))
                .thenReturn(winner);
        when(rateCalendarMapper.insert(any(RateCalendar.class)))
                .thenThrow(new DuplicateKeyException("uk_rate_calendar_tenant_date"));

        RateCalendar saved = service().upsert(upsertReq(LocalDate.of(2026, 8, 1), "400.00"));

        assertEquals(55L, saved.getId());
        assertEquals(new BigDecimal("400.00"), saved.getPrice());
        // 撞键后只允许一次 insert 尝试 + 一次当前读 + 一次回退更新，不允许重复插入
        verify(rateCalendarMapper, times(1)).insert(any(RateCalendar.class));
        verify(rateCalendarMapper).selectByPlanAndDateForUpdate(PLAN_ID, LocalDate.of(2026, 8, 1));
        verify(rateCalendarMapper).updateById(winner);
    }

    // ========== 构造工具 ==========

    private RatePlan plan(String basePrice) {
        RatePlan plan = new RatePlan();
        plan.setId(PLAN_ID);
        plan.setRoomTypeId(ROOM_TYPE_ID);
        plan.setBasePrice(new BigDecimal(basePrice));
        return plan;
    }

    private RateCalendar row(LocalDate stayDate, String price) {
        RateCalendar r = new RateCalendar();
        r.setRatePlanId(PLAN_ID);
        r.setRoomTypeId(ROOM_TYPE_ID);
        r.setStayDate(stayDate);
        r.setPrice(new BigDecimal(price));
        r.setCurrency("CNY");
        r.setAvailable(1);
        return r;
    }

    private RateCalendarBatchRequest batchReq(LocalDate from, LocalDate to, String mode, BigDecimal value) {
        RateCalendarBatchRequest req = new RateCalendarBatchRequest();
        req.setRatePlanId(PLAN_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setFromDate(from);
        req.setToDate(to);
        req.setMode(mode);
        req.setValue(value);
        return req;
    }

    private RateCalendarUpsertRequest upsertReq(LocalDate stayDate, String price) {
        RateCalendarUpsertRequest req = new RateCalendarUpsertRequest();
        req.setRatePlanId(PLAN_ID);
        req.setRoomTypeId(ROOM_TYPE_ID);
        req.setStayDate(stayDate);
        req.setPrice(new BigDecimal(price));
        req.setAvailable(1);
        return req;
    }
}
