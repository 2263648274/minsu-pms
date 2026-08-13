package com.xkzoom.pms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.dto.RateCalendarBatchRequest;
import com.xkzoom.pms.dto.RateCalendarUpsertRequest;
import com.xkzoom.pms.entity.RateCalendar;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.RateCalendarMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RateCalendarService {

    private final RateCalendarMapper mapper;

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
    @Transactional
    public RateCalendar upsert(RateCalendarUpsertRequest req) {
        RateCalendar existing = mapper.selectOne(
                new LambdaQueryWrapper<RateCalendar>()
                        .eq(RateCalendar::getRatePlanId, req.getRatePlanId())
                        .eq(RateCalendar::getStayDate, req.getStayDate()));
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
            mapper.insert(r);
            return r;
        }
        existing.setPrice(req.getPrice());
        if (req.getAvailable() != null) existing.setAvailable(req.getAvailable());
        if (req.getMinNights() != null) existing.setMinNights(req.getMinNights());
        existing.setRemarks(req.getRemarks());
        existing.setUpdatedAt(now);
        mapper.updateById(existing);
        return existing;
    }

    /** 批量改价 */
    @Transactional
    public int batchUpdate(RateCalendarBatchRequest req) {
        if (req.getFromDate().isAfter(req.getToDate())) {
            throw new BusinessException("起始日期不能晚于结束日期");
        }
        List<RateCalendar> rows = query(req.getRoomTypeId(), req.getFromDate(), req.getToDate(), req.getRatePlanId());
        int updated = 0;
        LocalDateTime now = LocalDateTime.now();

        // 找到这条 plan 的基础价（用于 PERCENT_OFF/INCREASE 计算）
        BigDecimal basePrice = null;
        if ("PERCENT_OFF".equals(req.getMode()) || "INCREASE".equals(req.getMode())) {
            basePrice = rows.stream().findFirst().map(RateCalendar::getPrice).orElse(BigDecimal.ZERO);
            if (rows.isEmpty()) {
                throw new BusinessException("该时间段没有房价数据，无法按比例/金额调整");
            }
        }

        for (RateCalendar r : rows) {
            BigDecimal newPrice = r.getPrice();
            switch (req.getMode()) {
                case "FIXED" -> newPrice = req.getValue();
                case "PERCENT_OFF" -> {
                    // value=10 表示 9 折（保留 1 位小数）
                    BigDecimal ratio = BigDecimal.valueOf(100 - req.getValue().intValue())
                            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                    newPrice = r.getPrice().multiply(ratio).setScale(2, RoundingMode.HALF_UP);
                }
                case "INCREASE" -> newPrice = r.getPrice().add(req.getValue()).setScale(2, RoundingMode.HALF_UP);
                default -> throw new BusinessException("不支持的批量模式: " + req.getMode());
            }
            r.setPrice(newPrice);
            if (Boolean.TRUE.equals(req.getCloseRoom())) r.setAvailable(0);
            r.setRemarks(req.getRemarks());
            r.setUpdatedAt(now);
            mapper.updateById(r);
            updated++;
        }
        return updated;
    }
}