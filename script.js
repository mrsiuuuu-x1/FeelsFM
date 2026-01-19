const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const emotionText = document.getElementById('emotion');
let cameraOn = false;
let isScanning = false;
let detectionInterval = null; 
let lastPlayedPlaylistId = null;

// Variables for stability
let lastEmotion = "";
let emotionTimer = 0;
const STABILITY_THRESHOLD = 0.7; 

let currentMoodPlaying = null;

function playMusic(mood) {
    if (!mood) return; 

    // 1. DEFINE PLAYLISTS WITH NAMES
    // We use objects {id: '...', name: '...'} so we can log the name later
    const playlists = {
        'happy': [
            { id: '1479458365', name: 'Pop Hits' },
            { id: '7534956142', name: 'Feel Good Indie' },
            { id: '8821741782', name: '100 Happy Songs' },
            { id: '5335352662', name: 'Good Vibes Only' }
        ],
        'sad': [
            { id: '1911533742', name: 'Sad Hours' },
            { id: '1353437215', name: 'Acoustic Ballads' },
            { id: '1290315385', name: 'Broken Heart' }
        ],
        'angry': [
            { id: '2098157264', name: 'Metal Essentials' },
            { id: '10659124',   name: 'Heavy Metal' },
            { id: '5878848462', name: 'Gym Phonk' }
        ],
        'surprised': [
             { id: '1282495565', name: 'Viral Hits' }
        ],
        'fearful':   [
             { id: '2328226062', name: 'Dark Ambient' }
        ],
        'disgusted': [
             { id: '5243326682', name: 'Grime & Bass' }
        ],
        'neutral':   [
            { id: '3110429622', name: 'Lofi Beats' },
            { id: '1976454162', name: 'Chill Hits' },
            { id: '7065984624', name: 'Study Mode' }
        ]
    };

    // 2. GET POOL
    let pool = playlists[mood] || playlists['neutral'];

    // 3. SMART FILTER (Avoid Repeats)
    // Note: We check .id now because our items are objects
    let candidates = pool.filter(item => item.id !== lastPlayedPlaylistId);
    if (candidates.length === 0) candidates = pool;

    // 4. PICK RANDOM
    const selection = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Save for next time
    lastPlayedPlaylistId = selection.id; 

    console.log(`Playing: ${selection.name} (${selection.id})`);

    // 6. UPDATE PLAYER UI
    const playerBox = document.querySelector('.player-box');
    const oldPlayer = document.getElementById('music-player');
    const placeholder = document.getElementById('music-placeholder');

    const newPlayer = document.createElement('iframe');
    newPlayer.id = 'music-player';
    newPlayer.title = "Deezer Player";
    newPlayer.width = "100%";
    newPlayer.height = "150"; 
    newPlayer.frameBorder = "0";
    newPlayer.allowTransparency = "true";
    newPlayer.style.border = "none";
    newPlayer.style.display = "block";
    newPlayer.allow = "autoplay; encrypted-media; clipboard-write";
    
    newPlayer.src = `https://widget.deezer.com/widget/dark/playlist/${selection.id}?autoplay=true&radius=0`;

    if (placeholder) placeholder.style.display = 'none';
    if (oldPlayer) oldPlayer.replaceWith(newPlayer);
    else playerBox.appendChild(newPlayer);
    return selection.name;
}

// --- Face API Models ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(async () => {
    startBtn.innerText = "Start Camera";
    startBtn.disabled = false;
    console.log("Models Loaded");

    //warming up the AI
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 1;
    dummyCanvas.height = 1;
    try {
        await faceapi.detectAllFaces(dummyCanvas,new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
        console.log("Ai warmed up and ready");
    } catch (e) {
        console.log("warmup skipped (minor)");
    }
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

        // hiding placeholder
        const placeholder = document.getElementById('camera-placeholder');
        if (placeholder) placeholder.style.display = 'none';
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
    // Clean up old loops
    if (detectionInterval) clearInterval(detectionInterval);

    // THE FIX: Use 'parentElement' to find the wrapper automatically
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
        wrapper.append(canvas);
    }

    detectionInterval = setInterval(async () => {
        if (!isScanning) return; 

        if (video.clientWidth === 0 || video.clientHeight === 0) {
            return;
        }

        const displaySize = { 
            width: video.clientWidth, 
            height: video.clientHeight 
        };

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
                
                const specificSongName = playMusic(currentEmotion); 
                const intensity = expressions[highestEmotion];
                saveMoodToDatabase(currentEmotion, intensity, specificSongName);
            
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

// RECIEPT PRINTER LOGIC
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-btn');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', () => {
        if (typeof html2canvas === 'undefined') {
            alert("Error: html2canvas library is not loaded.");
            return;
        }

        const now = new Date();
        const historyList = document.getElementById('mood-list');
        
        let finalMood = document.getElementById('emotion').innerText.replace('MOOD: ', '').trim();
        let currentSong = "NO AUDIO";

        if (finalMood.includes('WAITING') || finalMood.includes('SCANNING') || finalMood === "") {
            if (historyList && historyList.firstElementChild) {
                const moodSpan = historyList.firstElementChild.querySelector('span'); 
                if (moodSpan) {
                    finalMood = moodSpan.innerText.replace(/[^\w\s]/gi, '').trim(); 
                }
            }
        }
        if (finalMood.includes('WAITING') || finalMood === "") finalMood = "MYSTERY";

        if (historyList && historyList.firstElementChild) {
            const allText = historyList.firstElementChild.innerText;
            const parts = allText.split('\n');
            if (parts.length >= 2) {
                currentSong = parts[1].trim(); 
            } else {
                 currentSong = parts[0].trim();
            }
        }

        const dateSpan = document.getElementById('receipt-date');
        const timeSpan = document.getElementById('receipt-time');
        const moodSpan = document.getElementById('receipt-mood');
        const songSpan = document.getElementById('receipt-song');

        if(dateSpan) dateSpan.innerText = now.toLocaleDateString();
        if(timeSpan) timeSpan.innerText = now.toLocaleTimeString();
        if(moodSpan) moodSpan.innerText = `MOOD: ${finalMood.toUpperCase()}`;
        if(songSpan) songSpan.innerText = currentSong.substring(0, 25);

        const receiptContainer = document.getElementById('receipt-container');
        receiptContainer.style.top = "0";
        receiptContainer.style.left = "0";
        receiptContainer.style.zIndex = "-999"; 

        html2canvas(receiptContainer, { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `FEELSFM_RECEIPT_${now.getTime()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();

            receiptContainer.style.top = "-9999px";
            receiptContainer.style.left = "-9999px";
        }).catch(err => {
            console.error(err);
        });
    });
});