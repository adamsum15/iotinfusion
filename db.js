const mysql = require('mysql');
require('dotenv').config(); // Memastikan .env terbaca, jika belum dilakukan di tempat lain

// Membuat koneksi ke database
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

// Membuka koneksi dan menangani error
db.connect((error) => {
    if (error) {
        console.error('Koneksi ke database gagal:', error);
        return;
    }
    console.log('Terhubung ke database');
});

module.exports = db; // Mengekspor koneksi
