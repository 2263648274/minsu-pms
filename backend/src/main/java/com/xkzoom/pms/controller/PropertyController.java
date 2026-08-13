package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Property;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.PropertyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyMapper mapper;

    @GetMapping
    public Result<Page<Property>> list(@RequestParam(defaultValue = "1") long current,
                                       @RequestParam(defaultValue = "20") long size,
                                       @RequestParam(required = false) String keyword) {
        Page<Property> page = new Page<>(current, size);
        LambdaQueryWrapper<Property> w = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            w.like(Property::getName, keyword).or().like(Property::getCode, keyword);
        }
        w.orderByDesc(Property::getId);
        return Result.ok(mapper.selectPage(page, w));
    }

    @GetMapping("/all")
    public Result<?> all() {
        return Result.ok(mapper.selectList(
                new LambdaQueryWrapper<Property>().orderByAsc(Property::getName)));
    }

    @GetMapping("/{id}")
    public Result<Property> get(@PathVariable Long id) {
        Property p = mapper.selectById(id);
        if (p == null) throw new BusinessException("物业不存在");
        return Result.ok(p);
    }

    @PostMapping
    public Result<Property> create(@RequestBody Property p) {
        p.setId(null);
        p.setCreatedAt(LocalDateTime.now());
        p.setUpdatedAt(LocalDateTime.now());
        mapper.insert(p);
        return Result.ok(p);
    }

    @PutMapping("/{id}")
    public Result<Property> update(@PathVariable Long id, @RequestBody Property p) {
        p.setId(id);
        p.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(p);
        return Result.ok(mapper.selectById(id));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }
}