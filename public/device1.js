// Import MQTT service
import { MQTTService } from "./mqttService.js";

// The maximum number of data points displayed on our scatter/line graph
let MAX_GRAPH_POINTS = 30;

/*
  Plotly.js graph and chart setup code
*/
var heartHistoryDiv = document.getElementById("heart-history");
var spoHistoryDiv = document.getElementById("spo-history");
var tempHistoryDiv = document.getElementById("temp-history");
var infusHistoryDiv = document.getElementById("infus-history");

const historyCharts = [
  heartHistoryDiv,
  spoHistoryDiv,
  tempHistoryDiv,
  infusHistoryDiv
];


// Fungsi untuk membuat trace
function createTrace(name) {
  return {
    x: [],
    y: [],
    name: name,
    mode: "lines+markers",
    type: "line",
  };
}

// Membuat trace untuk setiap data
var heartTrace = createTrace("heart");
var spoTrace = createTrace("spo");
var tempTrace = createTrace("temp");
var infusTrace = createTrace("infus");

function createLayout(titleText, yUnit = '') {
  return {
    autosize: true,

    title: {
      text: titleText,
      xanchor: 'center',
      x: 0.5,
      y: 0.90,
      font: {
        size: 16,
        weight: 600,
        color: "#2c3e50"
      }
    },

    font: {
      size: 13,
      color: "#34495e",
      family: "Public Sans, sans-serif",
    },

    colorway: ["#2ecc71"],

    margin: {
      t: 55,
      b: 45,
      l: 55,
      r: 25
    },

    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",

    xaxis: {
      title: {
        text: "Waktu",
        font: { size: 11, color: "#7f8c8d" }
      },
      showgrid: true,
      gridcolor: "#ecf0f1",
      gridwidth: 1,
      zeroline: false,
      showline: false,
      tickfont: { size: 11 },
      ticks: "outside"
    },

    yaxis: {
      title: {
        text: yUnit,
        font: { size: 11, color: "#7f8c8d" }
      },
      showgrid: true,
      gridcolor: "#ecf0f1",
      gridwidth: 1,
      zeroline: false,
      showline: false,
      tickfont: { size: 11 }
    },

    hovermode: "x unified",

    showlegend: false,

    transition: {
      duration: 300,
      easing: "cubic-in-out"
    }
  };
}


// Menggunakan fungsi untuk membuat layout
var heartLayout = createLayout("Heart Rate");
var spoLayout = createLayout("Spo2");
var tempLayout = createLayout("Chip Temp");
var infusLayout = createLayout("Infusion");

var config = { responsive: true, displayModeBar: false };

// Event listener when page is loaded
window.addEventListener("load", (event) => {
  Plotly.newPlot(heartHistoryDiv, [heartTrace], heartLayout, config);
  Plotly.newPlot(spoHistoryDiv, [spoTrace], spoLayout, config);
  Plotly.newPlot(tempHistoryDiv, [tempTrace], tempLayout, config);
  Plotly.newPlot(infusHistoryDiv, [infusTrace], infusLayout, config);
  // ambil data terkhir 20 data

  // Get MQTT Connection
  fetchMQTTConnection();
  fetchDataLatest();

  // Run it initially
  handleDeviceChange(mediaQuery);

});

// heart
let newheartYArray = [];
let newheartXArray = [];
// spo
let newspoYArray = [];
let newspoXArray = [];
// temp
let newtempYArray = [];
let newtempXArray = [];
// infus
let newinfusYArray = [];
let newinfusXArray = [];

// Callback function that will retrieve our latest sensor readings and redraw our Gauge with the latest readings
function updateSensorReadings(jsonResponse) {
  console.log(typeof jsonResponse);
  console.log(jsonResponse);

  let heart = Number(jsonResponse.A).toFixed(2); // digunakan untuk menerima data dari json parse yang dikirim oleh mqtt publisher
  let spo = Number(jsonResponse.B).toFixed(2);
  let temp = Number(jsonResponse.C).toFixed(2);
  let infus = Number(jsonResponse.D).toFixed(2);
  let batt = Number(jsonResponse.E).toFixed(2);

  //sendDataToServer(heart, spo, temp, infus, batt);
  updateBoxes(heart, spo, temp, infus, batt);

  const currentDate = new Date();

  // Menggunakan Intl.DateTimeFormat untuk menyesuaikan zona waktu
  const optionsTime = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

  let formattedTime = new Intl.DateTimeFormat('id-ID', optionsTime).format(currentDate);
  formattedTime = formattedTime.replace(/\./g, ':');

  // Update heart Line Chart
  updateCharts(heartHistoryDiv, newheartXArray, newheartYArray, heart, formattedTime);
  // Update spo Line Chart
  updateCharts(spoHistoryDiv, newspoXArray, newspoYArray, spo, formattedTime);
  // Update temp Line Chart
  updateCharts(tempHistoryDiv, newtempXArray, newtempYArray, temp, formattedTime);
  // Update infus Line Chart
  updateCharts(infusHistoryDiv, newinfusXArray, newinfusYArray, infus, formattedTime);
}

function updateBoxes(heart, spo, temp, infus, batt) {
  let heartDiv = document.getElementById("heart");
  let spoDiv = document.getElementById("spo");
  let tempDiv = document.getElementById("temp");
  let infusDiv = document.getElementById("infus");
  let battDiv = document.getElementById("batt");

  heartDiv.innerHTML = heart + ' BPM';
  spoDiv.innerHTML = spo + ' %';
  tempDiv.innerHTML = temp + ' °C';
  infusDiv.innerHTML = infus + ' %';
  battDiv.innerHTML = batt;
}

/*
  Fungsi Menerima 20 data terbaru dari tabel
*/

function fetchDataLatest() {
  fetch(`/get${window.location.pathname.replace('/public', '').replace('/', '')}`, {
    method: "GET",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {

      // Mengambil data dari response JSON dengan benar
      const { heart, spo, temp, infus, batt, time } = data;

      // Array yang berisi informasi untuk setiap grafik yang akan diperbarui
      const charts = [
        { divId: heartHistoryDiv, datax: heart, datay: time, xArray: newheartXArray, yArray: newheartYArray },
        { divId: spoHistoryDiv, datax: spo, datay: time, xArray: newspoXArray, yArray: newspoYArray },
        { divId: tempHistoryDiv, datax: temp, datay: time, xArray: newtempXArray, yArray: newtempYArray },
        { divId: infusHistoryDiv, datax: infus, datay: time, xArray: newinfusXArray, yArray: newinfusYArray }
      ];

      charts.forEach(chart => {
        // Dalam loop ini, chart.datax adalah data sensor dan chart.datay adalah data waktu
        chart.datax.forEach((datx, index) => {
          const datay = chart.datay[index];  // Ambil waktu yang sesuai dengan data sensor
          updateCharts(chart.divId, chart.xArray, chart.yArray, datx, datay);
        });
      });

    })
    .catch((error) => console.error("Error getting MQTT Connection :", error));
}

function updateCharts(lineChartDiv, xArray, yArray, datax, datay) {
  if (xArray.length >= MAX_GRAPH_POINTS) {
    xArray.shift();
  }
  if (yArray.length >= MAX_GRAPH_POINTS) {
    yArray.shift();
  }
  yArray.push(datax);
  xArray.push(datay);

  var data_update = {
    x: [xArray],
    y: [yArray],
  };

  Plotly.update(lineChartDiv, data_update);
}

const mediaQuery = window.matchMedia("(max-width: 600px)");

mediaQuery.addEventListener("change", function (e) {
  handleDeviceChange(e);
});

function handleDeviceChange(e) {
  if (e.matches) {
    console.log("Inside Mobile");
    var updateHistory = {
      width: 330,
      height: 250,
      "xaxis.autorange": true,
      "yaxis.autorange": true,
    };
    historyCharts.forEach((chart) => Plotly.relayout(chart, updateHistory));
  } else {
    var updateHistory = {
      width: 600,
      height: 300,
      "xaxis.autorange": true,
      "yaxis.autorange": true,
    };
    historyCharts.forEach((chart) => Plotly.relayout(chart, updateHistory));
  }
}

/*
  MQTT Message Handling Code
*/
const mqttStatus = document.querySelector(".status");

function onConnect(message) {
  mqttStatus.textContent = "Connected";
}

function onMessage(topic, message) {
  var stringResponse = message.toString();
  var messageResponse = JSON.parse(stringResponse);
  updateSensorReadings(messageResponse);
}

function onError(error) {
  console.log(`Error encountered :: ${error}`);
  mqttStatus.textContent = "Error";
}

function onClose() {
  console.log(`MQTT connection closed!`);
  mqttStatus.textContent = "Closed";
}

function fetchMQTTConnection() {
  fetch(`/mqtt${window.location.pathname.replace('/public', '').replace('/', '')}`, {
    method: "GET",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      initializeMQTTConnection(data.mqttServer, data.mqttTopic);
    })
    .catch((error) => console.error("Error getting MQTT Connection :", error));
}

function initializeMQTTConnection(mqttServer, mqttTopic) {
  console.log(
    `Initializing connection to :: ${mqttServer}, topic :: ${mqttTopic}`
  );
  var fnCallbacks = { onConnect, onMessage, onError, onClose };

  var mqttService = new MQTTService(mqttServer, fnCallbacks);
  mqttService.connect();

  mqttService.subscribe(mqttTopic);
}