const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');
let cameraOn = false;
let isScanning = false;

// Variables for stability
let lastEmotion = "";
let emotionTimer = 0;
const STABILITY_THRESHOLD = 15; 

const musicLibrary = {
    neutral: [
        { id: "474-xwYQLrs", title: "Chill Vibe: The World Retreats" },
        { id: "jfKfPfyJRdk", title: "Chill Vibe: Lofi Girl Radio" }
    ],
    happy: [
        { id: "C2LCNUNz784", title: "Happy(Vibe): Escape" },
        { id: "IIrCDAV3EgI", title: "Happy(Vibe): Tobu - CandyLand" }
    ],
    sad: [
        { id: "jzxLkrpuxf8", title: "Sad(Vibe): Love Costs" },
        { id: "tCRJ63B5f_8", title: "Sad(Vibe): Sad Piano Music" }
    ],
    angry: [
        { id: "fdwxXf14qxU", title: "Angry(Vibe): Heavy Metal Rock" },
        { id: "WxnN05vOuSM", title: "Angry(Vibe): Aggressive Metal" }
    ],
    surprised: [
        { id: "GAVjc7N2I6E", title: "Surprised(Vibe): wiv" },
        { id: "2ZIpFytCSVc", title: "Surprised(Vibe): Dramatic Chipmunk" }
    ],
    fearful: [
        { id: "-zvQoPyY2XE", title: "Fearful(Vibe): Dark Tension" },
        { id: "sYp9p8gGj9c", title: "Fearful(Vibe): Creepy Forest" }
    ],
    disgusted: [
        { id: "0EJftQteGzo", title: "Disgusted(Vibe): Disgust" },
        { id: "rAbP5REW_Fc", title: "Disgusted(Vibe): Nope Sound Effect" }
    ]
};

// --- Face API Models ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(() => {
    startBtn.innerText = "Start Camera";
    startBtn.disabled = false;
    console.log("Models Loaded");
});

// --- Button Click Handler ---
startBtn.addEventListener('click', () => {
    isScanning = true;
    emotionTimer = 0;
    startBtn.innerText = "Scanning...(Hold Your Face)";
    emotionText.innerText = "Analyzing...";
    emotionText.style.color = "#1DB954";
    
    if (!cameraOn) {
        startVideo();
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

// --- Main AI Loop ---
video.addEventListener('play', () => {
    const wrapper = document.getElementById('video-wrapper');
    let canvas = document.getElementById('face-canvas');
    
    if (!canvas) {
        canvas = faceapi.createCanvasFromMedia(video);
        canvas.id = "face-canvas";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        wrapper.append(canvas);
    }

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        if (!isScanning) return; 

        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        if (detections.length > 0) {
            const expressions = detections[0].expressions;
            const highestEmotion = Object.keys(expressions).reduce((a, b) =>
                expressions[a] > expressions[b] ? a : b
            );

            if (highestEmotion === lastEmotion) {
                emotionTimer++;
            } else {
                emotionTimer = 0;
            }
            lastEmotion = highestEmotion;

            if (emotionTimer > STABILITY_THRESHOLD) {
                const currentEmotion = highestEmotion;
                emotionText.innerText = `MOOD: ${currentEmotion.toUpperCase()}`;
                
                // 1. Play Music FIRST (Updates UI immediately)
                recommendMusic(currentEmotion);
                
                // 2. Wait a tiny bit for the UI to settle, then Save
                const intensity = expressions[highestEmotion];
                setTimeout(() => {
                    const currentTrack = document.getElementById("song-title").innerText;
                    saveMoodToDatabase(currentEmotion, intensity, currentTrack);
                }, 100);
                
                // 3. Reset UI
                isScanning = false;
                startBtn.innerText = "Scan Mood Again!";
                emotionTimer = 0;
            }
        }
    }, 100);
});

// --- Simple Music Player ---
function recommendMusic(emotion) {
    const songList = musicLibrary[emotion] || musicLibrary.neutral;
    const randomIndex = Math.floor(Math.random() * songList.length);
    const selectedSong = songList[randomIndex];

    document.getElementById("song-title").innerText = `${selectedSong.title}`;
    
    const iframe = document.getElementById("youtube-player");
    iframe.innerHTML = `<iframe width="100%" height="250" src="https://www.youtube.com/embed/${selectedSong.id}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 10px;"></iframe>`;
}

// --- ROBUST DATABASE SAVER (Offline Safe) ---
async function saveMoodToDatabase(mood, intensity, song) {
    console.log("Attempting save...");
    
    // 1. OPTIMISTIC UPDATE: Update the screen NOW (Don't wait for server)
    addToHistoryList(mood, song, new Date()); 

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { error } = await supabaseClient
                .from('mood_history')
                .insert([{ user_id: user.id, mood: mood, intensity: intensity, song_name: song }]);
            
            if (error) console.error("Supabase Error (Ignored for Demo):", error);
            else console.log("✅ Saved to Cloud!");
        }
    } catch (err) {
        console.warn("Offline Mode: Saved locally only.");
    }
}

// --- Helper to draw the list item ---
function addToHistoryList(mood, song, dateObj) {
    const list = document.getElementById('mood-list');
    
    // Remove "No moods yet" message if it exists
    if (list.innerHTML.includes("No moods recorded")) list.innerHTML = "";

    let icon = "🎵";
    if (mood === "happy") icon = "😄";
    if (mood === "sad") icon = "😢";
    if (mood === "angry") icon = "😡";
    if (mood === "neutral") icon = "😐";

    const newItem = `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 4px solid #1DB954; animation: fadeIn 0.5s;">
            <div style="display: flex; flex-direction: column;">
                <span style="font-weight: bold; color: white; font-size: 1.1rem;">${icon} ${mood.toUpperCase()}</span>
                <span style="font-size: 0.85rem; color: #b3b3b3;">${song}</span>
            </div>
            <span style="font-size: 0.8rem; color: #666; font-family: monospace;">${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </li>
    `;
    
    // Add new item to the TOP of the list
    list.innerHTML = newItem + list.innerHTML;
}

// --- Initial Loader ---
async function loadMoodHistory() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        const { data } = await supabaseClient.from('mood_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
        if (data && data.length > 0) {
            document.getElementById('mood-list').innerHTML = ""; // Clear list
            data.forEach(item => addToHistoryList(item.mood, item.song_name, new Date(item.created_at)));
        }
    } catch (err) {
        console.log("Could not load history (Offline/Error).");
    }
}
loadMoodHistory();