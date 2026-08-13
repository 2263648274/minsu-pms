package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.BookingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingMapper mapper;

    @GetMapping
    public Result<Page<Booking>> list(@RequestParam(defaultValue = "1") long current,
                                       @RequestParam(defaultValue = "20") long size,
                                       @RequestParam(required = false) String status,
                                       @RequestParam(required = false) Long propertyId,
                                       @RequestParam(required = false) String keyword) {
        Page<Booking> page = new Page<>(current, size);
        LambdaQueryWrapper<Booking> w = new LambdaQueryWrapper<>();
        if (status != null && !status.isEmpty()) w.eq(Booking::getStatus, status);
        if (propertyId != null) w.eq(Booking::getPropertyId, propertyId);
        if (keyword != null && !keyword.isEmpty()) {
            w.like(Booking::getBookingNo, keyword)
                    .or().like(Booking::getGuestName, keyword)
                    .or().like(Booking::getGuestPhone, keyword);
        }
        w.orderByDesc(Booking::getId);
        return Result.ok(mapper.selectPage(page, w));
    }

    @GetMapping("/{id}")
    public Result<Booking> get(@PathVariable Long id) {
        Booking b = mapper.selectById(id);
        if (b == null) throw new BusinessException("订单不存在");
        return Result.ok(b);
    }

    @PostMapping
    @Transactional
    public Result<Booking> create(@RequestBody Booking b) {
        b.setId(null);
        b.setBookingNo(generateBookingNo());
        b.setStatus("PENDING");
        b.setPaymentStatus("UNPAID");
        b.setCreatedAt(LocalDateTime.now());
        b.setUpdatedAt(LocalDateTime.now());
        mapper.insert(b);
        return Result.ok(b);
    }

    @PutMapping("/{id}")
    public Result<Booking> update(@PathVariable Long id, @RequestBody Booking b) {
        // 状态字段不能通过 update 直接改（避免破坏状态机）
        b.setId(id);
        b.setStatus(null);
        b.setBookingNo(null);
        b.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(b);
        return Result.ok(mapper.selectById(id));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }

    // ============================ 状态机 ============================

    @PostMapping("/{id}/confirm")
    @Transactional
    public Result<Booking> confirm(@PathVariable Long id) {
        Booking b = mapper.selectById(id);
        if (b == null) throw new BusinessException("订单不存在");
        if (!"PENDING".equals(b.getStatus())) throw new BusinessException("仅 PENDING 状态可确认");
        b.setStatus("CONFIRMED");
        b.setConfirmedAt(LocalDateTime.now());
        b.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(b);
        return Result.ok(b);
    }

    @PostMapping("/{id}/check-in")
    @Transactional
    public Result<Booking> checkIn(@PathVariable Long id) {
        Booking b = mapper.selectById(id);
        if (b == null) throw new BusinessException("订单不存在");
        if (!"CONFIRMED".equals(b.getStatus())) throw new BusinessException("仅 CONFIRMED 状态可办理入住");
        b.setStatus("CHECKED_IN");
        b.setCheckedInAt(LocalDateTime.now());
        b.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(b);
        return Result.ok(b);
    }

    @PostMapping("/{id}/check-out")
    @Transactional
    public Result<Booking> checkOut(@PathVariable Long id) {
        Booking b = mapper.selectById(id);
        if (b == null) throw new BusinessException("订单不存在");
        if (!"CHECKED_IN".equals(b.getStatus())) throw new BusinessException("仅 CHECKED_IN 状态可办理退房");
        b.setStatus("CHECKED_OUT");
        b.setCheckedOutAt(LocalDateTime.now());
        b.setPaymentStatus("PAID");
        b.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(b);
        return Result.ok(b);
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    public Result<Booking> cancel(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        Booking b = mapper.selectById(id);
        if (b == null) throw new BusinessException("订单不存在");
        if ("CHECKED_IN".equals(b.getStatus()) || "CHECKED_OUT".equals(b.getStatus())) {
            throw new BusinessException("已入住/已退房的订单不能取消");
        }
        b.setStatus("CANCELLED");
        b.setCancelledAt(LocalDateTime.now());
        // 已支付金额自动退款
        if (b.getPaidAmount() != null && b.getPaidAmount().signum() > 0) {
            b.setPaymentStatus("REFUNDED");
        }
        b.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(b);
        return Result.ok(b);
    }

    @PostMapping("/{id}/refund")
    @Transactional
    public Result<Map<String, Object>> refund(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Booking b = mapper.selectById(id);
        if (b == null) throw new BusinessException("订单不存在");
        Object amtObj = body.get("amount");
        if (amtObj == null) throw new BusinessException("退款金额必填");
        java.math.BigDecimal amount = new java.math.BigDecimal(amtObj.toString());
        if (amount.signum() <= 0) throw new BusinessException("退款金额必须大于 0");

        java.math.BigDecimal newPaid = b.getPaidAmount() == null ? java.math.BigDecimal.ZERO : b.getPaidAmount();
        newPaid = newPaid.subtract(amount);
        if (newPaid.signum() < 0) throw new BusinessException("退款金额超过已支付金额");

        b.setPaidAmount(newPaid);
        if (newPaid.signum() == 0) b.setPaymentStatus("REFUNDED");
        else b.setPaymentStatus("PARTIAL");
        b.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(b);

        Map<String, Object> result = new HashMap<>();
        result.put("booking", b);
        result.put("refundedAmount", amount);
        return Result.ok(result);
    }

    // ============================ 内部 ============================

    private String generateBookingNo() {
        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        // 用当日数量 + 4 位序号简化实现（生产用雪花算法）
        long count = mapper.selectCount(
                new LambdaQueryWrapper<Booking>().likeRight(Booking::getBookingNo, "BK" + today));
        return String.format("BK%s%04d", today, count + 1);
    }
}