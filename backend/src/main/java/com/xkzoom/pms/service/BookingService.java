package com.xkzoom.pms.service;

import com.xkzoom.pms.entity.Booking;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.BookingMapper;
import com.xkzoom.pms.mapper.InventoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingMapper bookingMapper;
    private final InventoryMapper inventoryMapper;

    public String normalizeIdempotencyKey(String suppliedKey) {
        String key = suppliedKey == null ? "" : suppliedKey.trim();
        if (key.isEmpty()) {
            return "auto:" + UUID.randomUUID();
        }
        if (key.length() < 8 || key.length() > 64 || key.chars().anyMatch(Character::isWhitespace)) {
            throw new BusinessException("Idempotency-Key 长度须为 8-64 且不能包含空白字符");
        }
        return key;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking create(Booking request, String idempotencyKey) {
        validateAndNormalize(request);
        String fingerprint = fingerprint(request);

        Booking existing = bookingMapper.selectByIdempotencyKey(idempotencyKey);
        if (existing != null) {
            verifyFingerprint(existing, fingerprint);
            return existing;
        }

        LocalDateTime now = LocalDateTime.now();
        request.setId(null);
        request.setBookingNo(generateBookingNo());
        request.setIdempotencyKey(idempotencyKey);
        request.setRequestFingerprint(fingerprint);
        request.setStatus("PENDING");
        request.setPaymentStatus("UNPAID");
        request.setPaidAmount(BigDecimal.ZERO);
        request.setInventoryReserved(false);
        request.setCreatedAt(now);
        request.setUpdatedAt(now);
        bookingMapper.insert(request);

        int expectedDays = request.getNights();
        int reservedDays = inventoryMapper.reserveRange(
                request.getRoomTypeId(),
                request.getCheckInDate(),
                request.getCheckOutDate(),
                request.getRooms());
        if (reservedDays != expectedDays) {
            throw new BusinessException("库存不足、房态关闭或存在缺失日期");
        }

        request.setInventoryReserved(true);
        request.setUpdatedAt(LocalDateTime.now());
        bookingMapper.updateById(request);
        return request;
    }

    public Booking resolveIdempotentConflict(Booking request, String idempotencyKey) {
        validateAndNormalize(request);
        Booking existing = bookingMapper.selectByIdempotencyKey(idempotencyKey);
        if (existing == null) {
            throw new BusinessException("幂等请求冲突，请稍后按原 Idempotency-Key 重试");
        }
        verifyFingerprint(existing, fingerprint(request));
        return existing;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking update(Long id, Booking patch) {
        Booking existing = requireLocked(id);
        if ("CANCELLED".equals(existing.getStatus()) || "CHECKED_OUT".equals(existing.getStatus())) {
            throw new BusinessException("已取消或已退房订单不能编辑");
        }

        if (patch.getCustomerId() != null) existing.setCustomerId(patch.getCustomerId());
        if (patch.getGuestName() != null) existing.setGuestName(patch.getGuestName());
        if (patch.getGuestPhone() != null) existing.setGuestPhone(patch.getGuestPhone());
        if (patch.getGuests() != null) existing.setGuests(patch.getGuests());
        if (patch.getTotalAmount() != null) existing.setTotalAmount(patch.getTotalAmount());
        if (patch.getSpecialRequests() != null) existing.setSpecialRequests(patch.getSpecialRequests());
        if (patch.getInternalNotes() != null) existing.setInternalNotes(patch.getInternalNotes());
        existing.setUpdatedAt(LocalDateTime.now());
        bookingMapper.updateById(existing);
        return existing;
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        Booking booking = requireLocked(id);
        if (!"PENDING".equals(booking.getStatus()) && !"CANCELLED".equals(booking.getStatus())) {
            throw new BusinessException("仅待处理或已取消订单可删除");
        }
        releaseInventoryIfNeeded(booking);
        bookingMapper.deleteById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking confirm(Long id) {
        return transition(id, "PENDING", "CONFIRMED");
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking checkIn(Long id) {
        return transition(id, "CONFIRMED", "CHECKED_IN");
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking checkOut(Long id) {
        Booking booking = requireLocked(id);
        if ("CHECKED_OUT".equals(booking.getStatus())) {
            return booking;
        }
        if (!"CHECKED_IN".equals(booking.getStatus())) {
            throw new BusinessException("仅 CHECKED_IN 状态可办理退房");
        }
        booking.setStatus("CHECKED_OUT");
        booking.setCheckedOutAt(LocalDateTime.now());
        booking.setPaymentStatus("PAID");
        booking.setUpdatedAt(LocalDateTime.now());
        bookingMapper.updateById(booking);
        return booking;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking cancel(Long id) {
        Booking booking = requireLocked(id);
        if ("CANCELLED".equals(booking.getStatus())) {
            return booking;
        }
        if ("CHECKED_IN".equals(booking.getStatus()) || "CHECKED_OUT".equals(booking.getStatus())) {
            throw new BusinessException("已入住/已退房的订单不能取消");
        }

        releaseInventoryIfNeeded(booking);
        booking.setStatus("CANCELLED");
        booking.setCancelledAt(LocalDateTime.now());
        if (booking.getPaidAmount() != null && booking.getPaidAmount().signum() > 0) {
            booking.setPaymentStatus("REFUNDED");
        }
        booking.setUpdatedAt(LocalDateTime.now());
        bookingMapper.updateById(booking);
        return booking;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking refund(Long id, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("退款金额必须大于 0");
        }

        Booking booking = requireLocked(id);
        BigDecimal paid = booking.getPaidAmount() == null ? BigDecimal.ZERO : booking.getPaidAmount();
        BigDecimal newPaid = paid.subtract(amount);
        if (newPaid.signum() < 0) {
            throw new BusinessException("退款金额超过已支付金额");
        }

        booking.setPaidAmount(newPaid);
        booking.setPaymentStatus(newPaid.signum() == 0 ? "REFUNDED" : "PARTIAL");
        booking.setUpdatedAt(LocalDateTime.now());
        bookingMapper.updateById(booking);
        return booking;
    }

    private Booking transition(Long id, String expected, String target) {
        Booking booking = requireLocked(id);
        if (target.equals(booking.getStatus())) {
            return booking;
        }
        if (!expected.equals(booking.getStatus())) {
            throw new BusinessException("仅 " + expected + " 状态可变更为 " + target);
        }

        LocalDateTime now = LocalDateTime.now();
        booking.setStatus(target);
        if ("CONFIRMED".equals(target)) booking.setConfirmedAt(now);
        if ("CHECKED_IN".equals(target)) booking.setCheckedInAt(now);
        booking.setUpdatedAt(now);
        bookingMapper.updateById(booking);
        return booking;
    }

    private Booking requireLocked(Long id) {
        Booking booking = bookingMapper.selectByIdForUpdate(id);
        if (booking == null) {
            throw new BusinessException("订单不存在");
        }
        return booking;
    }

    private void releaseInventoryIfNeeded(Booking booking) {
        if (!Boolean.TRUE.equals(booking.getInventoryReserved())) {
            return;
        }

        int releasedDays = inventoryMapper.releaseRange(
                booking.getRoomTypeId(),
                booking.getCheckInDate(),
                booking.getCheckOutDate(),
                booking.getRooms());
        if (releasedDays != booking.getNights()) {
            throw new BusinessException("库存释放不完整，订单状态未变更");
        }
        booking.setInventoryReserved(false);
    }

    private void validateAndNormalize(Booking booking) {
        if (booking.getPropertyId() == null
                || booking.getRoomTypeId() == null
                || booking.getCustomerId() == null) {
            throw new BusinessException("物业、房型和客户必填");
        }
        if (booking.getCheckInDate() == null || booking.getCheckOutDate() == null) {
            throw new BusinessException("入住和离店日期必填");
        }
        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());
        if (nights <= 0 || nights > 365) {
            throw new BusinessException("入住天数须为 1-365 晚");
        }
        int rooms = booking.getRooms() == null ? 1 : booking.getRooms();
        if (rooms <= 0 || rooms > 100) {
            throw new BusinessException("房间数须为 1-100");
        }
        if (booking.getGuests() == null || booking.getGuests() <= 0) {
            booking.setGuests(1);
        }
        if (booking.getTotalAmount() == null || booking.getTotalAmount().signum() < 0) {
            throw new BusinessException("订单总额必填且不能为负数");
        }

        booking.setNights(Math.toIntExact(nights));
        booking.setRooms(rooms);
        if (booking.getCurrency() == null || booking.getCurrency().isBlank()) {
            booking.setCurrency("CNY");
        }
        if (booking.getSource() == null || booking.getSource().isBlank()) {
            booking.setSource("DIRECT");
        }
    }

    private String fingerprint(Booking booking) {
        String canonical = String.join("|",
                Objects.toString(booking.getPropertyId(), ""),
                Objects.toString(booking.getRoomTypeId(), ""),
                Objects.toString(booking.getRatePlanId(), ""),
                Objects.toString(booking.getCustomerId(), ""),
                Objects.toString(booking.getCheckInDate(), ""),
                Objects.toString(booking.getCheckOutDate(), ""),
                Objects.toString(booking.getRooms(), ""),
                Objects.toString(booking.getGuests(), ""),
                normalizedDecimal(booking.getTotalAmount()),
                Objects.toString(booking.getCurrency(), ""),
                Objects.toString(booking.getSource(), ""),
                Objects.toString(booking.getGuestName(), ""),
                Objects.toString(booking.getGuestPhone(), ""));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private String normalizedDecimal(BigDecimal value) {
        return value == null ? "" : value.stripTrailingZeros().toPlainString();
    }

    private void verifyFingerprint(Booking existing, String fingerprint) {
        if (!fingerprint.equals(existing.getRequestFingerprint())) {
            throw new BusinessException("Idempotency-Key 已被不同订单请求使用");
        }
    }

    private String generateBookingNo() {
        String date = LocalDate.now().toString().replace("-", "");
        String random = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        return "BK" + date + random;
    }
}
