package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.entity.Customer;
import com.xkzoom.pms.entity.Inventory;
import com.xkzoom.pms.entity.Property;
import com.xkzoom.pms.mapper.BookingMapper;
import com.xkzoom.pms.mapper.CustomerMapper;
import com.xkzoom.pms.mapper.InventoryMapper;
import com.xkzoom.pms.mapper.PropertyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Dashboard 聚合接口
 *  - 今日入住数 / 今日订单数 / 今日营收 / 出租率
 *  - 在住客人列表 / 待确认订单数
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final BookingMapper bookingMapper;
    private final InventoryMapper inventoryMapper;
    private final CustomerMapper customerMapper;
    private final PropertyMapper propertyMapper;

    @GetMapping("/overview")
    public Result<Map<String, Object>> overview() {
        LocalDate today = LocalDate.now();
        Map<String, Object> data = new HashMap<>();

        // ---- 今日入住数（CHECKED_IN 且 check_in_date = today）
        long todayCheckIn = bookingMapper.selectCount(
                new LambdaQueryWrapper<Booking>()
                        .eq(Booking::getStatus, "CHECKED_IN")
                        .eq(Booking::getCheckInDate, today));

        // ---- 今日退房数
        long todayCheckOut = bookingMapper.selectCount(
                new LambdaQueryWrapper<Booking>()
                        .eq(Booking::getStatus, "CHECKED_OUT")
                        .eq(Booking::getCheckOutDate, today));

        // ---- 今日订单数（PENDING/CONFIRMED/CHECKED_IN 且 check_in_date = today）
        long todayArrivals = bookingMapper.selectCount(
                new LambdaQueryWrapper<Booking>()
                        .in(Booking::getStatus, List.of("PENDING", "CONFIRMED", "CHECKED_IN"))
                        .eq(Booking::getCheckInDate, today));

        // ---- 今日营收（CHECKED_OUT 或 CHECKED_IN 且 check_in_date = today 的总金额）
        List<Booking> revenueBookings = bookingMapper.selectList(
                new LambdaQueryWrapper<Booking>()
                        .in(Booking::getStatus, List.of("CHECKED_IN", "CHECKED_OUT"))
                        .eq(Booking::getCheckInDate, today));
        BigDecimal todayRevenue = revenueBookings.stream()
                .map(Booking::getTotalAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ---- 待确认订单数
        long pendingCount = bookingMapper.selectCount(
                new LambdaQueryWrapper<Booking>().eq(Booking::getStatus, "PENDING"));

        // ---- 今日总房/可售数（出租率）
        List<Inventory> todayInventory = inventoryMapper.selectList(
                new LambdaQueryWrapper<Inventory>().eq(Inventory::getStayDate, today));
        int totalRooms = todayInventory.stream().mapToInt(Inventory::getTotalRooms).sum();
        int blockedRooms = todayInventory.stream().mapToInt(Inventory::getBlockedRooms).sum();
        int soldRooms = todayInventory.stream().mapToInt(Inventory::getSoldRooms).sum();
        double occupancyRate = totalRooms == 0 ? 0.0 :
                (double) soldRooms / Math.max(totalRooms - blockedRooms, 1) * 100;

        // ---- 全局计数
        long totalProperties = propertyMapper.selectCount(null);
        long totalCustomers = customerMapper.selectCount(null);

        data.put("todayCheckIn", todayCheckIn);
        data.put("todayCheckOut", todayCheckOut);
        data.put("todayArrivals", todayArrivals);
        data.put("todayRevenue", todayRevenue);
        data.put("pendingCount", pendingCount);
        data.put("totalProperties", totalProperties);
        data.put("totalCustomers", totalCustomers);
        data.put("occupancyRate", Math.round(occupancyRate * 10) / 10.0);
        data.put("totalRooms", totalRooms);
        data.put("soldRooms", soldRooms);
        data.put("blockedRooms", blockedRooms);
        data.put("date", today.toString());

        return Result.ok(data);
    }

    @GetMapping("/recent-bookings")
    public Result<List<Booking>> recentBookings() {
        return Result.ok(bookingMapper.selectList(
                new LambdaQueryWrapper<Booking>()
                        .orderByDesc(Booking::getCreatedAt)
                        .last("LIMIT 10")));
    }
}