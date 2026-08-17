package com.xkzoom.pms.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xkzoom.pms.entity.RateCalendar;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public interface RateCalendarMapper extends BaseMapper<RateCalendar> {

    /**
     * 原子 upsert：撞 uk_rate_calendar_tenant_date 时原地更新。
     * 并发下“先 SELECT 后 INSERT 再回退”会产生间隙锁死锁；单条语句在
     * 索引记录锁上串行，无死锁风险。tenant_id 不写入 SQL，由租户拦截器注入。
     * available 为 null 时保留现值（COALESCE），min_nights 同理。
     */
    @Insert("INSERT INTO rate_calendar "
            + "(rate_plan_id, room_type_id, stay_date, price, currency, available, min_nights, remarks, created_at, updated_at) "
            + "VALUES (#{ratePlanId}, #{roomTypeId}, #{stayDate}, #{price}, 'CNY', #{available}, #{minNights}, #{remarks}, #{now}, #{now}) "
            + "ON DUPLICATE KEY UPDATE "
            + "price = VALUES(price), "
            + "available = COALESCE(VALUES(available), available), "
            + "min_nights = COALESCE(VALUES(min_nights), min_nights), "
            + "remarks = VALUES(remarks), "
            + "updated_at = VALUES(updated_at)")
    int upsertRow(
            @Param("ratePlanId") Long ratePlanId,
            @Param("roomTypeId") Long roomTypeId,
            @Param("stayDate") LocalDate stayDate,
            @Param("price") BigDecimal price,
            @Param("available") Integer available,
            @Param("minNights") Integer minNights,
            @Param("remarks") String remarks,
            @Param("now") LocalDateTime now);
}
