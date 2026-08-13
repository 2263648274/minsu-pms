package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.entity.Customer;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.BookingMapper;
import com.xkzoom.pms.mapper.CustomerMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerMapper mapper;
    private final BookingMapper bookingMapper;

    @GetMapping
    public Result<Page<Customer>> list(@RequestParam(defaultValue = "1") long current,
                                       @RequestParam(defaultValue = "20") long size,
                                       @RequestParam(required = false) String keyword,
                                       @RequestParam(required = false) Integer vipLevel,
                                       @RequestParam(required = false) Integer blacklist) {
        Page<Customer> page = new Page<>(current, size);
        LambdaQueryWrapper<Customer> w = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            w.like(Customer::getName, keyword)
                    .or().like(Customer::getPhone, keyword)
                    .or().like(Customer::getEmail, keyword);
        }
        if (vipLevel != null) w.eq(Customer::getVipLevel, vipLevel);
        if (blacklist != null) w.eq(Customer::getBlacklist, blacklist);
        w.orderByDesc(Customer::getId);
        return Result.ok(mapper.selectPage(page, w));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> get(@PathVariable Long id) {
        Customer c = mapper.selectById(id);
        if (c == null) throw new BusinessException("客人不存在");
        List<Booking> history = bookingMapper.selectList(
                new LambdaQueryWrapper<Booking>()
                        .eq(Booking::getCustomerId, id)
                        .orderByDesc(Booking::getCheckInDate));
        Map<String, Object> result = new HashMap<>();
        result.put("customer", c);
        result.put("history", history);
        result.put("totalStays", history.size());
        result.put("totalSpent", history.stream()
                .map(Booking::getTotalAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add));
        return Result.ok(result);
    }

    @PostMapping
    public Result<Customer> create(@RequestBody Customer c) {
        c.setId(null);
        c.setCreatedAt(LocalDateTime.now());
        c.setUpdatedAt(LocalDateTime.now());
        mapper.insert(c);
        return Result.ok(c);
    }

    @PutMapping("/{id}")
    public Result<Customer> update(@PathVariable Long id, @RequestBody Customer c) {
        c.setId(id);
        c.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(c);
        return Result.ok(mapper.selectById(id));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }
}