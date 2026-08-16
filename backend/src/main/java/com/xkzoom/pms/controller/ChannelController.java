package com.xkzoom.pms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xkzoom.pms.common.Result;
import com.xkzoom.pms.entity.Channel;
import com.xkzoom.pms.exception.BusinessException;
import com.xkzoom.pms.mapper.ChannelMapper;
import com.xkzoom.pms.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelMapper mapper;
    private final SecretCipher secretCipher;

    @GetMapping
    public Result<List<Channel>> list() {
        List<Channel> channels = mapper.selectList(
                new LambdaQueryWrapper<Channel>().orderByAsc(Channel::getCode));
        channels.forEach(this::maskSecret);
        return Result.ok(channels);
    }

    @GetMapping("/{id}")
    public Result<Channel> get(@PathVariable Long id) {
        Channel c = mapper.selectById(id);
        if (c == null) throw new BusinessException("渠道不存在");
        return Result.ok(maskSecret(c));
    }

    @PostMapping
    public Result<Channel> create(@RequestBody Channel c) {
        c.setId(null);
        c.setAppSecret(secretCipher.encrypt(c.getAppSecret()));
        c.setLastStatus("UNKNOWN");
        c.setCreatedAt(LocalDateTime.now());
        c.setUpdatedAt(LocalDateTime.now());
        mapper.insert(c);
        return Result.ok(maskSecret(c));
    }

    @PutMapping("/{id}")
    public Result<Channel> update(@PathVariable Long id, @RequestBody Channel c) {
        Channel existing = mapper.selectById(id);
        if (existing == null) throw new BusinessException("渠道不存在");
        c.setId(id);
        if (c.getAppSecret() == null || c.getAppSecret().isBlank() || "********".equals(c.getAppSecret())) {
            c.setAppSecret(existing.getAppSecret());
        } else {
            c.setAppSecret(secretCipher.encrypt(c.getAppSecret()));
        }
        c.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(c);
        return Result.ok(maskSecret(mapper.selectById(id)));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        mapper.deleteById(id);
        return Result.ok();
    }

    /** Ping（健康度）—— Phase 2 用 mock 实现：随机返回 OK 或 ERROR */
    @PostMapping("/{id}/ping")
    public Result<Map<String, Object>> ping(@PathVariable Long id) {
        Channel c = mapper.selectById(id);
        if (c == null) throw new BusinessException("渠道不存在");

        boolean ok = c.getEnabled() != null && c.getEnabled() == 1 && Math.random() > 0.2;
        String status = ok ? "OK" : "ERROR";
        String errorMsg = ok ? null : "模拟连接超时（mock）";
        long durationMs = (long) (Math.random() * 500) + 50;

        c.setLastStatus(status);
        c.setLastError(errorMsg);
        c.setLastSyncAt(LocalDateTime.now());
        mapper.updateById(c);

        log.info("[OTA Ping] channel={} status={} duration={}ms", c.getCode(), status, durationMs);

        Map<String, Object> result = new HashMap<>();
        result.put("channelId", id);
        result.put("code", c.getCode());
        result.put("name", c.getName());
        result.put("status", status);
        result.put("durationMs", durationMs);
        result.put("checkedAt", c.getLastSyncAt());
        if (errorMsg != null) result.put("error", errorMsg);
        return Result.ok(result);
    }

    private Channel maskSecret(Channel channel) {
        if (channel != null && channel.getAppSecret() != null && !channel.getAppSecret().isBlank()) {
            channel.setAppSecret("********");
        }
        return channel;
    }
}
