const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- Fungsi untuk Registrasi ---
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // 1. Cek validasi input
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ status: 'fail', message: 'Semua field wajib diisi' });
        }

        // 2. Enkripsi password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 adalah salt rounds

        // 3. Simpan ke database
        const sql = 'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)';
        await db.query(sql, [name, email, hashedPassword, phone]);

        res.status(201).json({ status: 'success', message: 'Registrasi berhasil' });

    } catch (error) {
        // Tangani error (misal: email sudah terdaftar/duplicate)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'fail', message: 'Email sudah terdaftar' });
        }
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// --- Fungsi untuk Login ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Cek validasi
        if (!email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Email dan Password wajib diisi' });
        }

        // 2. Cari user di database
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [users] = await db.query(sql, [email]);

        // 3. Cek jika user tidak ditemukan
        if (users.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Email tidak ditemukan' });
        }

        const user = users[0];

        // 4. Bandingkan password (input user dengan yang di-hash di DB)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'fail', message: 'Password salah' });
        }

        // 5. Buat Token (JWT)
        const token = jwt.sign(
            { id: user.id, email: user.email }, // Data yang disimpan di token
            process.env.JWT_SECRET, // Kunci rahasia dari file .env
            { expiresIn: '24h' } // Token berlaku selama 24 jam
        );

        // 6. Kirim respons sukses
        res.status(200).json({
            status: 'success',
            message: 'Login berhasil',
            data: {
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }
            }
        });

    } catch (error) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};