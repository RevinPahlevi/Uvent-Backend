const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ status: 'fail', message: 'Semua field wajib diisi' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)';
        await db.query(sql, [name, email, hashedPassword, phone]);

        res.status(201).json({ status: 'success', message: 'Registrasi berhasil' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'fail', message: 'Email sudah terdaftar' });
        }
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Email dan Password wajib diisi' });
        }

        const sql = 'SELECT * FROM users WHERE email = ?';
        const [users] = await db.query(sql, [email]);

        if (users.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Email tidak ditemukan' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'fail', message: 'Password salah' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

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