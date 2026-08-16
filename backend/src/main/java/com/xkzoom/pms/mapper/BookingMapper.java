package com.xkzoom.pms.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xkzoom.pms.entity.Booking;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface BookingMapper extends BaseMapper<Booking> {

    @Select("SELECT * FROM booking WHERE id = #{id} FOR UPDATE")
    Booking selectByIdForUpdate(@Param("id") Long id);

    @Select("SELECT * FROM booking WHERE idempotency_key = #{key} LIMIT 1")
    Booking selectByIdempotencyKey(@Param("key") String key);
}
