package com.xkzoom.pms.service;

import com.xkzoom.pms.entity.Inventory;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.InventoryMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryMapper inventoryMapper;

    @Test
    void preservesSystemManagedSoldRooms() {
        LocalDate date = LocalDate.of(2026, 9, 1);
        Inventory existing = inventory(1L, date, 5, 2, 0);
        when(inventoryMapper.selectByDateForUpdate(1L, date)).thenReturn(existing);

        Inventory requested = inventory(1L, date, 6, 0, 1);
        Inventory result = new InventoryService(inventoryMapper).upsert(requested);

        assertEquals(2, result.getSoldRooms());
        assertEquals(6, result.getTotalRooms());
        assertEquals(1, result.getBlockedRooms());
        verify(inventoryMapper).updateById(existing);
    }

    @Test
    void rejectsCapacityBelowExistingReservations() {
        LocalDate date = LocalDate.of(2026, 9, 1);
        Inventory existing = inventory(1L, date, 5, 3, 0);
        when(inventoryMapper.selectByDateForUpdate(1L, date)).thenReturn(existing);

        Inventory requested = inventory(1L, date, 2, 0, 0);

        assertThrows(
                BusinessException.class,
                () -> new InventoryService(inventoryMapper).upsert(requested));
        verify(inventoryMapper, never()).updateById(any());
    }

    private Inventory inventory(
            Long roomTypeId,
            LocalDate date,
            int total,
            int sold,
            int blocked) {
        Inventory inventory = new Inventory();
        inventory.setRoomTypeId(roomTypeId);
        inventory.setStayDate(date);
        inventory.setTotalRooms(total);
        inventory.setSoldRooms(sold);
        inventory.setBlockedRooms(blocked);
        inventory.setStatus("OPEN");
        return inventory;
    }
}
