const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');

let cameraOn = false;
function startVideo() {
    if (cameraOn) return;
    navigator.mediaDevices.getUserMedia({video: true})
    .then(stream => {
        video.srcObject = stream;
        startBtn.innerText = "Camera On";
        cameraOn = true;
    })
    .catch(err => {
        console.error("Error accessing webcam:", err);
        alert("Please allow webcam access to use FeelsFM!");
    });
}
startBtn.addEventListener('click', () => {
    startVideo();
})