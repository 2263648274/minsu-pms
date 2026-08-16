package com.xkzoom.pms.service;

import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.BookingMapper;
import com.xkzoom.pms.mapper.InventoryMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingMapper bookingMapper;

    @Mock
    private InventoryMapper inventoryMapper;

    @Test
    void createsBookingAndReservesEveryStayDate() {
        Booking request = request();
        when(bookingMapper.selectByIdempotencyKey("request-123")).thenReturn(null);
        when(inventoryMapper.reserveRange(2L, request.getCheckInDate(), request.getCheckOutDate(), 1))
                .thenReturn(2);

        Booking created = service().create(request, "request-123");

        assertEquals(2, created.getNights());
        assertTrue(created.getInventoryReserved());
        assertEquals("PENDING", created.getStatus());
        verify(bookingMapper).insert(created);
        verify(inventoryMapper).reserveRange(
                2L, request.getCheckInDate(), request.getCheckOutDate(), 1);
        verify(bookingMapper).updateById(created);
    }

    @Test
    void rejectsPartialReservationSoTransactionCanRollback() {
        Booking request = request();
        when(bookingMapper.selectByIdempotencyKey("request-456")).thenReturn(null);
        when(inventoryMapper.reserveRange(2L, request.getCheckInDate(), request.getCheckOutDate(), 1))
                .thenReturn(1);

        assertThrows(BusinessException.class, () -> service().create(request, "request-456"));

        verify(bookingMapper).insert(request);
        verify(bookingMapper, never()).updateById(any());
    }

    @Test
    void sameIdempotencyKeyReturnsOriginalBooking() {
        Booking originalRequest = request();
        when(bookingMapper.selectByIdempotencyKey("request-789")).thenReturn(null);
        when(inventoryMapper.reserveRange(
                2L, originalRequest.getCheckInDate(), originalRequest.getCheckOutDate(), 1))
                .thenReturn(2);
        Booking original = service().create(originalRequest, "request-789");

        Booking retry = request();
        when(bookingMapper.selectByIdempotencyKey("request-789")).thenReturn(original);

        Booking result = service().create(retry, "request-789");

        assertSame(original, result);
        verify(inventoryMapper, times(1)).reserveRange(
                2L, original.getCheckInDate(), original.getCheckOutDate(), 1);
    }

    @Test
    void reusedIdempotencyKeyRejectsDifferentPayload() {
        Booking originalRequest = request();
        when(bookingMapper.selectByIdempotencyKey("request-999")).thenReturn(null);
        when(inventoryMapper.reserveRange(
                2L, originalRequest.getCheckInDate(), originalRequest.getCheckOutDate(), 1))
                .thenReturn(2);
        Booking original = service().create(originalRequest, "request-999");

        Booking changed = request();
        changed.setTotalAmount(new BigDecimal("999.00"));
        when(bookingMapper.selectByIdempotencyKey("request-999")).thenReturn(original);

        assertThrows(BusinessException.class, () -> service().create(changed, "request-999"));
    }

    @Test
    void repeatedCancelReleasesInventoryOnlyOnce() {
        Booking booking = request();
        booking.setId(88L);
        booking.setNights(2);
        booking.setStatus("PENDING");
        booking.setInventoryReserved(true);
        when(bookingMapper.selectByIdForUpdate(88L)).thenReturn(booking);
        when(inventoryMapper.releaseRange(
                2L, booking.getCheckInDate(), booking.getCheckOutDate(), 1)).thenReturn(2);

        BookingService service = service();
        service.cancel(88L);
        service.cancel(88L);

        assertEquals("CANCELLED", booking.getStatus());
        assertEquals(false, booking.getInventoryReserved());
        verify(inventoryMapper, times(1)).releaseRange(
                2L, booking.getCheckInDate(), booking.getCheckOutDate(), 1);
    }

    private BookingService service() {
        return new BookingService(bookingMapper, inventoryMapper);
    }

    private Booking request() {
        Booking booking = new Booking();
        booking.setPropertyId(1L);
        booking.setRoomTypeId(2L);
        booking.setCustomerId(3L);
        booking.setCheckInDate(LocalDate.of(2026, 9, 1));
        booking.setCheckOutDate(LocalDate.of(2026, 9, 3));
        booking.setRooms(1);
        booking.setGuests(2);
        booking.setTotalAmount(new BigDecimal("400.00"));
        booking.setCurrency("CNY");
        booking.setSource("DIRECT");
        booking.setGuestName("测试客人");
        return booking;
    }
}
