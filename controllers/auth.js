const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const db = require('../db');


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasi jika email atau password kosong
        if (!email || !password) {
            return res.status(400).render('pages/login', {
                alert: { type: 'error', message: 'Login gagal. Silakan coba lagi.' }
            });
        }

        // Query untuk mencari user berdasarkan email
        db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.error("Database query error:", error);
                return res.status(500).render('pages/login', {
                    alert: { type: 'error', message: 'Terjadi kesalahan server. Silakan coba lagi nanti.' }
                });
            }

            // Cek apakah hasilnya kosong atau array kosong (user tidak ditemukan)
            if (!results || results.length === 0) {
                return res.status(401).render('pages/login', {
                    alert: { type: 'error', message: 'Email atau Password salah' }
                });
            }

            // Jika user ditemukan, verifikasi password
            const user = results[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).render('pages/login', {
                    alert: { type: 'error', message: 'Email atau Password salah' }
                });
            }

            // Buat token JWT dan set cookie jika login berhasil
            const id = user.id;
            const token = jwt.sign({ id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN
            });
            const cookieOptions = {
                expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
                httpOnly: true
            };

            res.cookie('jwt', token, cookieOptions);
            return res.status(200).redirect('/device1');
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).render('pages/login', {
            alert: { type: 'error', message: 'Terjadi kesalahan. Silakan coba lagi.' }
        });
    }
};

exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            //verify the token is exist
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

            //verify the user still exist
            db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, results) => {

                if (error) {
                    console.error("Database error:", error);
                    return next(error); // Mengirim error ke middleware penanganan error
                }

                if (!results || results.length === 0) {
                    return next();
                }

                req.user = results[0];
                return next();
            });
        } catch (error) {
            return next();
        }
    } else {
        next();
    }
}

exports.logout = async (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2000),
        httpOnly: true
    });
    res.status(200).redirect('/')
}