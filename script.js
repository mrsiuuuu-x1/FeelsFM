const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');
let cameraOn = false;
let isScanning = false;
let detectionInterval = null; 

// Variables for stability
let lastEmotion = "";
let emotionTimer = 0;
const STABILITY_THRESHOLD = 10; 

let currentMoodPlaying = null;

function playMusic(mood) {
    if (!mood || mood === currentMoodPlaying) return;
    currentMoodPlaying = mood;
    console.log(`Switching Music to: ${mood}`);

    const playerBox = document.querySelector('.player-box');
    const oldPlayer = document.getElementById('music-player');

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
    newPlayer.height = "300"; 
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
    
    if (!cameraOn) {
        startVideo();
    }
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ 
        video: {
            facingMode: "user",
            width: {ideal:320},
            height: {ideal:240}
        }
    })
    .then(stream => {
        video.srcObject = stream;
        video.play(); 
        cameraOn = true;
    })
    .catch(err => console.error("Error accessing webcam:", err));
}

function stopCamera() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    cameraOn = false;
    console.log("Camera stopped");
}

// --- Main AI Loop ---
video.addEventListener('play', () => {
    // 1. Clean up old loops
    if (detectionInterval) clearInterval(detectionInterval);

    // 2. THE FIX: Use 'parentElement' to find the wrapper automatically
    const wrapper = video.parentElement; 
    let canvas = document.getElementById('face-canvas');

    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = "face-canvas";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        // This is the line that was breaking. Now wrapper is guaranteed to exist.
        wrapper.append(canvas);
    }

    // 3. Start Loop
    detectionInterval = setInterval(async () => {
        if (!isScanning) return; 

        // --- SIZE CHECK ---
        if (video.clientWidth === 0 || video.clientHeight === 0) {
            return;
        }

        const displaySize = { 
            width: video.clientWidth, 
            height: video.clientHeight 
        };

        // Resize canvas if video size changes
        if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
            canvas.width = displaySize.width;
            canvas.height = displaySize.height;
            faceapi.matchDimensions(canvas, displaySize);
        }

        // Detect
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        // Resize Results
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Draw
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
                const safeSongName = `${currentEmotion.charAt(0).toUpperCase() + currentEmotion.slice(1)} Mix`;

                saveMoodToDatabase(currentEmotion, intensity, safeSongName);
            
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
    console.log("Saving mood:", mood);
    const now = new Date();
    const localEntry = {
        mood: mood,
        intensity: intensity,
        song_name: song,
        created_at: now.toISOString()
    };

    addToHistoryList(mood, song, now);
    if (moodChartInstance) {
        addPointToChart(localEntry); 
    } else {
        updateChart([localEntry]);
    }

    try {
        if (typeof supabaseClient !== 'undefined') {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                await supabaseClient
                    .from('mood_history')
                    .insert([{ user_id: user.id, mood: mood, intensity: intensity, song_name: song }]);
            }
        }
    } catch (err) {
        console.warn("Offline Mode:", err);
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
    chart.update();
}

function addToHistoryList(mood, song, dateObj) {
    const list = document.getElementById('mood-list');
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

async function loadMoodHistory() {
    console.log("Loading History...");
    try {
        if (typeof supabaseClient === 'undefined') { updateChart([]); return; }
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { updateChart([]); return; }
        const { data, error } = await supabaseClient
            .from('mood_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (data && data.length > 0) {
            document.getElementById('mood-list').innerHTML = ""; 
            data.forEach(item => addToHistoryList(item.mood, item.song_name, new Date(item.created_at)));
            updateChart(data); 
        } else {
            updateChart([]); 
        }
    } catch (err) {
        console.error("Chart Load Error:", err); 
        updateChart([]); 
    }
}

let moodChartInstance = null;
function updateChart(data) {
    if (typeof Chart === 'undefined' || !document.getElementById('moodChart')) return;
    const ctx = document.getElementById('moodChart').getContext('2d');
    const chartData = data ? [...data].reverse() : [];
    
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
            layout: { padding: { top: 40, left: 10, right: 20, bottom: 0 } },
            scales: {
                y: { 
                    beginAtZero: true, max: 1.0, 
                    grid: { color: '#e0e0e0', lineWidth: 2, tickLength: 0 },
                    ticks: { color: '#000', font: { family: "'Courier New', monospace", weight: 'bold' }, padding: 10 },
                    border: { display: false }
                },
                x: { 
                    grid: { display: false }, offset: true,
                    ticks: { color: '#000', font: { family: "'Courier New', monospace", size: 10 }, maxRotation: 45, minRotation: 45 }
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    enabled: true, 
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
}
loadMoodHistory();

const themeBtn = document.getElementById('theme-btn');
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});