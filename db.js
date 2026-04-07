const mysql = require('mysql');
require('dotenv').config();

const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

// Test koneksi
db.getConnection((err, connection) => {
    if (err) {
        console.error('Koneksi database gagal:', err);
    } else {
        console.log('Terhubung ke database');
        connection.release(); // penting!
    }
});

module.exports = db;