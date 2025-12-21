-- Migration: Create/Update notifications table for IN-APP notifications
-- Purpose: Store notifications yang akan ditampilkan di tab Notifikasi dalam app
-- Updated: 2025-12-17 - Added support for integrated notification system

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    related_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Data tambahan untuk in-app notification
    notification_data JSON NULL COMMENT 'Extra metadata (event_title, participant_name, etc.)',
    action_type VARCHAR(50) NULL COMMENT 'Action type: view_event, open_participants, etc.',
    
    -- Foreign key ke users table
    CONSTRAINT fk_notification_user 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Indexes untuk performance queries
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contoh query untuk testing:
-- SELECT * FROM notifications WHERE user_id = 1 ORDER BY created_at DESC;
-- SELECT * FROM notifications WHERE type = 'registration' AND is_read = FALSE;
