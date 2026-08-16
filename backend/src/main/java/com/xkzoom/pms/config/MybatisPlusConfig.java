package com.xkzoom.pms.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.TenantLineInnerInterceptor;
import com.xkzoom.pms.tenant.TenantContext;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Locale;
import java.util.Set;

/**
 * MyBatis-Plus plugins.
 *
 * Tenant isolation must run before pagination so every generated CRUD statement
 * is constrained by tenant_id before LIMIT/OFFSET is calculated.
 */
@Configuration
public class MybatisPlusConfig {

    private static final Set<String> GLOBAL_TABLES = Set.of(
            "tenant",
            "flyway_schema_history"
    );

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(tenantLineHandler()));
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }

    TenantLineHandler tenantLineHandler() {
        return new TenantLineHandler() {
            @Override
            public Expression getTenantId() {
                return new LongValue(TenantContext.requireTenantId());
            }

            @Override
            public String getTenantIdColumn() {
                return "tenant_id";
            }

            @Override
            public boolean ignoreTable(String tableName) {
                return tableName != null
                        && GLOBAL_TABLES.contains(
                                tableName.replace(String.valueOf((char) 96), "").toLowerCase(Locale.ROOT));
            }
        };
    }
}
