package com.xkzoom.pms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.dto.RateCalendarBatchRequest;
import com.xkzoom.pms.dto.RateCalendarBatchResult;
import com.xkzoom.pms.dto.RateCalendarUpsertRequest;
import com.xkzoom.pms.entity.RateCalendar;
import com.xkzoom.pms.entity.RatePlan;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.RateCalendarMapper;
import com.xkzoom.pms.mapper.RatePlanMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RateCalendarService {

    /** 批量范围一次最多覆盖的天数（含首尾） */
    public static final int MAX_BATCH_DAYS = 366;

    private final RateCalendarMapper mapper;
    private final RatePlanMapper ratePlanMapper;

    /** 查询某房型某段时间的房价 */
    public List<RateCalendar> query(Long roomTypeId, LocalDate from, LocalDate to, Long ratePlanId) {
        LambdaQueryWrapper<RateCalendar> w = new LambdaQueryWrapper<>();
        w.eq(RateCalendar::getRoomTypeId, roomTypeId);
        if (ratePlanId != null) w.eq(RateCalendar::getRatePlanId, ratePlanId);
        w.between(RateCalendar::getStayDate, from, to);
        w.orderByAsc(RateCalendar::getStayDate);
        return mapper.selectList(w);
    }

    /** 单日 upsert */
    @Transactional(rollbackFor = Exception.class)
    public RateCalendar upsert(RateCalendarUpsertRequest req) {
        requirePlanAccessible(req.getRatePlanId(), req.getRoomTypeId());
        RateCalendar existing = selectByPlanAndDate(req.getRatePlanId(), req.getStayDate());
        LocalDateTime now = LocalDateTime.now();
        if (existing == null) {
            RateCalendar r = new RateCalendar();
            r.setRatePlanId(req.getRatePlanId());
            r.setRoomTypeId(req.getRoomTypeId());
            r.setStayDate(req.getStayDate());
            r.setPrice(req.getPrice());
            r.setCurrency("CNY");
            r.setAvailable(req.getAvailable() != null ? req.getAvailable() : 1);
            r.setMinNights(req.getMinNights());
            r.setRemarks(req.getRemarks());
            r.setCreatedAt(now);
            r.setUpdatedAt(now);
            return insertOrMergeOnDuplicateKey(r);
        }
        existing.setPrice(req.getPrice());
        if (req.getAvailable() != null) existing.setAvailable(req.getAvailable());
        if (req.getMinNights() != null) existing.setMinNights(req.getMinNights());
        existing.setRemarks(req.getRemarks());
        existing.setUpdatedAt(now);
        mapper.updateById(existing);
        return existing;
    }

    /**
     * 清除单日显式覆盖：删除当前租户、指定 rate plan、指定日期的 rate_calendar 行。
     * 行删除后前端回落房型基础价并标记 overridden=false。无行时幂等返回 false。
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean clearOverride(Long ratePlanId, LocalDate stayDate) {
        requirePlanAccessible(ratePlanId, null);
        RateCalendar existing = selectByPlanAndDate(ratePlanId, stayDate);
        if (existing == null) {
            return false;
        }
        return mapper.deleteById(existing.getId()) > 0;
    }

    /**
     * 批量改价。显式覆盖语义：rate_calendar 存在行 = 已覆盖。
     * skipOverridden=true：保留已有行（计入 skipped），只为缺失日期创建记录。
     * skipOverridden=false/null：范围内每天 upsert（缺失创建、已有改价）。
     */
    @Transactional(rollbackFor = Exception.class)
    public RateCalendarBatchResult batchUpdate(RateCalendarBatchRequest req) {
        if (req.getFromDate().isAfter(req.getToDate())) {
            throw new BusinessException("起始日期不能晚于结束日期");
        }
        long days = ChronoUnit.DAYS.between(req.getFromDate(), req.getToDate()) + 1;
        if (days > MAX_BATCH_DAYS) {
            throw new BusinessException("批量范围一次最多 " + MAX_BATCH_DAYS + " 天");
        }
        validateMode(req);
        RatePlan plan = requirePlanAccessible(req.getRatePlanId(), req.getRoomTypeId());

        Map<LocalDate, RateCalendar> existingByDate = new HashMap<>();
        for (RateCalendar r : query(req.getRoomTypeId(), req.getFromDate(), req.getToDate(), req.getRatePlanId())) {
            existingByDate.put(r.getStayDate(), r);
        }

        int inserted = 0;
        int updated = 0;
        int skipped = 0;
        LocalDateTime now = LocalDateTime.now();

        for (LocalDate d = req.getFromDate(); !d.isAfter(req.getToDate()); d = d.plusDays(1)) {
            RateCalendar existing = existingByDate.get(d);
            if (existing != null && Boolean.TRUE.equals(req.getSkipOverridden())) {
                skipped++;
                continue;
            }
            // 已有日按自身价计算；缺失日 FIXED 用请求价，比例/金额模式回落计划基础价
            BigDecimal base = existing != null ? existing.getPrice() : plan.getBasePrice();
            BigDecimal newPrice = computePrice(req, d, base);
            if (existing == null) {
                RateCalendar r = new RateCalendar();
                r.setRatePlanId(req.getRatePlanId());
                r.setRoomTypeId(req.getRoomTypeId());
                r.setStayDate(d);
                r.setPrice(newPrice);
                r.setCurrency("CNY");
                r.setAvailable(Boolean.TRUE.equals(req.getCloseRoom()) ? 0 : 1);
                r.setRemarks(req.getRemarks());
                r.setCreatedAt(now);
                r.setUpdatedAt(now);
                insertOrMergeOnDuplicateKey(r);
                inserted++;
            } else {
                existing.setPrice(newPrice);
                if (Boolean.TRUE.equals(req.getCloseRoom())) existing.setAvailable(0);
                existing.setRemarks(req.getRemarks());
                existing.setUpdatedAt(now);
                mapper.updateById(existing);
                updated++;
            }
        }
        return new RateCalendarBatchResult(inserted, updated, skipped);
    }

    private void validateMode(RateCalendarBatchRequest req) {
        switch (req.getMode()) {
            case "FIXED" -> {
                if (req.getValue() == null) throw new BusinessException("FIXED 模式必须提供价格");
                if (req.getValue().compareTo(BigDecimal.ZERO) < 0) throw new BusinessException("价格不能为负数");
            }
            case "PERCENT_OFF" -> {
                if (req.getValue() == null
                        || req.getValue().stripTrailingZeros().scale() > 0
                        || req.getValue().compareTo(BigDecimal.ONE) < 0
                        || req.getValue().compareTo(new BigDecimal("99")) > 0) {
                    throw new BusinessException("PERCENT_OFF 折扣须为 1-99 的整数");
                }
            }
            case "INCREASE" -> {
                if (req.getValue() == null) throw new BusinessException("INCREASE 模式必须提供加价金额");
            }
            default -> throw new BusinessException("不支持的批量模式: " + req.getMode());
        }
    }

    private BigDecimal computePrice(RateCalendarBatchRequest req, LocalDate date, BigDecimal base) {
        if (base == null) {
            throw new BusinessException("房价计划缺少基础价，无法为 " + date + " 计算价格");
        }
        BigDecimal newPrice;
        switch (req.getMode()) {
            case "FIXED" -> newPrice = req.getValue();
            case "PERCENT_OFF" -> {
                // value=10 表示 9 折（保留 1 位小数）
                BigDecimal ratio = BigDecimal.valueOf(100 - req.getValue().intValue())
                        .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                newPrice = base.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
            }
            case "INCREASE" -> newPrice = base.add(req.getValue()).setScale(2, RoundingMode.HALF_UP);
            default -> throw new BusinessException("不支持的批量模式: " + req.getMode());
        }
        if (newPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("价格不能为负数");
        }
        return newPrice;
    }

    /**
     * 校验 rate plan 归当前租户（跨租户计划被租户拦截器过滤为 null）且与房型匹配。
     * 两种失败共用同一文案，不泄露计划是否存在。
     */
    private RatePlan requirePlanAccessible(Long ratePlanId, Long roomTypeId) {
        RatePlan plan = ratePlanMapper.selectById(ratePlanId);
        if (plan == null) {
            throw new BusinessException("房价计划不存在或无权访问");
        }
        if (roomTypeId != null && !plan.getRoomTypeId().equals(roomTypeId)) {
            throw new BusinessException("房价计划与房型不匹配");
        }
        return plan;
    }

    private RateCalendar selectByPlanAndDate(Long ratePlanId, LocalDate stayDate) {
        return mapper.selectOne(
                new LambdaQueryWrapper<RateCalendar>()
                        .eq(RateCalendar::getRatePlanId, ratePlanId)
                        .eq(RateCalendar::getStayDate, stayDate));
    }

    /**
     * 并发兜底：两个请求同时为同一 (tenant, plan, date) 插入时，租户级唯一键
     * uk_rate_calendar_tenant_date 会让后到者抛 DuplicateKeyException；此时改为
     * 读取赢家行并按本次请求合并，保证幂等且不产生重复记录。
     */
    private RateCalendar insertOrMergeOnDuplicateKey(RateCalendar r) {
        try {
            mapper.insert(r);
            return r;
        } catch (DuplicateKeyException e) {
            RateCalendar winner = selectByPlanAndDate(r.getRatePlanId(), r.getStayDate());
            if (winner == null) {
                throw e;
            }
            winner.setPrice(r.getPrice());
            if (r.getAvailable() != null) winner.setAvailable(r.getAvailable());
            if (r.getMinNights() != null) winner.setMinNights(r.getMinNights());
            winner.setRemarks(r.getRemarks());
            winner.setUpdatedAt(r.getUpdatedAt());
            mapper.updateById(winner);
            return winner;
        }
    }
}
