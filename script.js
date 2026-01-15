const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');
let cameraOn = false;
let isScanning = false;

// Variables for stability
let lastEmotion = "";
let emotionTimer = 0;
const STABILITY_THRESHOLD = 15; 

 let currentMoodPlaying = null;
 
 function playMusic(mood) {
    if (!mood || mood === currentMoodPlaying) return;
    currentMoodPlaying = mood;

    console.log(`Switching Music to: ${mood}`);

    const playerBox = document.querySelector('.player-box');
    const oldPlayer = document.getElementById('music-player');

    // defining playlists
    const playlists = {
        'happy': '1479458365',
        'sad': '1911533742',
        'angry': '2098157264',
        'surprised': '1282495565',
        'fearful': '2328226062',
        'disgusted': '5243326682',
        'neutral':'3110429622'
    }
    const playlistId = playlists[mood] || playlists['neutral'];

    const newPlayer = document.createElement('iframe');
    newPlayer.id = 'music-player';
    newPlayer.title = "Deezer Player";
    newPlayer.width = "100%";
    newPlayer.height = "250";
    newPlayer.frameBorder = "0";
    newPlayer.allowTransparency = "true";
    newPlayer.style.border = "none";
    newPlayer.style.display = "block";

    newPlayer.allow = "autoplay; encrypted-media; clipboard-write";
    newPlayer.src = `https://widget.deezer.com/widget/dark/playlist/${playlistId}?autoplay=true&radius=0`;

    if (oldPlayer) {
        oldPlayer.replaceWith(newPlayer);
    } else {
        playerBox.appendChild(newPlayer);
    }
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
    playMusic('neutral');
    
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
        width: video.videoWidth, 
        height: video.videoHeight 
    };

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        if (!isScanning) return; 

        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections.length > 0) {
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

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
                
                playMusic(currentEmotion);

                const intensity = expressions[highestEmotion];

                setTimeout(() => {
                    const safeSongName = `${currentEmotion.charAt(0).toUpperCase() + currentEmotion.slice(1)} Mix`;
                    saveMoodToDatabase(currentEmotion, intensity, safeSongName);
                }, 100);
            
                // Reset UI
                isScanning = false;
                startBtn.innerText = "Scan Mood Again!";
                emotionTimer = 0;
                stopCamera();
            }
        }
    }, 100);
});


// ROBUST DATABASE SAVER
async function saveMoodToDatabase(mood, intensity, song) {
    console.log("Saving mood...");

    const now = new Date();
    const localEntry = {
        mood: mood,
        intensity: intensity,
        song_name: song,
        created_at: now.toISOString()
    };

    addToHistoryList(mood, song, now);
    addPointToChart(localEntry); 

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { error } = await supabaseClient
                .from('mood_history')
                .insert([{ user_id: user.id, mood: mood, intensity: intensity, song_name: song }]);
            
            if (error) console.error("Supabase Error:", error);
            else console.log("✅ Saved to Cloud (Background)");
        }
    } catch (err) {
        console.warn("Offline Mode: Saved locally only.");
    }
}

function addPointToChart(entry) {
    if (!moodChartInstance) return;

    const chart = moodChartInstance;
    const dateObj = new Date(entry.created_at);
    const label = dateObj.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric' });

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(entry.intensity);

    if (chart.data.labels.length > 10) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update(); // ⚡ Redraw immediately
}

// --- Helper to draw the list item ---
function addToHistoryList(mood, song, dateObj) {
    const list = document.getElementById('mood-list');
    
    // Remove "No moods yet" message
    if (list.innerHTML.includes("No moods recorded")) list.innerHTML = "";

    let icon = "🎵";
    if (mood === "happy") icon = "😄";
    if (mood === "sad") icon = "😢";
    if (mood === "angry") icon = "😡";
    if (mood === "neutral") icon = "😐";

    const newItem = `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; border-bottom: 1px dashed black; animation: fadeIn 0.5s;">
            <div style="display: flex; flex-direction: column; text-align: left;">
                <span style="font-weight: bold; color: black; font-size: 1.1rem;">${icon} ${mood.toUpperCase()}</span>
                <span style="font-size: 0.85rem; color: #555;">${song}</span>
            </div>
            <span style="font-size: 0.8rem; color: black; font-family: monospace;">${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </li>
    `;
    
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
            .limit(50);

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
    const chartData = [...data].slice(0,20).reverse();
    const labels = chartData.map(item => {
        const d = new Date(item.created_at);
        return d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric'});
    });
    const intensities = chartData.map(item => item.intensity);
    const moodNames = chartData.map(item => item.mood);

    if (moodChartInstance) moodChartInstance.destroy();

    moodChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Intensity',
                data: intensities,
                borderColor: '#000000',
                borderWidth: 3,
                tension: 0,
                stepped: true,
                fill: false,
                pointBackgroundColor: '#a3ffac',
                pointBorderColor: '#000',
                pointBorderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointStyle: 'rect',
                clip: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    left: 10,
                    right: 10
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    max: 1.0, 
                    grid: { 
                        color: '#e0e0e0',
                        lineWidth: 2,
                        tickLength: 0
                    },
                    ticks: { 
                        color: '#000',
                        font: { family: "'Courier New', monospace", weight: 'bold' },
                        stepSize: 0.2,
                        autoSkip: false,
                        includeBounds: true,
                        padding: 15
                    },
                    border: { display: false }
                },
                x: { 
                    grid: { display: false },
                    offset: true,
                    ticks: { 
                        color: '#000',
                        font: { family: "'Courier New', monospace", size: 10 } 
                    }
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#000',
                    titleColor: '#fff',
                    bodyColor: '#a3ffac',
                    titleFont: { family: "'Courier New', monospace" },
                    bodyFont: { family: "'Courier New', monospace", weight: 'bold' },
                    borderColor: '#000',
                    borderWidth: 0,
                    cornerRadius: 0,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const mood = moodNames[index];
                            const percentage = (context.raw * 100).toFixed(0);
                            return `> ${mood.toUpperCase()} [${percentage}%]`;
                        }
                    }
                }
            }
        }
    });
    console.log("Chart drawn (Neo-Brutalist Style)!");
}
loadMoodHistory();