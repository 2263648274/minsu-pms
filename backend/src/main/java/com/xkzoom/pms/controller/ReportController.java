package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.entity.Inventory;
import com.xkzoom.pms.entity.Property;
import com.xkzoom.pms.entity.RoomType;
import com.xkzoom.pms.mapper.BookingMapper;
import com.xkzoom.pms.mapper.InventoryMapper;
import com.xkzoom.pms.mapper.PropertyMapper;
import com.xkzoom.pms.mapper.RoomTypeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * 营业报表聚合 —— Phase 2 配套 ReportManage.vue
 *
 * 四个 endpoint：
 *   /api/reports/overview                  → KPI：营收 / 订单数 / 间夜 / ADR / RevPAR / 入住率
 *   /api/reports/trend                     → 每日营收 + 入住率趋势（from / to 范围内）
 *   /api/reports/channel-breakdown         → 渠道贡献（订单数 / 营收 / 占比）
 *   /api/reports/roomtype-breakdown        → 房型贡献
 *
 * 数据源：booking 表 + inventory 表 + property 表 + room_type 表
 *
 * 计算口径：
 *   revenue   = SUM(booking.totalAmount)
 *   orderCount= COUNT(*)
 *   nights    = SUM(booking.nights)
 *   ADR       = revenue / nights
 *   RevPAR    = revenue / (totalRoomNights)  ——  totalRoomNights = property_count * days
 *   occupancyRate = nights / totalRoomNights
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final BookingMapper bookingMapper;
    private final InventoryMapper inventoryMapper;
    private final PropertyMapper propertyMapper;
    private final RoomTypeMapper roomTypeMapper;

    /** KPI 概览 */
    @GetMapping("/overview")
    public Result<Map<String, Object>> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = resolveRange(from, to);
        LocalDate f = range[0], t = range[1];
        List<Booking> bookings = bookingsInRange(f, t);

        BigDecimal revenue = sumAmount(bookings);
        int orderCount = bookings.size();
        int nights = bookings.stream().mapToInt(b -> b.getNights() == null ? 0 : b.getNights()).sum();
        int days = (int) ChronoUnit.DAYS.between(f, t) + 1;

        // 总可售房晚：取每个房型当日 total_rooms 之和，按日聚合
        int totalRoomNights = computeTotalRoomNights(f, t, days);

        BigDecimal adr     = nights == 0 ? BigDecimal.ZERO : revenue.divide(BigDecimal.valueOf(nights), 2, RoundingMode.HALF_UP);
        BigDecimal revpar  = totalRoomNights == 0 ? BigDecimal.ZERO : revenue.divide(BigDecimal.valueOf(totalRoomNights), 2, RoundingMode.HALF_UP);
        double occupancyRate = totalRoomNights == 0 ? 0 : Math.min(1.0, (double) nights / totalRoomNights);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("from", f.toString());
        r.put("to", t.toString());
        r.put("days", days);
        r.put("revenue", revenue);
        r.put("orderCount", orderCount);
        r.put("nights", nights);
        r.put("totalRoomNights", totalRoomNights);
        r.put("adr", adr);
        r.put("revpar", revpar);
        r.put("occupancyRate", round3(occupancyRate));
        return Result.ok(r);
    }

    /** 每日营收 + 入住率趋势 */
    @GetMapping("/trend")
    public Result<List<Map<String, Object>>> trend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = resolveRange(from, to);
        LocalDate f = range[0], t = range[1];
        List<Booking> bookings = bookingsInRange(f, t);

        // 按 check_in_date 聚合每日营收
        Map<LocalDate, BigDecimal> revenueByDay = new TreeMap<>();
        for (LocalDate d = f; !d.isAfter(t); d = d.plusDays(1)) revenueByDay.put(d, BigDecimal.ZERO);
        for (Booking b : bookings) {
            if (b.getCheckInDate() == null) continue;
            LocalDate d = b.getCheckInDate();
            if (d.isBefore(f) || d.isAfter(t)) continue;
            revenueByDay.merge(d, nz(b.getTotalAmount()), BigDecimal::add);
        }

        // 总可售房晚（每房型当日 totalRooms 之和）
        Map<LocalDate, Integer> totalRoomsByDay = new HashMap<>();
        List<Inventory> inv = inventoryMapper.selectList(
                new LambdaQueryWrapper<Inventory>().between(Inventory::getStayDate, f, t));
        for (Inventory i : inv) {
            if (i.getStayDate() == null) continue;
            totalRoomsByDay.merge(i.getStayDate(),
                    i.getTotalRooms() == null ? 0 : i.getTotalRooms(),
                    Integer::sum);
        }

        // 入住房晚 = 入住日那一天的 soldRooms 合计（按 day 估算）
        Map<LocalDate, Integer> soldByDay = new HashMap<>();
        for (Inventory i : inv) {
            if (i.getStayDate() == null) continue;
            soldByDay.merge(i.getStayDate(),
                    i.getSoldRooms() == null ? 0 : i.getSoldRooms(),
                    Integer::sum);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<LocalDate, BigDecimal> e : revenueByDay.entrySet()) {
            int total = totalRoomsByDay.getOrDefault(e.getKey(), 0);
            int sold = soldByDay.getOrDefault(e.getKey(), 0);
            double occ = total == 0 ? 0 : Math.min(1.0, (double) sold / total);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", e.getKey().toString());
            row.put("revenue", e.getValue());
            row.put("occupancy", round3(occ));
            result.add(row);
        }
        return Result.ok(result);
    }

    /** 渠道贡献 */
    @GetMapping("/channel-breakdown")
    public Result<List<Map<String, Object>>> channelBreakdown(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = resolveRange(from, to);
        List<Booking> bookings = bookingsInRange(range[0], range[1]);
        BigDecimal totalRevenue = sumAmount(bookings);
        Map<String, long[]> agg = new LinkedHashMap<>(); // [orderCount(0), revenue 整数分(1)]
        for (Booking b : bookings) {
            String ch = b.getSource() == null ? "DIRECT" : b.getSource();
            long[] v = agg.computeIfAbsent(ch, k -> new long[2]);
            v[0] += 1;
            v[1] += nz(b.getTotalAmount()).multiply(BigDecimal.valueOf(100)).longValue();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, long[]> e : agg.entrySet()) {
            BigDecimal rev = BigDecimal.valueOf(e.getValue()[1]).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            double share = totalRevenue.signum() == 0 ? 0 :
                    rev.divide(totalRevenue, 4, RoundingMode.HALF_UP).doubleValue();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("channelId", e.getKey());
            row.put("orderCount", e.getValue()[0]);
            row.put("revenue", rev);
            row.put("share", round3(share));
            result.add(row);
        }
        result.sort((a, b) -> Long.compare((long) b.get("orderCount"), (long) a.get("orderCount")));
        return Result.ok(result);
    }

    /** 房型贡献 */
    @GetMapping("/roomtype-breakdown")
    public Result<List<Map<String, Object>>> roomtypeBreakdown(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = resolveRange(from, to);
        List<Booking> bookings = bookingsInRange(range[0], range[1]);
        BigDecimal totalRevenue = sumAmount(bookings);

        // 房型 name 缓存（避免 N+1）
        Map<Long, String> nameCache = new HashMap<>();
        Map<Long, long[]> agg = new LinkedHashMap<>();
        for (Booking b : bookings) {
            if (b.getRoomTypeId() == null) continue;
            long[] v = agg.computeIfAbsent(b.getRoomTypeId(), k -> new long[2]);
            v[0] += 1;
            v[1] += nz(b.getTotalAmount()).multiply(BigDecimal.valueOf(100)).longValue();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, long[]> e : agg.entrySet()) {
            BigDecimal rev = BigDecimal.valueOf(e.getValue()[1]).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            double share = totalRevenue.signum() == 0 ? 0 :
                    rev.divide(totalRevenue, 4, RoundingMode.HALF_UP).doubleValue();
            String name = nameCache.computeIfAbsent(e.getKey(), id -> {
                RoomType rt = roomTypeMapper.selectById(id);
                return rt == null ? ("#id=" + id) : rt.getName();
            });
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("roomTypeId", e.getKey());
            row.put("name", name);
            row.put("orderCount", e.getValue()[0]);
            row.put("revenue", rev);
            row.put("share", round3(share));
            result.add(row);
        }
        result.sort((a, b) -> Long.compare((long) b.get("orderCount"), (long) a.get("orderCount")));
        return Result.ok(result);
    }

    // ========== 内部 ==========

    private List<Booking> bookingsInRange(LocalDate f, LocalDate t) {
        return bookingMapper.selectList(
                new LambdaQueryWrapper<Booking>()
                        .between(Booking::getCheckInDate, f, t)
                        .in(Booking::getStatus, List.of("CHECKED_IN", "CHECKED_OUT", "CONFIRMED")));
    }

    private LocalDate[] resolveRange(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now();
        if (from == null && to == null) {
            // 默认近 14 天
            return new LocalDate[]{today.minusDays(13), today};
        }
        if (from == null) from = to.minusDays(13);
        if (to == null) to = from.plusDays(13);
        if (from.isAfter(to)) { LocalDate tmp = from; from = to; to = tmp; }
        return new LocalDate[]{from, to};
    }

    private BigDecimal sumAmount(List<Booking> bookings) {
        BigDecimal s = BigDecimal.ZERO;
        for (Booking b : bookings) s = s.add(nz(b.getTotalAmount()));
        return s;
    }

    private int computeTotalRoomNights(LocalDate f, LocalDate t, int days) {
        // 方案 A：直接 inventory 总和（最准）
        List<Inventory> inv = inventoryMapper.selectList(
                new LambdaQueryWrapper<Inventory>().between(Inventory::getStayDate, f, t));
        int total = 0;
        for (Inventory i : inv) {
            if (i.getStayDate() == null) continue;
            total += (i.getTotalRooms() == null ? 0 : i.getTotalRooms());
        }
        // 方案 B 兜底：没有任何 inventory 数据时，按 property 房间数 × 天数
        if (total == 0) {
            long propertyCount = propertyMapper.selectCount(null);
            return (int) (propertyCount * days);
        }
        return total;
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
    private static double round3(double v) { return Math.round(v * 1000.0) / 1000.0; }
}