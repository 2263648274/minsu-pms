package com.xkzoom.pms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private Long userId;
    private Long tenantId;
    private String tenantName;
    private String username;
    private String realName;
    private String role;
}
