package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Room;
import com.xkzoom.pms.mapper.RoomMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomMapper mapper;

    @GetMapping
    public Result<Page<Room>> list(@RequestParam(defaultValue = "1") long current,
                                   @RequestParam(defaultValue = "20") long size,
                                   @RequestParam(required = false) Long propertyId,
                                   @RequestParam(required = false) Long roomTypeId,
                                   @RequestParam(required = false) String keyword) {
        Page<Room> page = new Page<>(current, size);
        LambdaQueryWrapper<Room> w = new LambdaQueryWrapper<>();
        if (propertyId != null) w.eq(Room::getPropertyId, propertyId);
        if (roomTypeId != null) w.eq(Room::getRoomTypeId, roomTypeId);
        if (keyword != null && !keyword.isEmpty()) w.like(Room::getRoomNo, keyword);
        w.orderByAsc(Room::getRoomNo);
        return Result.ok(mapper.selectPage(page, w));
    }

    @PostMapping
    public Result<Room> create(@RequestBody Room r) {
        r.setId(null);
        r.setCreatedAt(LocalDateTime.now());
        r.setUpdatedAt(LocalDateTime.now());
        mapper.insert(r);
        return Result.ok(r);
    }

    @PutMapping("/{id}")
    public Result<Room> update(@PathVariable Long id, @RequestBody Room r) {
        r.setId(id);
        r.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(r);
        return Result.ok(mapper.selectById(id));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }
}