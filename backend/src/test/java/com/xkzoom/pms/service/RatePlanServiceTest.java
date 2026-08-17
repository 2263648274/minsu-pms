package com.xkzoom.pms.service;

import com.xkzoom.pms.entity.RatePlan;
import com.xkzoom.pms.entity.RoomType;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.RatePlanMapper;
import com.xkzoom.pms.mapper.RoomTypeMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 房价计划写入的关联校验场景（issue #5）：
 * 后端模型为“一条 rate plan 绑定一个 room type”，写入前必须验证
 * room type 归当前租户、plan.propertyId 与 room_type.property_id 一致。
 * 租户边界通过 mapper 返回 null 模拟（租户拦截器过滤跨租户行）。
 */
@ExtendWith(MockitoExtension.class)
class RatePlanServiceTest {

    private static final Long PLAN_ID = 10L;
    private static final Long ROOM_TYPE_ID = 5L;
    private static final Long PROPERTY_ID = 3L;

    @Mock
    private RatePlanMapper ratePlanMapper;

    @Mock
    private RoomTypeMapper roomTypeMapper;

    private RatePlanService service() {
        return new RatePlanService(ratePlanMapper, roomTypeMapper);
    }

    // ========== 创建 ==========

    @Test
    @DisplayName("创建：房型不存在或跨租户被拒绝，统一文案不泄露存在性")
    void createRejectsMissingRoomType() {
        when(roomTypeMapper.selectById(999L)).thenReturn(null);

        RatePlan req = plan();
        req.setRoomTypeId(999L);

        BusinessException e = assertThrows(BusinessException.class, () -> service().create(req));
        assertEquals("房型不存在或无权访问", e.getMessage());
        verify(ratePlanMapper, never()).insert(any(RatePlan.class));
    }

    @Test
    @DisplayName("创建：物业与房型不匹配被拒绝（room_type 属于其他物业）")
    void createRejectsPropertyRoomTypeMismatch() {
        when(roomTypeMapper.selectById(ROOM_TYPE_ID)).thenReturn(roomType(77L));

        BusinessException e = assertThrows(BusinessException.class, () -> service().create(plan()));
        assertEquals("物业与房型不匹配", e.getMessage());
        verify(ratePlanMapper, never()).insert(any(RatePlan.class));
    }

    @Test
    @DisplayName("创建：名称为空被拒绝")
    void createRejectsBlankName() {
        RatePlan req = plan();
        req.setName("  ");

        BusinessException e = assertThrows(BusinessException.class, () -> service().create(req));
        assertEquals("计划名称不能为空", e.getMessage());
        verify(ratePlanMapper, never()).insert(any(RatePlan.class));
    }

    @Test
    @DisplayName("创建：合法请求写入归一化后的计划（货币/启用状态/时间戳/自动代号）")
    void createInsertsNormalizedPlan() {
        when(roomTypeMapper.selectById(ROOM_TYPE_ID)).thenReturn(roomType(PROPERTY_ID));

        RatePlan req = plan();
        req.setCurrency(null);
        req.setActive(null);
        req.setCode("   ");
        service().create(req);

        ArgumentCaptor<RatePlan> captor = ArgumentCaptor.forClass(RatePlan.class);
        verify(ratePlanMapper).insert(captor.capture());
        RatePlan inserted = captor.getValue();
        assertEquals("CNY", inserted.getCurrency());
        assertEquals(1, inserted.getActive());
        assertEquals("标准价", inserted.getName());
        assertEquals(ROOM_TYPE_ID, inserted.getRoomTypeId());
        assertEquals(PROPERTY_ID, inserted.getPropertyId());
        assertEquals(new BigDecimal("480.00"), inserted.getBasePrice());
        org.junit.jupiter.api.Assertions.assertNotNull(inserted.getCreatedAt());
        org.junit.jupiter.api.Assertions.assertFalse(inserted.getCode().isBlank(), "code 为空时应自动生成");
    }

    // ========== 更新 ==========

    @Test
    @DisplayName("更新：计划不存在或跨租户被拒绝，统一文案不泄露存在性")
    void updateRejectsMissingPlan() {
        when(ratePlanMapper.selectById(999L)).thenReturn(null);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service().update(999L, plan()));
        assertEquals("房价计划不存在或无权访问", e.getMessage());
        verify(ratePlanMapper, never()).updateById(any(RatePlan.class));
    }

    @Test
    @DisplayName("更新：切换到的房型不存在或跨租户被拒绝")
    void updateRejectsRoomTypeNotFound() {
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(existingPlan());
        when(roomTypeMapper.selectById(999L)).thenReturn(null);

        RatePlan patch = plan();
        patch.setRoomTypeId(999L);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service().update(PLAN_ID, patch));
        assertEquals("房型不存在或无权访问", e.getMessage());
        verify(ratePlanMapper, never()).updateById(any(RatePlan.class));
    }

    @Test
    @DisplayName("更新：切换房型后物业不一致被拒绝")
    void updateRejectsRoomTypeChangeToForeignProperty() {
        RatePlan existing = existingPlan();
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(existing);
        // 房型属于另一物业：计划 propertyId=3，新房型 propertyId=99
        when(roomTypeMapper.selectById(8L)).thenReturn(roomType(99L));

        RatePlan patch = plan();
        patch.setRoomTypeId(8L);

        BusinessException e = assertThrows(BusinessException.class,
                () -> service().update(PLAN_ID, patch));
        assertEquals("物业与房型不匹配", e.getMessage());
        verify(ratePlanMapper, never()).updateById(any(RatePlan.class));
    }

    @Test
    @DisplayName("更新：合法补丁只改给定字段并返回最新计划")
    void updateAppliesPatchAndReloads() {
        RatePlan existing = existingPlan();
        when(ratePlanMapper.selectById(PLAN_ID)).thenReturn(existing);

        RatePlan patch = new RatePlan();
        patch.setName("周末价");
        patch.setBasePrice(new BigDecimal("580.00"));
        RatePlan updated = service().update(PLAN_ID, patch);

        verify(ratePlanMapper).updateById(existing);
        assertEquals("周末价", existing.getName());
        assertEquals(new BigDecimal("580.00"), existing.getBasePrice());
        // 未提供的字段保持原值
        assertEquals(ROOM_TYPE_ID, existing.getRoomTypeId());
        assertEquals(PROPERTY_ID, existing.getPropertyId());
        assertEquals(updated, existing);
    }

    // ========== 构造工具 ==========

    private RatePlan plan() {
        RatePlan rp = new RatePlan();
        rp.setId(PLAN_ID);
        rp.setPropertyId(PROPERTY_ID);
        rp.setRoomTypeId(ROOM_TYPE_ID);
        rp.setName("标准价");
        rp.setCode("PLAN_TEST");
        rp.setBasePrice(new BigDecimal("480.00"));
        rp.setCurrency("CNY");
        rp.setActive(1);
        return rp;
    }

    private RatePlan existingPlan() {
        return plan();
    }

    private RoomType roomType(Long propertyId) {
        RoomType rt = new RoomType();
        rt.setId(ROOM_TYPE_ID);
        rt.setPropertyId(propertyId);
        rt.setBasePrice(new BigDecimal("480.00"));
        return rt;
    }
}
