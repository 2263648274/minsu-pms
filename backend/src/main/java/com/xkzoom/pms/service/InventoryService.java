package com.xkzoom.pms.service;

import com.xkzoom.pms.entity.Inventory;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.InventoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryMapper inventoryMapper;

    @Transactional(rollbackFor = Exception.class)
    public Inventory upsert(Inventory requested) {
        if (requested.getStayDate() == null) {
            throw new BusinessException("日期必填");
        }
        if (requested.getRoomTypeId() == null) {
            throw new BusinessException("房型必填");
        }

        Inventory existing = inventoryMapper.selectByDateForUpdate(
                requested.getRoomTypeId(), requested.getStayDate());
        LocalDateTime now = LocalDateTime.now();
        if (existing == null) {
            int total = valueOrZero(requested.getTotalRooms());
            int blocked = valueOrZero(requested.getBlockedRooms());
            validateCapacity(total, 0, blocked);

            requested.setId(null);
            requested.setTotalRooms(total);
            requested.setSoldRooms(0);
            requested.setBlockedRooms(blocked);
            requested.setStatus(requested.getStatus() == null ? "OPEN" : requested.getStatus());
            requested.setCreatedAt(now);
            requested.setUpdatedAt(now);
            inventoryMapper.insert(requested);
            return requested;
        }

        int total = requested.getTotalRooms() == null
                ? existing.getTotalRooms()
                : requested.getTotalRooms();
        int blocked = requested.getBlockedRooms() == null
                ? existing.getBlockedRooms()
                : requested.getBlockedRooms();
        int sold = valueOrZero(existing.getSoldRooms());
        validateCapacity(total, sold, blocked);

        existing.setTotalRooms(total);
        existing.setBlockedRooms(blocked);
        if (requested.getStatus() != null) existing.setStatus(requested.getStatus());
        if (requested.getRemarks() != null) existing.setRemarks(requested.getRemarks());
        existing.setUpdatedAt(now);
        inventoryMapper.updateById(existing);
        return existing;
    }

    @Transactional(rollbackFor = Exception.class)
    public Inventory setClosed(Long roomTypeId, LocalDate date, boolean closed) {
        Inventory inventory = inventoryMapper.selectByDateForUpdate(roomTypeId, date);
        LocalDateTime now = LocalDateTime.now();
        if (inventory == null) {
            inventory = new Inventory();
            inventory.setRoomTypeId(roomTypeId);
            inventory.setStayDate(date);
            inventory.setTotalRooms(0);
            inventory.setSoldRooms(0);
            inventory.setBlockedRooms(0);
            inventory.setStatus(closed ? "CLOSED" : "OPEN");
            inventory.setCreatedAt(now);
            inventory.setUpdatedAt(now);
            inventoryMapper.insert(inventory);
            return inventory;
        }

        inventory.setStatus(closed ? "CLOSED" : "OPEN");
        inventory.setUpdatedAt(now);
        inventoryMapper.updateById(inventory);
        return inventory;
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private void validateCapacity(int total, int sold, int blocked) {
        if (total < 0 || blocked < 0 || sold < 0) {
            throw new BusinessException("库存数量不能为负数");
        }
        if (sold + blocked > total) {
            throw new BusinessException("总房量不能小于已订房量与关房量之和");
        }
    }
}
