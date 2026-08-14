package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.mapper.BookingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/**
 * 财务对账聚合 —— Phase 2 配套 FinanceManage.vue
 *
 * 三个 endpoint：
 *   /api/finance/stats              → 顶部 4 张统计卡（月度营收 / 底价 / 佣金 / 净收入）
 *   /api/finance/channel-settlements → 按渠道聚合结算表
 *   /api/finance/order-settlements  → 订单级对账明细（分页）
 *
 * 数据源：booking 表（status 已 CHECKED_OUT / CHECKED_IN / CONFIRMED）
 * 计算口径：
 *   sellingAmount = booking.totalAmount
 *   commissionRate  按 source 渠道比例（DIRECT=0, CTRIP=15%, MEITUAN=12%, FLIGGY=10%, BOOKING=18%, AIRBNB=3%, 其他=10%）
 *   commission    = sellingAmount × commissionRate
 *   netRevenue    = sellingAmount − commission
 *   baseAmount    = sellingAmount − commission − 保留利润(15%)  —— 模拟"底价"
 *   diff          = netRevenue − baseAmount
 */
@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final BookingMapper bookingMapper;

    /** 渠道佣金比例（前端 mock 用同样口径，前端接入时保持一致） */
    private static final Map<String, Double> COMMISSION_RATE = Map.of(
            "DIRECT",  0.0,
            "CTRIP",   0.15,
            "MEITUAN", 0.12,
            "FLIGGY",  0.10,
            "BOOKING", 0.18,
            "AIRBNB",  0.03
    );
    private static final double DEFAULT_RATE = 0.10;
    private static final double PROFIT_MARGIN = 0.15;  // 保留利润空间，模拟底价

    /**
     * 月度 4 张统计卡：营收 / 底价 / 佣金 / 净收入 + 订单数
     * @param month 格式 yyyy-MM（可选，默认当月）
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats(@RequestParam(required = false) String month) {
        YearMonth ym = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        List<Booking> rows = bookingMapper.selectList(
                new LambdaQueryWrapper<Booking>()
                        .between(Booking::getCheckInDate, start, end)
                        .in(Booking::getStatus, List.of("CHECKED_IN", "CHECKED_OUT", "CONFIRMED")));

        BigDecimal monthRevenue = BigDecimal.ZERO;
        BigDecimal monthBase = BigDecimal.ZERO;
        BigDecimal monthCommission = BigDecimal.ZERO;
        BigDecimal monthNet = BigDecimal.ZERO;
        int orderCount = rows.size();

        for (Booking b : rows) {
            BigDecimal selling = nz(b.getTotalAmount());
            double rate = rateOf(b.getSource());
            BigDecimal commission = selling.multiply(BigDecimal.valueOf(rate)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = selling.subtract(commission).setScale(2, RoundingMode.HALF_UP);
            BigDecimal base = selling.subtract(commission)
                    .multiply(BigDecimal.valueOf(1 - PROFIT_MARGIN)).setScale(2, RoundingMode.HALF_UP);
            monthRevenue = monthRevenue.add(selling);
            monthCommission = monthCommission.add(commission);
            monthNet = monthNet.add(net);
            monthBase = monthBase.add(base);
        }

        Map<String, Object> r = new HashMap<>();
        r.put("month", ym.toString());
        r.put("monthRevenue", monthRevenue);
        r.put("monthBase", monthBase);
        r.put("monthCommission", monthCommission);
        r.put("monthNet", monthNet);
        r.put("orderCount", orderCount);
        return Result.ok(r);
    }

    /**
     * 按渠道聚合结算明细（FinanceManage.vue 上表）
     * 字段：channelId / orderCount / nights / sellingAmount / baseAmount /
     *       commissionRate / commission / netRevenue
     */
    @GetMapping("/channel-settlements")
    public Result<List<Map<String, Object>>> channelSettlements(
            @RequestParam(required = false) String month) {
        YearMonth ym = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month);
        List<Booking> rows = bookingsInMonth(ym);

        // 用 LinkedHashMap 保序（DIRECT 排第一）
        Map<String, Map<String, Object>> agg = new LinkedHashMap<>();
        for (Booking b : rows) {
            String ch = b.getSource() == null ? "DIRECT" : b.getSource();
            Map<String, Object> row = agg.computeIfAbsent(ch, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("channelId", k);
                m.put("orderCount", 0);
                m.put("nights", 0);
                m.put("sellingAmount", BigDecimal.ZERO);
                m.put("baseAmount", BigDecimal.ZERO);
                m.put("commissionRate", rateOf(k));
                m.put("commission", BigDecimal.ZERO);
                m.put("netRevenue", BigDecimal.ZERO);
                return m;
            });
            BigDecimal selling = nz(b.getTotalAmount());
            double rate = rateOf(ch);
            BigDecimal commission = selling.multiply(BigDecimal.valueOf(rate)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = selling.subtract(commission).setScale(2, RoundingMode.HALF_UP);
            BigDecimal base = selling.subtract(commission)
                    .multiply(BigDecimal.valueOf(1 - PROFIT_MARGIN)).setScale(2, RoundingMode.HALF_UP);

            row.put("orderCount", (int) row.get("orderCount") + 1);
            row.put("nights", (int) row.get("nights") + (b.getNights() == null ? 0 : b.getNights()));
            row.put("sellingAmount", ((BigDecimal) row.get("sellingAmount")).add(selling));
            row.put("baseAmount", ((BigDecimal) row.get("baseAmount")).add(base));
            row.put("commission", ((BigDecimal) row.get("commission")).add(commission));
            row.put("netRevenue", ((BigDecimal) row.get("netRevenue")).add(net));
        }
        return Result.ok(new ArrayList<>(agg.values()));
    }

    /**
     * 订单级对账明细（FinanceManage.vue 下表，分页）
     * 字段：orderNo / channelId / checkInDate / checkOutDate / nights / guestName /
     *       sellingAmount / baseAmount / commission / netRevenue / diff
     */
    @GetMapping("/order-settlements")
    public Result<Page<Map<String, Object>>> orderSettlements(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String channelId,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        YearMonth ym = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month);
        LambdaQueryWrapper<Booking> w = new LambdaQueryWrapper<Booking>()
                .between(Booking::getCheckInDate, ym.atDay(1), ym.atEndOfMonth())
                .in(Booking::getStatus, List.of("CHECKED_IN", "CHECKED_OUT", "CONFIRMED"))
                .orderByDesc(Booking::getCheckInDate);
        if (channelId != null && !channelId.isBlank()) w.eq(Booking::getSource, channelId);
        Page<Booking> page = bookingMapper.selectPage(new Page<>(current, size), w);

        List<Map<String, Object>> mapped = new ArrayList<>();
        for (Booking b : page.getRecords()) {
            BigDecimal selling = nz(b.getTotalAmount());
            double rate = rateOf(b.getSource());
            BigDecimal commission = selling.multiply(BigDecimal.valueOf(rate)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = selling.subtract(commission).setScale(2, RoundingMode.HALF_UP);
            BigDecimal base = selling.subtract(commission)
                    .multiply(BigDecimal.valueOf(1 - PROFIT_MARGIN)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal diff = net.subtract(base).setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("orderNo", b.getBookingNo());
            row.put("channelId", b.getSource() == null ? "DIRECT" : b.getSource());
            row.put("checkInDate", b.getCheckInDate() == null ? null : b.getCheckInDate().toString());
            row.put("checkOutDate", b.getCheckOutDate() == null ? null : b.getCheckOutDate().toString());
            row.put("nights", b.getNights());
            row.put("guestName", b.getGuestName());
            row.put("sellingAmount", selling);
            row.put("baseAmount", base);
            row.put("commission", commission);
            row.put("netRevenue", net);
            row.put("diff", diff);
            mapped.add(row);
        }
        Page<Map<String, Object>> result = new Page<>(current, size);
        result.setRecords(mapped);
        result.setTotal(page.getTotal());
        return Result.ok(result);
    }

    // ========== 内部 ==========

    private List<Booking> bookingsInMonth(YearMonth ym) {
        return bookingMapper.selectList(
                new LambdaQueryWrapper<Booking>()
                        .between(Booking::getCheckInDate, ym.atDay(1), ym.atEndOfMonth())
                        .in(Booking::getStatus, List.of("CHECKED_IN", "CHECKED_OUT", "CONFIRMED")));
    }

    private static double rateOf(String source) {
        if (source == null) return DEFAULT_RATE;
        Double r = COMMISSION_RATE.get(source.toUpperCase());
        return r == null ? DEFAULT_RATE : r;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}