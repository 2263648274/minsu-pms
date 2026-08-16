package com.xkzoom.pms.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xkzoom.pms.entity.Inventory;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDate;

public interface InventoryMapper extends BaseMapper<Inventory> {

    @Select("SELECT * FROM inventory "
            + "WHERE room_type_id = #{roomTypeId} AND stay_date = #{stayDate} FOR UPDATE")
    Inventory selectByDateForUpdate(
            @Param("roomTypeId") Long roomTypeId,
            @Param("stayDate") LocalDate stayDate);

    @Update("UPDATE inventory "
            + "SET sold_rooms = sold_rooms + #{rooms}, updated_at = NOW() "
            + "WHERE room_type_id = #{roomTypeId} "
            + "AND stay_date >= #{checkInDate} AND stay_date < #{checkOutDate} "
            + "AND status = 'OPEN' "
            + "AND total_rooms - sold_rooms - blocked_rooms >= #{rooms}")
    int reserveRange(
            @Param("roomTypeId") Long roomTypeId,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate,
            @Param("rooms") int rooms);

    @Update("UPDATE inventory "
            + "SET sold_rooms = sold_rooms - #{rooms}, updated_at = NOW() "
            + "WHERE room_type_id = #{roomTypeId} "
            + "AND stay_date >= #{checkInDate} AND stay_date < #{checkOutDate} "
            + "AND sold_rooms >= #{rooms}")
    int releaseRange(
            @Param("roomTypeId") Long roomTypeId,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate,
            @Param("rooms") int rooms);
}
