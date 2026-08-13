package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.RoomType;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.RoomTypeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/room-types")
@RequiredArgsConstructor
public class RoomTypeController {

    private final RoomTypeMapper mapper;

    @GetMapping
    public Result<Page<RoomType>> list(@RequestParam(defaultValue = "1") long current,
                                       @RequestParam(defaultValue = "20") long size,
                                       @RequestParam(required = false) Long propertyId,
                                       @RequestParam(required = false) String keyword) {
        Page<RoomType> page = new Page<>(current, size);
        LambdaQueryWrapper<RoomType> w = new LambdaQueryWrapper<>();
        if (propertyId != null) w.eq(RoomType::getPropertyId, propertyId);
        if (keyword != null && !keyword.isEmpty()) w.like(RoomType::getName, keyword);
        w.orderByDesc(RoomType::getId);
        return Result.ok(mapper.selectPage(page, w));
    }

    @GetMapping("/by-property/{propertyId}")
    public Result<List<RoomType>> byProperty(@PathVariable Long propertyId) {
        return Result.ok(mapper.selectList(
                new LambdaQueryWrapper<RoomType>()
                        .eq(RoomType::getPropertyId, propertyId)
                        .orderByAsc(RoomType::getName)));
    }

    @GetMapping("/{id}")
    public Result<RoomType> get(@PathVariable Long id) {
        RoomType rt = mapper.selectById(id);
        if (rt == null) throw new BusinessException("房型不存在");
        return Result.ok(rt);
    }

    @PostMapping
    public Result<RoomType> create(@RequestBody RoomType rt) {
        rt.setId(null);
        rt.setCreatedAt(LocalDateTime.now());
        rt.setUpdatedAt(LocalDateTime.now());
        mapper.insert(rt);
        return Result.ok(rt);
    }

    @PutMapping("/{id}")
    public Result<RoomType> update(@PathVariable Long id, @RequestBody RoomType rt) {
        rt.setId(id);
        rt.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(rt);
        return Result.ok(mapper.selectById(id));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }
}