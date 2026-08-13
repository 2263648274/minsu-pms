package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Inventory;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.InventoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryMapper mapper;

    /** 查询某房型某段时间的库存/房态 */
    @GetMapping
    public Result<List<Inventory>> query(
            @RequestParam Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return Result.ok(mapper.selectList(
                new LambdaQueryWrapper<Inventory>()
                        .eq(Inventory::getRoomTypeId, roomTypeId)
                        .between(Inventory::getStayDate, from, to)
                        .orderByAsc(Inventory::getStayDate)));
    }

    /** 单日 upsert：日期 + 状态 + 总房/可售/已订/关房 */
    @PutMapping
    public Result<Inventory> upsert(@RequestBody Inventory inv) {
        if (inv.getStayDate() == null) throw new BusinessException("日期必填");
        if (inv.getRoomTypeId() == null) throw new BusinessException("房型必填");

        Inventory existing = mapper.selectOne(
                new LambdaQueryWrapper<Inventory>()
                        .eq(Inventory::getRoomTypeId, inv.getRoomTypeId())
                        .eq(Inventory::getStayDate, inv.getStayDate()));

        LocalDateTime now = LocalDateTime.now();
        if (existing == null) {
            inv.setId(null);
            inv.setCreatedAt(now);
            inv.setUpdatedAt(now);
            if (inv.getStatus() == null) inv.setStatus("OPEN");
            if (inv.getTotalRooms() == null) inv.setTotalRooms(0);
            if (inv.getSoldRooms() == null) inv.setSoldRooms(0);
            if (inv.getBlockedRooms() == null) inv.setBlockedRooms(0);
            mapper.insert(inv);
            return Result.ok(inv);
        }
        existing.setTotalRooms(inv.getTotalRooms() != null ? inv.getTotalRooms() : existing.getTotalRooms());
        existing.setSoldRooms(inv.getSoldRooms() != null ? inv.getSoldRooms() : existing.getSoldRooms());
        existing.setBlockedRooms(inv.getBlockedRooms() != null ? inv.getBlockedRooms() : existing.getBlockedRooms());
        if (inv.getStatus() != null) existing.setStatus(inv.getStatus());
        if (inv.getRemarks() != null) existing.setRemarks(inv.getRemarks());
        existing.setUpdatedAt(now);
        mapper.updateById(existing);
        return Result.ok(existing);
    }

    /** 切换开关房（快速操作） */
    @PatchMapping("/{roomTypeId}/{date}/close")
    public Result<Map<String, Object>> toggleClose(
            @PathVariable Long roomTypeId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Boolean close) {
        Inventory inv = mapper.selectOne(
                new LambdaQueryWrapper<Inventory>()
                        .eq(Inventory::getRoomTypeId, roomTypeId)
                        .eq(Inventory::getStayDate, date));
        LocalDateTime now = LocalDateTime.now();
        if (inv == null) {
            inv = new Inventory();
            inv.setRoomTypeId(roomTypeId);
            inv.setStayDate(date);
            inv.setTotalRooms(0);
            inv.setSoldRooms(0);
            inv.setBlockedRooms(0);
            inv.setStatus(close ? "CLOSED" : "OPEN");
            inv.setCreatedAt(now);
            inv.setUpdatedAt(now);
            mapper.insert(inv);
        } else {
            inv.setStatus(close ? "CLOSED" : "OPEN");
            inv.setUpdatedAt(now);
            mapper.updateById(inv);
        }
        Map<String, Object> r = new HashMap<>();
        r.put("roomTypeId", roomTypeId);
        r.put("date", date.toString());
        r.put("closed", close);
        r.put("status", inv.getStatus());
        return Result.ok(r);
    }
}