-- =====================================================
-- FIX DOCUMENTATIONS TABLE - ADD AUTO_INCREMENT TO ID
-- =====================================================
-- Jalankan script ini di phpMyAdmin atau MySQL CLI

-- OPSI 1: Jika ingin tetap pakai tabel yang ada (BACKUP DULU!)
-- ---------------------------------------------------------------

-- 1. Hapus data yang duplikat/corrupt (id = 0)
DELETE FROM documentations WHERE id = 0;

-- 2. Ubah kolom id menjadi AUTO_INCREMENT
ALTER TABLE documentations MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY;


-- =====================================================
-- OPSI 2: Jika ingin buat ulang tabel (DATA AKAN HILANG!)
-- =====================================================

-- DROP TABLE IF EXISTS documentations;

-- CREATE TABLE documentations (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     event_id INT NOT NULL,
--     user_id INT NOT NULL,
--     description TEXT,
--     photo_uri VARCHAR(500),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- =====================================================
-- VERIFIKASI
-- =====================================================
-- Jalankan query ini untuk memastikan sudah benar:
-- DESCRIBE documentations;
-- 
-- Kolom 'id' harus memiliki:
-- - Type: int
-- - Key: PRI
-- - Extra: auto_increment
