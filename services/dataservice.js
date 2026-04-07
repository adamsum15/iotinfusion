const db = require("../db");

async function saveDeviceData(table, table_id, data) {
    return new Promise((resolve, reject) => {

        db.query(
            'SELECT id FROM table_patient WHERE device_id = ? AND is_deleted = 0', [table_id], (err, results) => {
                if (err) return reject(err);
                if (!results.length)
                    return reject("Patient tidak ditemukan");

                const id_patient = results[0].id;
                const now = new Date();
                const date = new Intl.DateTimeFormat('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(now);

                const time = new Intl.DateTimeFormat('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).format(now).replace(/\./g, ':');

                const query = `INSERT INTO ${table}(id_patient, heart, spo, temp, infus, batt, date, time)VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                db.query(query,
                    [id_patient, data.A, data.B, data.C, data.D, data.E, date, time],
                    (err2, result) => {
                        if (err2) return reject(err2);
                        resolve();
                    }
                );
            }
        );
    });
}

module.exports = { saveDeviceData };