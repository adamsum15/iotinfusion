const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth")
const pagesController = require("../controllers/pages")

// Login Page.
router.get("/", authController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.redirect('/device1');
  } else {
    res.render("pages/login");
  }
});


router.post("/deletetable", authController.isLoggedIn, (req, res) => {
  pagesController.deleteTable(req, res,);
});

router.post("/changepass", authController.isLoggedIn, (req, res) => {
  pagesController.changepass(req, res,);
});

router.get("/device1", authController.isLoggedIn, (req, res) => {
  pagesController.renderPage(req, res, 'device1');
});

router.get("/device2", authController.isLoggedIn, (req, res) => {
  pagesController.renderPage(req, res, 'device2');
});

router.get("/device1/public", authController.isLoggedIn, (req, res) => {
  pagesController.renderPublicPage(req, res, 'device1');
});

router.get("/device2/public", authController.isLoggedIn, (req, res) => {
  pagesController.renderPublicPage(req, res, 'device2');
});

router.get("/mqttdevice1", (req, res) => {
  pagesController.sendMqttConfig(process.env.MQTT_TOPIC_1, res);
});

router.get("/mqttdevice2", (req, res) => {
  pagesController.sendMqttConfig(process.env.MQTT_TOPIC_2, res);
});

router.get("/getdevice1", (req, res, next) => {
  pagesController.getDeviceData('device1', 1, res, next);
});

router.get("/getdevice2", (req, res, next) => {
  pagesController.getDeviceData('device2', 2, res, next);
});

// Route untuk menangani Form Pasien
router.post("/patients/add", authController.isLoggedIn, (req, res) => {
  pagesController.addPatient(req, res);
});

router.post("/patients/edit", authController.isLoggedIn, (req, res) => {
  pagesController.updatePatient(req, res);
});

router.post("/patients/change", authController.isLoggedIn, (req, res) => {
  pagesController.changePatient(req, res);
});

router.post("/patients/sync", authController.isLoggedIn, (req, res) => {
  pagesController.syncPatient(req, res);
});

router.get("/export/:device", authController.isLoggedIn,
  pagesController.downloadDeviceData
);


module.exports = router;
