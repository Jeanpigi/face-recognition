const video = document.getElementById("video");
let existingCanvas = null; // Almacena una referencia al canvas existente

let isDetectionEnabled = false; // Controla si la detección está activada

// Cambia el estado de detección al hacer clic en el botón
document.getElementById("toggleDetection").addEventListener("click", () => {
  isDetectionEnabled = !isDetectionEnabled;
  document.getElementById("toggleDetection").innerText = isDetectionEnabled
    ? "Turn Off Emotion Detection"
    : "Turn On Emotion Detection";
});

// Inicia el video
const iniciarVideo = () => {
  navigator.mediaDevices
    .getUserMedia({ video: {} })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((err) => {
      console.error(err);
    });
};

// Carga los modelos de face-api.js
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
]).then(iniciarVideo);

// Traducciones de las expresiones faciales
const traduccionesExpresiones = {
  happy: "feliz",
  sad: "triste",
  angry: "enojado",
  disgusted: "disgustado",
  surprised: "sorprendido",
  fearful: "temeroso",
  neutral: "neutral",
};

video.addEventListener("play", () => {
  if (existingCanvas) {
    existingCanvas.remove(); // Elimina el canvas existente si ya hay uno
  }
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  existingCanvas = canvas; // Actualiza la referencia al nuevo canvas
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    if (!isDetectionEnabled) return; // Si la detección está desactivada, no hacer nada

    const detecciones = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();
    const deteccionesRedimensionadas = faceapi.resizeResults(
      detecciones,
      displaySize
    );

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, deteccionesRedimensionadas);
    faceapi.draw.drawFaceLandmarks(canvas, deteccionesRedimensionadas);

    deteccionesRedimensionadas.forEach((deteccion) => {
      const mejorExpresion =
        deteccion.expressions.asSortedArray()[0].expression;
      const texto = traduccionesExpresiones[mejorExpresion] || mejorExpresion;
      const box = deteccion.detection.box;
      const x = box.x;
      const y = box.y + box.height + 20; // Posiciona el texto debajo del cuadro de detección
      canvas.getContext("2d").fillStyle = "black";
      canvas.getContext("2d").font = "16px Arial";
      canvas.getContext("2d").fillText(texto, x, y);
    });
  }, 100);
});
