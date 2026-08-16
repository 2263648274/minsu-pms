package com.xkzoom.pms.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "pms.secrets")
public class SecretsProperties {
    private String channelKey;
}
