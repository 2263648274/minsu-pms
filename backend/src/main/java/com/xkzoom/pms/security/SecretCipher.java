package com.xkzoom.pms.security;

import com.xkzoom.pms.config.SecretsProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/** Encrypts OTA credentials at rest with authenticated AES-GCM encryption. */
@Component
public class SecretCipher {
    private static final String PREFIX = "enc:v1:";
    private static final int IV_BYTES = 12;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(SecretsProperties properties) {
        String configured = properties.getChannelKey();
        if (configured == null || configured.length() < 32) {
            throw new IllegalArgumentException("pms.secrets.channel-key must contain at least 32 characters");
        }
        try {
            this.key = new SecretKeySpec(
                    MessageDigest.getInstance("SHA-256").digest(configured.getBytes(StandardCharsets.UTF_8)),
                    "AES");
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to initialize channel secret encryption", e);
        }
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) return null;
        if (isEncrypted(plaintext)) return plaintext;
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return PREFIX + Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to encrypt channel credential", e);
        }
    }

    public String decrypt(String value) {
        if (value == null || value.isBlank() || !isEncrypted(value)) return value;
        try {
            byte[] payload = Base64.getDecoder().decode(value.substring(PREFIX.length()));
            byte[] iv = Arrays.copyOfRange(payload, 0, IV_BYTES);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(Arrays.copyOfRange(payload, IV_BYTES, payload.length)), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Unable to decrypt channel credential", e);
        }
    }

    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }
}
