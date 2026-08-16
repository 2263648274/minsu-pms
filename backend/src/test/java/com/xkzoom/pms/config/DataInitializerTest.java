package com.xkzoom.pms.config;

import com.xkzoom.pms.entity.User;
import com.xkzoom.pms.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void preservesExistingAdminCredentials() throws Exception {
        User existing = new User();
        existing.setId(1L);
        existing.setUsername("admin");
        existing.setPassword("existing-hash");
        when(userMapper.selectGlobalByUsername("admin")).thenReturn(existing);

        new DataInitializer(userMapper, passwordEncoder).run();

        verify(userMapper, never()).insertBootstrapAdmin(any());
        verify(userMapper, never()).updateById(any());
        verifyNoInteractions(passwordEncoder);
        assertEquals("existing-hash", existing.getPassword());
    }

    @Test
    void createsAdminOnlyWhenMissing() throws Exception {
        when(userMapper.selectGlobalByUsername("admin")).thenReturn(null);
        when(passwordEncoder.encode("admin123")).thenReturn("encoded-password");

        new DataInitializer(userMapper, passwordEncoder).run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userMapper).insertBootstrapAdmin(captor.capture());
        verify(userMapper, never()).updateById(any());

        User created = captor.getValue();
        assertEquals(1L, created.getTenantId());
        assertEquals("admin", created.getUsername());
        assertEquals("encoded-password", created.getPassword());
        assertEquals("ADMIN", created.getRole());
        assertEquals(1, created.getStatus());
        assertNotNull(created.getCreatedAt());
        assertNotNull(created.getUpdatedAt());
    }
}
