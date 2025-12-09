require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const allRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS sebagai view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images dari folder 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rute Utama API (untuk mobile dan admin)
app.use('/api', allRoutes);

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server Uvent berjalan di http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/api/admin`);
});