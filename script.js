const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');
const songRecommendation = document.getElementById('song-recommendation');
let cameraOn = false;

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(enableButton);
function enableButton() {
    startBtn.innerText = "Start Camera";
    startBtn.disabled = false;
    console.log("Models Loaded");
}
startBtn.addEventListener('click',startVideo);
function startVideo() {
    if (cameraOn) return;
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            startBtn.innerText = "Camera On";
            cameraOn = true;
        })
        .catch(err => {
            console.error("Error accessing webcam:", err);
        });
}
video.addEventListener('play', () => {
    let canvas = document.getElementById('face-canvas');
    if (!canvas) {
        canvas = faceapi.createCanvasFromMedia(video);
        canvas.id = "face-canvas";
        document.querySelector('.camera-box').append(canvas);
    }
    const displaySize = { width: video.videoWidth,height: video.videoHeight };
    faceapi.matchDimensions(canvas,displaySize);
    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(video,new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
        const resizedDetections = faceapi.resizeResults(detections,displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        faceapi.draw.drawDetections(canvas,resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas,resizedDetections);
        if (detections.length>0) {
            const expressions = detections[0].expressions;
            const highestEmotion = Object.keys(expressions).reduce((a, b) =>
                expressions[a] > expressions[b] ? a : b
            );
            emotionText.innerText = highestEmotion.toUpperCase();
            recommendMusic(highestEmotion);
        } else {
            emotionText.innerText = "Looking for face...";
            songRecommendation.innerText = "Waiting for a vibe...";
        }
    }, 200);
});

function recommendMusic(emotion) {
    let song = "";
    if (emotion === "happy") {
        song = "'Happy' by Pharrell Williams";
    } else if (emotion === "sad") {
        song = "'Someone Like You' by Adele";
    } else if (emotion === "angry") {
        song = "'Break Stuff' by Limp Bizkit";
    } else if (emotion === "surprised") {
        song = "'Bohemian Rhapsody' by Queen";
    } else if (emotion === "neutral") {
        song = "lofi hip hop beats";
    } else {
        song = "Exploring your vibe...";
    }
    songRecommendation.innerText = song;
}