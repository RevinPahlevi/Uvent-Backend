require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const allRoutes = require('./routes/index');

require('./config/firebase');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', allRoutes);

const { initScheduler } = require('./services/scheduler');

app.listen(PORT, () => {
    console.log(`Server Uvent berjalan di http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/api/admin`);

    initScheduler();
});