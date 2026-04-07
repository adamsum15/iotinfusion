const express = require("express");
const session = require('express-session');
const path = require("path");
const mqttService = require("./services/mqttserver");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3001;

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

// Parse URL Encoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: 'secret-key', // ganti dengan env kalau mau
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  res.locals.alert = req.session.alert;
  delete req.session.alert; // supaya hanya tampil sekali
  next();
});

// load dotenv to read environment variables
require("dotenv").config();

// template view engine
app.set("view engine", "ejs");

// Serve Static Files
app.use(express.static("public"));

mqttService.initMQTT(); // connect sekali saat server start

//Define Routes
app.use('/', require('./routes/pages'))
app.use('/auth', require('./routes/auth'))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
