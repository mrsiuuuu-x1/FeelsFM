const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');
let cameraOn = false;
let isScanning = false;

// Variables for stability
let lastEmotion = "";
let emotionTimer = 0;
const STABILITY_THRESHOLD = 15; 

// soundcloud music logic
const moodPlaylists = {
    happy: "https://soundcloud.com/shon-selects-tracks/sets/indie-rock-and-pop-ultra-playlist",
    sad: "https://soundcloud.com/kari1654/sets/sad-songs",
    angry: "https://soundcloud.com/ckfeine/sets/brazilian-phonk",
    neutral: "https://soundcloud.com/woozlesband/sets/chillhop-radio-jazz-lofi-hip",
    surprised: "https://soundcloud.com/maria-gomez-813734303/sets/the-crumbles-of-my-mind",
    fearful: "https://soundcloud.com/viktor-402522949/sets/horror-playlist",
    disgusted: "https://soundcloud.com/user-656191040/sets/feel-disgusted-by-everything"
};
 let currentMoodPlaying = "";
 
 function playMusic(mood) {
    const playerFrame = document.getElementById('sc-player');
    if (!playerFrame) return;

    const moodKey = mood.toLowerCase();
    const playlistUrl = moodPlaylists[moodKey] || moodPlaylists['neutral'];

    // randomizer logic
    const randomTrack = Math.floor(Math.random() * 5);
    console.log(`Switching to: ${moodKey} (Starting at track ${randomTrack})`);

    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(playlistUrl)}&color=%231db954&auto_play=true&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&start_track=${randomTrack}`;
    playerFrame.src = embedUrl;
    currentMoodPlaying = moodKey;
    document.getElementById('song-title').innerText = `Playing: ${mood.toUpperCase()} Vibes`;
 }

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
    navigator.mediaDevices.getUserMedia({ 
        video: {
            width: 640,
            height: 480,
        }
    })
    .then(stream => {
        video.srcObject = stream;
        cameraOn = true;
    })
    .catch(err => console.error("Error accessing webcam:", err));
}

function stopCamera() {
    if (!video.srcObject) return;

    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    cameraOn = false;

    console.log("Camera stopped");
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

    const displaySize = { 
        width: video.width, 
        height: video.height 
    };

    faceapi.matchDimensions(canvas, displaySize);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

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
                playMusic(currentEmotion);
                
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
                
                stopCamera();
            }
        }
    }, 100);
});

// --- Simple Music Player ---


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

// initial loader
async function loadMoodHistory() {
    console.log("Loading History...");
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data, error } = await supabaseClient
            .from('mood_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error; // Stop if DB error

        if (data && data.length > 0) {
            console.log("✅ Found", data.length, "moods. Drawing chart...");
            document.getElementById('mood-list').innerHTML = ""; 
            data.forEach(item => addToHistoryList(item.mood, item.song_name, new Date(item.created_at)));
            
            // draw the chart now
            updateChart(data); 
        } else {
            console.log("No history found yet.");
        }
    } catch (err) {
        console.error("CRITICAL CHART ERROR:", err); 
    }
}

// chart logic
let moodChartInstance = null;

function updateChart(data) {
    if (typeof Chart === 'undefined' || !document.getElementById('moodChart')) return;

    const ctx = document.getElementById('moodChart').getContext('2d');
    const chartData = [...data].reverse();
    const labels = chartData.map(item => new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const intensities = chartData.map(item => item.intensity);
    const moodNames = chartData.map(item => item.mood);

    if (moodChartInstance) moodChartInstance.destroy();

    moodChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vibe Intensity',
                data: intensities,
                borderColor: '#1DB954',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(29, 185, 84, 0.5)');
                    gradient.addColorStop(1, 'rgba(29, 185, 84, 0.0)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#121212',
                pointBorderColor: '#1DB954',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    max: 1.0, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' } 
                },
                x: { display: false }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 20, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#1DB954',
                    borderColor: '#1DB954',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const mood = moodNames[index];
                            const percentage = (context.raw * 100).toFixed(0);
                            return `${mood.toUpperCase()}: ${percentage}%`;
                        },
                        title: function(context) {
                            return context[0].label;
                        }
                    }
                }
            }
        }
    });
    console.log("Chart drawn successfully!");
}
loadMoodHistory();