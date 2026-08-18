package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.RatePlan;
import com.xkzoom.pms.mapper.RatePlanMapper;
import com.xkzoom.pms.service.RatePlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rate-plans")
@RequiredArgsConstructor
public class RatePlanController {

    private final RatePlanMapper mapper;
    private final RatePlanService service;

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

    @GetMapping("/{id}")
    public Result<RatePlan> getById(@PathVariable Long id) {
        return Result.ok(service.getById(id));
    }

    @PostMapping
    public Result<RatePlan> create(@RequestBody RatePlan rp) {
        return Result.ok(service.create(rp));
    }

    @PutMapping("/{id}")
    public Result<RatePlan> update(@PathVariable Long id, @RequestBody RatePlan rp) {
        return Result.ok(service.update(id, rp));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }
}