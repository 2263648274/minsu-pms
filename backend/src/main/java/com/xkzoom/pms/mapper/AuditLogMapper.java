package com.xkzoom.pms.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xkzoom.pms.entity.AuditLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AuditLogMapper extends BaseMapper<AuditLog> {
}
