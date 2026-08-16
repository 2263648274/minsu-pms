package com.xkzoom.pms.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xkzoom.pms.entity.User;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

public interface UserMapper extends BaseMapper<User> {

    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT id, tenant_id, username, password, real_name, email, phone, role, status, "
            + "last_login_at, created_at, updated_at, deleted "
            + "FROM user WHERE username = #{username} AND deleted = 0 LIMIT 1")
    User selectGlobalByUsername(@Param("username") String username);

    @InterceptorIgnore(tenantLine = "true")
    @Update("UPDATE user SET last_login_at = #{lastLoginAt}, updated_at = #{lastLoginAt} "
            + "WHERE id = #{userId} AND tenant_id = #{tenantId} AND deleted = 0")
    int updateLastLogin(
            @Param("userId") Long userId,
            @Param("tenantId") Long tenantId,
            @Param("lastLoginAt") LocalDateTime lastLoginAt);

    @InterceptorIgnore(tenantLine = "true")
    @Insert("INSERT INTO user "
            + "(tenant_id, username, password, real_name, email, role, status, "
            + "created_at, updated_at, deleted) "
            + "VALUES (#{tenantId}, #{username}, #{password}, #{realName}, #{email}, #{role}, "
            + "#{status}, #{createdAt}, #{updatedAt}, 0)")
    int insertBootstrapAdmin(User user);
}
