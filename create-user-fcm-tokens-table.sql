-- Migration: Create user_fcm_tokens table for PUSH notifications
-- Purpose: Store FCM tokens untuk kirim push notification via Firebase Cloud Messaging
-- Created: 2025-12-17

CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    fcm_token VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NULL COMMENT 'Android device ID untuk tracking',
    device_type ENUM('android', 'ios') DEFAULT 'android',
    app_version VARCHAR(50) NULL,
    is_active BOOLEAN DEFAULT TRUE COMMENT 'FALSE jika token invalid/expired',
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key ke users table
    CONSTRAINT fk_fcm_token_user 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- User bisa punya multiple devices (HP, Tablet, etc.)
    -- Tapi combination user_id + fcm_token harus unique
    UNIQUE KEY unique_user_token (user_id, fcm_token),
    
    -- Indexes untuk performance
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_fcm_token (fcm_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contoh query untuk testing:
-- SELECT * FROM user_fcm_tokens WHERE user_id = 1 AND is_active = TRUE;
-- SELECT COUNT(*) as device_count FROM user_fcm_tokens WHERE user_id = 1 AND is_active = TRUE;

-- Query untuk cleanup expired tokens:
-- UPDATE user_fcm_tokens SET is_active = FALSE WHERE last_used_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
