package com.xkzoom.pms.security;

import com.xkzoom.pms.config.SecretsProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecretCipherTest {

    @Test
    void encryptsWithRandomAuthenticatedCiphertextAndDecrypts() {
        SecretCipher cipher = cipher();
        String first = cipher.encrypt("ota-super-secret");
        String second = cipher.encrypt("ota-super-secret");

        assertTrue(first.startsWith("enc:v1:"));
        assertNotEquals(first, second);
        assertEquals("ota-super-secret", cipher.decrypt(first));
        assertEquals("ota-super-secret", cipher.decrypt(second));
    }

    @Test
    void rejectsShortConfigurationKey() {
        SecretsProperties properties = new SecretsProperties();
        properties.setChannelKey("short");
        assertThrows(IllegalArgumentException.class, () -> new SecretCipher(properties));
    }

    private SecretCipher cipher() {
        SecretsProperties properties = new SecretsProperties();
        properties.setChannelKey("unit-test-channel-key-with-at-least-thirty-two-characters");
        return new SecretCipher(properties);
    }
}
