package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.RatePlan;
import com.xkzoom.pms.mapper.RatePlanMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/rate-plans")
@RequiredArgsConstructor
public class RatePlanController {

    private final RatePlanMapper mapper;

    @GetMapping
    public Result<Page<RatePlan>> list(@RequestParam(defaultValue = "1") long current,
                                       @RequestParam(defaultValue = "20") long size,
                                       @RequestParam(required = false) Long roomTypeId,
                                       @RequestParam(required = false) Long propertyId) {
        Page<RatePlan> page = new Page<>(current, size);
        LambdaQueryWrapper<RatePlan> w = new LambdaQueryWrapper<>();
        if (roomTypeId != null) w.eq(RatePlan::getRoomTypeId, roomTypeId);
        if (propertyId != null) w.eq(RatePlan::getPropertyId, propertyId);
        w.orderByDesc(RatePlan::getId);
        return Result.ok(mapper.selectPage(page, w));
    }

    @GetMapping("/by-room-type/{roomTypeId}")
    public Result<List<RatePlan>> byRoomType(@PathVariable Long roomTypeId) {
        return Result.ok(mapper.selectList(
                new LambdaQueryWrapper<RatePlan>()
                        .eq(RatePlan::getRoomTypeId, roomTypeId)
                        .eq(RatePlan::getActive, 1)
                        .orderByAsc(RatePlan::getBasePrice)));
    }

    @PostMapping
    public Result<RatePlan> create(@RequestBody RatePlan rp) {
        rp.setId(null);
        rp.setCreatedAt(LocalDateTime.now());
        rp.setUpdatedAt(LocalDateTime.now());
        mapper.insert(rp);
        return Result.ok(rp);
    }

    @PutMapping("/{id}")
    public Result<RatePlan> update(@PathVariable Long id, @RequestBody RatePlan rp) {
        rp.setId(id);
        rp.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(rp);
        return Result.ok(mapper.selectById(id));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }
}