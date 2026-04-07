const mqtt = require("mqtt");
const dataService = require("./dataservice");

let client;

function initMQTT() {
    client = mqtt.connect(process.env.MQTT_BROKER, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 4000
    });

    const topics = [
        process.env.MQTT_TOPIC_1,
        process.env.MQTT_TOPIC_2
    ];

    client.on("connect", () => {
        console.log("MQTT Server Connected");

        client.subscribe(topics, (err) => {
            if (err) console.error("Subscribe gagal:", err);
        });
    });

    client.on("message", async (topic, message) => {
        try {
            const data = JSON.parse(message.toString());

            let table = "";
            let table_id = null;

            switch (topic) {
                case process.env.MQTT_TOPIC_1:
                    table = "device1";
                    table_id = 1;
                    break;

                case process.env.MQTT_TOPIC_2:
                    table = "device2";
                    table_id = 2;
                    break;

                default:
                    return;
            }
            await dataService.saveDeviceData(table, table_id, data);
            console.log("Data diterima:", table, data);
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    client.on("error", (err) => {
        console.error("MQTT Error:", err);
    });
}

function publish(topic, payload) {
    return new Promise((resolve, reject) => {
        if (!client) return reject("MQTT belum terhubung");

        client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    initMQTT,
    publish
};