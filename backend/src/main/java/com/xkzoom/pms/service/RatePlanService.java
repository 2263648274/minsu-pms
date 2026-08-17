package com.xkzoom.pms.service;

import com.xkzoom.pms.entity.RatePlan;
import com.xkzoom.pms.entity.RoomType;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.RatePlanMapper;
import com.xkzoom.pms.mapper.RoomTypeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 房价计划写入的关联校验（issue #5）。
 * 当前后端模型为“一条 rate plan 绑定一个 room type”，写入前验证：
 * - room type 归当前租户（跨租户行被租户拦截器过滤为 null）
 * - rate_plan.property_id 与 room_type.property_id 一致
 * 统一失败文案不泄露资源存在性。
 */
@Service
@RequiredArgsConstructor
public class RatePlanService {

    private final RatePlanMapper ratePlanMapper;
    private final RoomTypeMapper roomTypeMapper;

    @Transactional(rollbackFor = Exception.class)
    public RatePlan create(RatePlan req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new BusinessException("计划名称不能为空");
        }
        requireRoomTypeAccessible(req.getRoomTypeId(), req.getPropertyId());

        LocalDateTime now = LocalDateTime.now();
        if (req.getCurrency() == null || req.getCurrency().isBlank()) req.setCurrency("CNY");
        if (req.getActive() == null) req.setActive(1);
        if (req.getCode() == null || req.getCode().isBlank()) {
            req.setCode("PLAN_" + System.currentTimeMillis());
        }
        req.setId(null);
        req.setCreatedAt(now);
        req.setUpdatedAt(now);
        ratePlanMapper.insert(req);
        return req;
    }

    @Transactional(rollbackFor = Exception.class)
    public RatePlan update(Long id, RatePlan patch) {
        RatePlan existing = ratePlanMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException("房价计划不存在或无权访问");
        }
        Long targetRoomTypeId = patch.getRoomTypeId() != null ? patch.getRoomTypeId() : existing.getRoomTypeId();
        if (patch.getRoomTypeId() != null) {
            requireRoomTypeAccessible(targetRoomTypeId, existing.getPropertyId());
        }
        if (patch.getName() != null) {
            if (patch.getName().isBlank()) throw new BusinessException("计划名称不能为空");
            existing.setName(patch.getName());
        }
        if (patch.getRoomTypeId() != null) existing.setRoomTypeId(patch.getRoomTypeId());
        if (patch.getBasePrice() != null) existing.setBasePrice(patch.getBasePrice());
        if (patch.getCurrency() != null) existing.setCurrency(patch.getCurrency());
        if (patch.getMealPlan() != null) existing.setMealPlan(patch.getMealPlan());
        if (patch.getMinNights() != null) existing.setMinNights(patch.getMinNights());
        if (patch.getMaxNights() != null) existing.setMaxNights(patch.getMaxNights());
        if (patch.getDescription() != null) existing.setDescription(patch.getDescription());
        if (patch.getActive() != null) existing.setActive(patch.getActive());
        existing.setUpdatedAt(LocalDateTime.now());
        ratePlanMapper.updateById(existing);
        return existing;
    }

    /**
     * 校验房型归当前租户且属于给定物业。两种失败共用同一文案，
     * 不泄露房型是否存在。
     */
    private void requireRoomTypeAccessible(Long roomTypeId, Long propertyId) {
        RoomType roomType = roomTypeMapper.selectById(roomTypeId);
        if (roomType == null) {
            throw new BusinessException("房型不存在或无权访问");
        }
        if (propertyId != null && !roomType.getPropertyId().equals(propertyId)) {
            throw new BusinessException("物业与房型不匹配");
        }
    }
}
