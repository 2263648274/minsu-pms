package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Inventory;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.InventoryMapper;
import com.xkzoom.pms.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryMapper mapper;
    private final InventoryService inventoryService;

    @GetMapping
    public Result<List<Inventory>> query(
            @RequestParam Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from.isAfter(to)) {
            throw new BusinessException("开始日期不能晚于结束日期");
        }
        return Result.ok(mapper.selectList(
                new LambdaQueryWrapper<Inventory>()
                        .eq(Inventory::getRoomTypeId, roomTypeId)
                        .between(Inventory::getStayDate, from, to)
                        .orderByAsc(Inventory::getStayDate)));
    }

    @PutMapping
    public Result<Inventory> upsert(@RequestBody Inventory inventory) {
        return Result.ok(inventoryService.upsert(inventory));
    }

    @PatchMapping("/{roomTypeId}/{date}/close")
    public Result<Map<String, Object>> toggleClose(
            @PathVariable Long roomTypeId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Boolean close) {
        Inventory inventory = inventoryService.setClosed(roomTypeId, date, close);
        Map<String, Object> result = new HashMap<>();
        result.put("roomTypeId", roomTypeId);
        result.put("date", date.toString());
        result.put("closed", close);
        result.put("status", inventory.getStatus());
        return Result.ok(result);
    }
}
