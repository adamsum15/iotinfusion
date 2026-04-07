const db = require('../db');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const mqttService = require("../services/mqttserver");

exports.renderPage = async (req, res, activePage) => {
    try {
        const user = req.user;
        const device_id = activePage.replace('device', '');

        db.query(
            'SELECT * FROM table_patient WHERE is_deleted = 0',
            (err, allPatients) => {
                if (err) {
                    console.error("KESALAHAN QUERY DATABASE:", err);
                    return res.status(500).send("Gagal mengambil data pasien.");
                }

                // Ambil pasien berdasarkan device
                const patientData = allPatients.find(
                    p => String(p.device_id) === String(device_id)
                ) || null;

                if (user) {
                    res.render("pages/device", {
                        user: user,
                        activePage: activePage,
                        patient: patientData,
                        patients: allPatients
                    });
                } else {
                    res.redirect('/');
                }
            }
        );
    } catch (error) {
        console.error("Error rendering page:", error);
        res.status(500).send("Internal server error");
    }
};

exports.renderPublicPage = async (req, res, activePage) => {
    try {
        const device_id = activePage.replace('device', '');

        db.query(
            'SELECT * FROM table_patient WHERE is_deleted = 0',
            (err, allPatients) => {
                if (err) {
                    console.error("KESALAHAN QUERY DATABASE:", err);
                    return res.status(500).send("Gagal mengambil data pasien.");
                }

                // Ambil pasien berdasarkan device
                const patientData = allPatients.find(
                    p => String(p.device_id) === String(device_id)
                ) || null;

                res.render("pages/publicdevice", {
                    activePage: activePage,
                    patient: patientData
                });
            }
        );
    } catch (error) {
        console.error("Error rendering page:", error);
        res.status(500).send("Internal server error");
    }
};

exports.sendMqttConfig = async (mqttTopicreal, res) => {
    try {
        res.send(
            JSON.stringify({
                mqttServer: process.env.MQTT_BROKER,
                mqttTopic: mqttTopicreal,
            })
        );
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
};

exports.getDeviceData = (deviceTable, deviceId, res, next) => {
    db.query(
        'SELECT id FROM table_patient WHERE device_id = ? AND is_deleted = 0',
        [deviceId],
        (err, patientResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Gagal mengambil data pasien.");
            }

            if (!patientResults.length) {
                return res.status(404).send("Pasien tidak ditemukan.");
            }

            const id_patient = patientResults[0].id;

            // QUERY KE-2 DI DALAM CALLBACK
            db.query(
                `SELECT * FROM ${deviceTable} WHERE id_patient = ? ORDER BY id DESC LIMIT 30`,
                [id_patient],
                (error, results) => {
                    if (error) {
                        console.error(error);
                        return next(error);
                    }

                    results.reverse();

                    res.json({
                        heart: results.map(r => r.heart),
                        spo: results.map(r => r.spo),
                        temp: results.map(r => r.temp),
                        infus: results.map(r => r.infus),
                        humy: results.map(r => r.humy),
                        time: results.map(r => r.time)
                    });
                }
            );
        }
    );
};

exports.downloadDeviceData = async (req, res) => {
    try {
        const { device } = req.params;
        const sheetName = `data_${device}`;
        db.query(`SELECT d.*, p.name AS patient_name FROM ${device} d LEFT JOIN table_patient p ON d.id_patient = p.id ORDER BY d.id DESC`, (error, results) => {
            if (error) {
                console.error("Database error:", error);
                return next(error); // Mengirim error ke middleware penanganan error
            }

            // Menyiapkan data untuk file Excel
            let data = [["No", "Patient", "Heart Rate", "Spo2", "Chip temp", "Infus", "Battery", "Date", "Time"]];
            results.forEach((row, index) => {
                data.push([index + 1, row["patient_name"], row["heart"], row["spo"], row["temp"], row["infus"], row["batt"], row["date"], row["time"]]);
            });

            // Membuat worksheet dan workbook untuk file Excel
            const worksheet = xlsx.utils.aoa_to_sheet(data);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

            // Menulis file Excel dalam bentuk buffer (bukan menyimpannya ke disk)
            const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

            // Menyiapkan header untuk pengunduhan file
            res.setHeader('Content-Disposition', `attachment; filename=${sheetName}.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            // Mengirimkan file kepada pengguna
            res.status(200).send(excelBuffer);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
};

exports.deleteTable = async (req, res, next) => {
    try {
        const { tableName, password, email } = req.body;
        db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.error("Database error:", error);
                return next(error); // Mengirim error ke middleware penanganan error
            }

            const user = results[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).render('pages/system', {
                    alert: { type: 'error', message: 'Password salah' },
                    activePage: 'system',
                    user: user
                });
            }

            const allowedTables = ['device1', 'device2'];
            if (!allowedTables.includes(tableName)) {
                return res.status(401).render('pages/system', {
                    alert: { type: 'error', message: 'Tabel Salah' },
                    activePage: 'system',
                    user: user
                });
            }

            db.query(`TRUNCATE TABLE ??`, [tableName], (error, results) => {
                if (error) {
                    console.error("Database error:", error);
                    return next(error);
                }

                return res.status(200).render('pages/system', {
                    alert: { type: 'success', message: 'Data berhasil dihapus' },
                    activePage: 'system',
                    user: user
                });
            });
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.changepass = async (req, res, next) => {
    try {
        const { currentpassword, newpassword, confirmpassword, email } = req.body;
        let length = newpassword.length;

        db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.error("Database error:", error);
                return next(error); // Mengirim error ke middleware penanganan error
            }

            const user = results[0];
            if (newpassword != confirmpassword || length < 8) {
                return res.status(401).render('pages/system', {
                    alert: { type: 'error', message: 'Tidak Sesuai Ketentuan' },
                    activePage: 'system',
                    user: user
                });
            }

            const isPasswordValid = await bcrypt.compare(currentpassword, user.password);
            if (!isPasswordValid) {
                return res.status(401).render('pages/system', {
                    alert: { type: 'error', message: 'Last Password salah' },
                    activePage: 'system',
                    user: user
                });
            }
            bcrypt.hash(newpassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    return;
                }
                db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], async (error, results) => {
                    if (error) {
                        console.error("Database error:", error);
                        return next(error);
                    }

                    return res.status(200).render('pages/system', {
                        alert: { type: 'success', message: 'Password Baru disimpan' },
                        activePage: 'system',
                        user: user
                    });
                });
            });
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.addPatient = async (req, res) => {
    try {
        const { name, age, gender, no_rm, name_room, no_room, no_bed, threshold_hr, threshold_spo, threshold_infus_warning, threshold_infus_danger, device_id } = req.body;
        const query = `INSERT INTO table_patient (name, age, gender, no_rm, name_room, no_room, no_bed, threshold_hr, threshold_spo, threshold_infus_warning, threshold_infus_danger, device_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
        if (isNaN(Number(age)) || Number(age) <= 0) {
            req.session.alert = {
                type: 'error',
                message: 'Usia harus berupa angka dan lebih dari 0'
            };
            return res.redirect(req.get('Referrer') || '/device' + device_id);
        }
        db.query(query, [name, age, gender, no_rm, name_room, no_room, no_bed, threshold_hr, threshold_spo, threshold_infus_warning, threshold_infus_danger, device_id], (err) => {
            if (err) {
                console.error("Gagal tambah pasien:", err);
                return res.status(500).send("Gagal menambahkan data");
            }
            req.session.alert = {
                type: 'success',
                message: 'Data pasien berhasil ditambahkan'
            };
            return res.redirect(req.get('Referrer') || `/device${device_id}`);
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const { name, age, gender, no_rm, name_room, no_room, no_bed, threshold_hr, threshold_spo, threshold_infus_warning, threshold_infus_danger, device_id, patient_id } = req.body;
        const query = `UPDATE table_patient SET name=?, age=?, gender=?, no_rm=?, name_room=?, no_room=?, no_bed=?, threshold_hr=?, threshold_spo=?, threshold_infus_warning=?, threshold_infus_danger=?, device_id=? WHERE id=?`;
        if (isNaN(Number(age)) || Number(age) <= 0) {
            req.session.alert = {
                type: 'error',
                message: 'Usia harus berupa angka dan lebih dari 0'
            };
            return res.redirect(req.get('Referrer') || '/device' + device_id);
        }
        db.query(query, [name, age, gender, no_rm, name_room, no_room, no_bed, threshold_hr, threshold_spo, threshold_infus_warning, threshold_infus_danger, device_id, patient_id], (err) => {
            if (err) {
                console.error("Gagal update pasien:", err);
                return res.status(500).send("Gagal memperbarui data");
            }
            req.session.alert = {
                type: 'success',
                message: 'Data pasien berhasil diperbarui'
            };
            return res.redirect(req.get('Referrer') || `/device${device_id}`);
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.changePatient = async (req, res) => {
    try {
        const { last_patient_id, device_id, new_patient_id } = req.body;

        const currentDeviceId = Number(device_id);
        const lastPatientId = Number(last_patient_id);
        const newPatientId = Number(new_patient_id);

        // 1️⃣ Ambil data pasien BARU
        db.query('SELECT id, device_id FROM table_patient WHERE id = ? AND is_deleted = 0', [newPatientId], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Gagal mengambil data pasien baru");
            }

            if (!rows.length) {
                req.session.alert = {
                    type: 'error',
                    message: 'Pasien baru tidak ditemukan'
                };
                return res.redirect(req.get('Referrer') || '/');
            }

            const newPatient = rows[0];

            // 2️⃣ Tentukan ke mana pasien lama akan dipindahkan
            // Jika pasien baru sudah di device lain → swap
            // Jika tidak → pasien lama ke 0
            const targetDeviceForOldPatient = newPatient.device_id === 0 ? 0 : newPatient.device_id;

            // 3️⃣ Update pasien lama
            db.query('UPDATE table_patient SET device_id = ? WHERE id = ?', [targetDeviceForOldPatient, lastPatientId], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Gagal update pasien lama");
                }

                // 4️⃣ Update pasien baru → ke device yang sedang aktif
                db.query('UPDATE table_patient SET device_id = ? WHERE id = ?', [currentDeviceId, newPatientId], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Gagal update pasien baru");
                    }

                    // 5️⃣ Sukses
                    req.session.alert = {
                        type: 'success',
                        message: 'Pasien berhasil diganti'
                    };

                    return res.redirect(
                        req.get('Referrer') || `/device${currentDeviceId}`
                    );
                });
            });
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
};

exports.syncPatient = async (req, res) => {
    try {
        const { last_patient_id, device_id } = req.body;

        const lastPatientId = Number(last_patient_id);
        const currentDeviceId = Number(device_id);

        db.query(
            'SELECT threshold_hr, threshold_spo, threshold_infus_warning, threshold_infus_danger FROM table_patient WHERE id = ? AND is_deleted = 0',
            [lastPatientId],
            async (err, rows) => {

                if (err) {
                    console.error(err);
                    return res.status(500).send("Gagal mengambil data pasien");
                }

                if (!rows.length) {
                    req.session.alert = {
                        type: 'error',
                        message: 'Pasien tidak ditemukan'
                    };
                    return res.redirect(req.get('Referrer') || '/');
                }

                const data = rows[0];

                const payload = {
                    AT: data.threshold_hr,
                    BT: data.threshold_spo,
                    CT: data.threshold_infus_warning,
                    DT: data.threshold_infus_danger
                };

                const topic = `mqttinfus/threshold`;

                try {
                    await mqttService.publish(topic, payload);
                    req.session.alert = {
                        type: 'success',
                        message: 'Threshold berhasil disinkronisasi'
                    };

                    await mqttService.publish(topic, payload);
                    req.session.alert = {
                        type: 'success',
                        message: 'Threshold berhasil disinkronisasi'
                    };

                } catch (mqttError) {
                    console.error("MQTT Publish Error:", mqttError);
                    req.session.alert = {
                        type: 'error',
                        message: 'Gagal mengirim threshold ke device'
                    };
                }
                return res.redirect(
                    req.get('Referrer') || `/device${currentDeviceId}`
                );
            }
        );

    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
};



