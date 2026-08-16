package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.BookingMapper;
import com.xkzoom.pms.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingMapper mapper;
    private final BookingService bookingService;

    @GetMapping
    public Result<Page<Booking>> list(@RequestParam(defaultValue = "1") long current,
                                     @RequestParam(defaultValue = "20") long size,
                                     @RequestParam(required = false) String status,
                                     @RequestParam(required = false) Long propertyId,
                                     @RequestParam(required = false) String keyword) {
        Page<Booking> page = new Page<>(current, size);
        LambdaQueryWrapper<Booking> wrapper = new LambdaQueryWrapper<>();
        if (status != null && !status.isEmpty()) wrapper.eq(Booking::getStatus, status);
        if (propertyId != null) wrapper.eq(Booking::getPropertyId, propertyId);
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.and(w -> w.like(Booking::getBookingNo, keyword)
                    .or().like(Booking::getGuestName, keyword)
                    .or().like(Booking::getGuestPhone, keyword));
        }
        wrapper.orderByDesc(Booking::getId);
        return Result.ok(mapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<Booking> get(@PathVariable Long id) {
        Booking booking = mapper.selectById(id);
        if (booking == null) throw new BusinessException("订单不存在");
        return Result.ok(booking);
    }

    @PostMapping
    public Result<Booking> create(
            @RequestBody Booking booking,
            @RequestHeader(name = "Idempotency-Key", required = false) String suppliedKey) {
        String key = bookingService.normalizeIdempotencyKey(suppliedKey);
        try {
            return Result.ok(bookingService.create(booking, key));
        } catch (DuplicateKeyException e) {
            return Result.ok(bookingService.resolveIdempotentConflict(booking, key));
        }
    }

    @PutMapping("/{id}")
    public Result<Booking> update(@PathVariable Long id, @RequestBody Booking booking) {
        return Result.ok(bookingService.update(id, booking));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        bookingService.delete(id);
        return Result.ok();
    }

    @PostMapping("/{id}/confirm")
    public Result<Booking> confirm(@PathVariable Long id) {
        return Result.ok(bookingService.confirm(id));
    }

    @PostMapping("/{id}/check-in")
    public Result<Booking> checkIn(@PathVariable Long id) {
        return Result.ok(bookingService.checkIn(id));
    }

    @PostMapping("/{id}/check-out")
    public Result<Booking> checkOut(@PathVariable Long id) {
        return Result.ok(bookingService.checkOut(id));
    }

    @PostMapping("/{id}/cancel")
    public Result<Booking> cancel(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> ignoredBody) {
        return Result.ok(bookingService.cancel(id));
    }

    @PostMapping("/{id}/refund")
    public Result<Map<String, Object>> refund(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Object rawAmount = body.get("amount");
        if (rawAmount == null) {
            throw new BusinessException("退款金额必填");
        }
        BigDecimal amount;
        try {
            amount = new BigDecimal(rawAmount.toString());
        } catch (NumberFormatException e) {
            throw new BusinessException("退款金额格式错误");
        }

        Booking booking = bookingService.refund(id, amount);
        Map<String, Object> result = new HashMap<>();
        result.put("booking", booking);
        result.put("refundedAmount", amount);
        return Result.ok(result);
    }
}
