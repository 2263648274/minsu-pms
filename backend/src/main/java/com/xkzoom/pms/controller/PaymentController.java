package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Payment;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.PaymentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 支付流水 CRUD —— Phase 2 配套
 *
 * 提供单条 payment 记录的增删改查 + 月度汇总。
 * 财务对账聚合（按渠道 / 按订单级别）由 FinanceController 提供。
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentMapper mapper;

    /** 分页查询支付流水 */
    @GetMapping
    public Result<Page<Payment>> list(
            @RequestParam(required = false) Long bookingId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String method,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        LambdaQueryWrapper<Payment> w = new LambdaQueryWrapper<>();
        if (bookingId != null) w.eq(Payment::getBookingId, bookingId);
        if (type != null && !type.isBlank()) w.eq(Payment::getType, type);
        if (method != null && !method.isBlank()) w.eq(Payment::getMethod, method);
        w.orderByDesc(Payment::getPaidAt);
        return Result.ok(mapper.selectPage(new Page<>(current, size), w));
    }

    /** 详情 */
    @GetMapping("/{id}")
    public Result<Payment> get(@PathVariable Long id) {
        Payment p = mapper.selectById(id);
        if (p == null) throw new BusinessException("支付记录不存在");
        return Result.ok(p);
    }

    /** 新增（登记一笔收款 / 退款） */
    @PostMapping
    public Result<Payment> create(@RequestBody Payment p) {
        p.setId(null);
        LocalDateTime now = LocalDateTime.now();
        if (p.getPaidAt() == null) p.setPaidAt(now);
        if (p.getCreatedAt() == null) p.setCreatedAt(now);
        if (p.getCurrency() == null) p.setCurrency("CNY");
        if (p.getType() == null) p.setType("PAYMENT");
        if (p.getMethod() == null) p.setMethod("OTHER");
        mapper.insert(p);
        return Result.ok(p);
    }

    /** 更新（备注 / 交易号 / 操作员等） */
    @PutMapping("/{id}")
    public Result<Payment> update(@PathVariable Long id, @RequestBody Payment p) {
        p.setId(id);
        mapper.updateById(p);
        return Result.ok(mapper.selectById(id));
    }

    /** 逻辑删除 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }

    /** 订单级汇总：当前订单已收 / 已退 / 净额 */
    @GetMapping("/booking/{bookingId}/summary")
    public Result<Map<String, Object>> bookingSummary(@PathVariable Long bookingId) {
        LambdaQueryWrapper<Payment> w = new LambdaQueryWrapper<Payment>()
                .eq(Payment::getBookingId, bookingId);
        java.util.List<Payment> rows = mapper.selectList(w);
        java.math.BigDecimal paid = rows.stream()
                .filter(p -> "PAYMENT".equals(p.getType()))
                .map(Payment::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal refunded = rows.stream()
                .filter(p -> "REFUND".equals(p.getType()))
                .map(Payment::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        Map<String, Object> r = new HashMap<>();
        r.put("bookingId", bookingId);
        r.put("paidAmount", paid);
        r.put("refundedAmount", refunded);
        r.put("netAmount", paid.subtract(refunded));
        r.put("paymentCount", rows.size());
        return Result.ok(r);
    }
}