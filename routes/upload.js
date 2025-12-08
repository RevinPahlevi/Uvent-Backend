const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Pastikan folder uploads ada saat module di-load
const uploadDir = path.join(__dirname, '../uploads');
console.log('Upload directory:', uploadDir);

if (!fs.existsSync(uploadDir)) {
    console.log('Creating uploads directory...');
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Uploads directory created successfully');
    } catch (err) {
        console.error('Failed to create uploads directory:', err);
    }
} else {
    console.log('Uploads directory already exists');
}

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('Multer destination - saving to:', uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Buat nama file unik dengan timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        const filename = `event-${uniqueSuffix}${ext}`;
        console.log('Multer filename - generated:', filename);
        cb(null, filename);
    }
});

// Filter untuk hanya menerima gambar - diperbaiki untuk menerima image/* dari Android
const fileFilter = (req, file, cb) => {
    console.log('File filter - checking file:', file.originalname, 'mimetype:', file.mimetype);

    // Terima semua tipe image (termasuk image/*)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/*'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    // Cek mimetype
    const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/');

    // Cek ekstensi file sebagai fallback
    const ext = path.extname(file.originalname).toLowerCase();
    const isExtensionAllowed = allowedExtensions.includes(ext);

    console.log('  - Mimetype allowed:', isMimeTypeAllowed);
    console.log('  - Extension:', ext, 'allowed:', isExtensionAllowed);

    if (isMimeTypeAllowed || isExtensionAllowed) {
        console.log('File filter - ACCEPTED');
        cb(null, true);
    } else {
        console.log('File filter - REJECTED');
        cb(new Error('Hanya file gambar yang diizinkan (jpeg, jpg, png, gif, webp)'), false);
    }
};

// Konfigurasi multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Maksimum 10MB (naik dari 5MB)
    }
});

// Endpoint upload gambar dengan error handling yang lebih baik
router.post('/', (req, res) => {
    console.log('=== UPLOAD REQUEST RECEIVED ===');
    console.log('Content-Type:', req.get('Content-Type'));

    // Gunakan upload.single dengan callback untuk menangkap error multer
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err.message);
            console.error('Multer error stack:', err.stack);

            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        status: 'fail',
                        message: 'Ukuran file terlalu besar. Maksimum 10MB'
                    });
                }
                return res.status(400).json({
                    status: 'fail',
                    message: `Multer error: ${err.message}`
                });
            }

            return res.status(500).json({
                status: 'fail',
                message: err.message || 'Error saat upload file'
            });
        }

        try {
            console.log('Multer processing complete');
            console.log('req.file:', req.file);

            if (!req.file) {
                console.log('No file in request');
                return res.status(400).json({
                    status: 'fail',
                    message: 'Tidak ada file yang diupload. Pastikan field name adalah "image"'
                });
            }

            // Buat URL untuk mengakses gambar
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

            console.log('=== FILE UPLOADED SUCCESSFULLY ===');
            console.log('Filename:', req.file.filename);
            console.log('Size:', req.file.size);
            console.log('Path:', req.file.path);
            console.log('Image URL:', imageUrl);

            res.status(200).json({
                status: 'success',
                message: 'Gambar berhasil diupload',
                data: {
                    filename: req.file.filename,
                    url: imageUrl,
                    size: req.file.size
                }
            });
        } catch (error) {
            console.error('Error after multer:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                status: 'fail',
                message: error.message
            });
        }
    });
});

module.exports = router;

