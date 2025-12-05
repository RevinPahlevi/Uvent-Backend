require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const allRoutes = require('./routes/index'); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- TAMBAHAN BARU ---
// Set EJS sebagai view engine
app.set('view engine', 'ejs');
// --------------------

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rute Utama API (untuk mobile)
app.use('/api', allRoutes);

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server Uvent berjalan di http://localhost:${PORT}`);
});