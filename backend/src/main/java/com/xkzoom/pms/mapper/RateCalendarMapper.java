package com.xkzoom.pms.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xkzoom.pms.entity.RateCalendar;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;

public interface RateCalendarMapper extends BaseMapper<RateCalendar> {

    /**
     * 当前读（FOR UPDATE）：绕过 REPEATABLE READ 的快照，读取该计划该日
     * 最新已提交的行。并发 upsert 撞 uk_rate_calendar_tenant_date 后的
     * 回退合并必须用它，普通 selectOne 可能看不到并发赢家刚提交的行。
     */
    @Select("SELECT * FROM rate_calendar "
            + "WHERE rate_plan_id = #{ratePlanId} AND stay_date = #{stayDate} FOR UPDATE")
    RateCalendar selectByPlanAndDateForUpdate(
            @Param("ratePlanId") Long ratePlanId,
            @Param("stayDate") LocalDate stayDate);
}
