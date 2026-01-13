const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');
const songRecommendation = document.getElementById('song-recommendation');
let cameraOn = false;
let isScanning = false;

let currentEmotion = "";
let lastEmotion = "";
let emotionTimer = 0;
const STABILITY_THRESHOLD = 15;

const musicLibrary = {
    neutral: [
        { id: "474-xwYQLrs", title: "Chill Vibe: The World Retreats" },
        { id: "jfKfPfyJRdk", title: "Chill Vibe: Lofi Girl Radio" },
        { id: "5qap5aO4i9A", title: "Chill Vibe: Lofi Hip Hop" }
    ],
    happy: [
        {id: "C2LCNUNz784",title: "Happy(Vibe): Escape"},
        {id: "IIrCDAV3EgI",title: "Happy(Vibe): Tobu - CandyLand"},
        {id: "J2X5mJ3HDYE",title: "Happy(Vibe): Cartoon - On & On"}
    ],
    sad: [
        {id: "jzxLkrpuxf8",title: "Sad(Vibe): Love Costs"},
        {id: "tCRJ63B5f_8",title: "Sad(Vibe): Sad Piano Music"},
        {id: "q7O4S7J_VQE",title: "Sad(Vibe): Rain Sounds"}
    ],
    angry: [
        {id: "fdwxXf14qxU",title: "Angry(Vibe): Heavy Metal Rock"},
        {id: "WxnN05vOuSM",title: "Angry(Vibe): Aggressive Metal"},
        {id: "mvJjmPbvI4c",title: "Angry(Vibe): Phonk Music"}
    ],
    surprised: [
        {id: "GAVjc7N2I6E",title: "Surprised(Vibe): wiv"},
        {id: "2ZIpFytCSVc",title: "Surprised(Vibe): Dramatic Chipmunk"},
        {id: "CQeezCdF4mk",title: "Surprised(Vibe): Vine Boom"}
    ],
    fearful: [
        {id: "-zvQoPyY2XE",title: "Fearful(Vibe): Dark Tension"},
        {id: "4fandeDfaPk",title: "Fearful(Vibe): Spooky Ambience"},
        {id: "sYp9p8gGj9c",title: "Fearful(Vibe): Creepy Forest"}
    ],
    disgusted: [
        {id: "0EJftQteGzo",title: "Disgusted(Vibe): Disgust"},
        {id: "M4sEcIHG0Yc",title: "Disgusted(Vibe): Ew Brother Eww"},
        {id: "rAbP5REW_Fc",title: "Disgusted(Vibe): Nope Sound Effect"}
    ]
};

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(enableButton);

function enableButton() {
    startBtn.innerText = "Start Camera";
    startBtn.disabled = false;
    console.log("Models Loaded");
}
// button click handler
startBtn.addEventListener('click', () => {
    if (!cameraOn) {
        // starting camera for the first time
        startVideo();
        isScanning = true;
        startBtn.innerText = "Scanning...(Hold Your Face)";
    } else {
        // if camera already on then restarting
        isScanning = true;
        startBtn.innerText = "Scanning...(Hold Your Face)";
        emotionText.innerText = "Analyzing...";
        video.play();        // restarting camera if it was stopped
    }
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            cameraOn = true;
        })
        .catch(err => console.error("Error accessing webcam:", err));
}
// main loop (#main section)
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
        // stopping if not scanning
        if (!isScanning) return;

        const detections = await faceapi
            .detectAllFaces(video,new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
        
        const resizedDetections = faceapi.resizeResults(detections,displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        faceapi.draw.drawDetections(canvas,resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas,resizedDetections);

        if (detections.length>0) {
            const expressions = detections[0].expressions;
            const highestEmotion = Object.keys(expressions).reduce((a,b) =>
                expressions[a] > expressions[b] ? a : b
            );
            // checking if stable or not
            if (highestEmotion === lastEmotion) {
                emotionTimer++;
            } else {
                emotionTimer = 0;
            }
            lastEmotion = highestEmotion;
            // LOCKIN LOGIC

            if (emotionTimer > STABILITY_THRESHOLD) {
               currentEmotion = highestEmotion;
               emotionText.innerText = `MOOD: ${currentEmotion.toUpperCase()}`;
               recommendMusic(currentEmotion);
               isScanning = false;
               startBtn.innerText = "Scan Mood Again!";
               emotionTimer = 0;
            }
        } else {
            emotionText.innerText = "Looking for face...";
        }
    }, 100);
});

function recommendMusic(emotion) {
    const songList = musicLibrary[emotion] || musicLibrary.neutral;
    const randomIndex = Math.floor(Math.random()*songList.length);
    const selectedSong = songList[randomIndex];
    document.getElementById("song-title").innerText = `${selectedSong.title}`;
    const player = document.getElementById("youtube-player");
    player.src = `https://www.youtube.com/embed/${selectedSong.id}?autoplay=1&origin=http://127.0.0.1:5500`;
}