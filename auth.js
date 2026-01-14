// intitializing supabase(database)
const supabaseUrl = 'https://hfikhcjndnjujcttlgjw.supabase.co';
const supabaseKey = 'sb_publishable_U15_tdSGE0RNV8TGiQNVVA_6SSephN7';
const supabaseClient = supabase.createClient(supabaseUrl,supabaseKey);

//implementing login function
const loginBtn = document.getElementById('google-login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        console.log("Logging in...");
        const {data,error} = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) console.error("Error:",error);
    })
}
// validation check (checking if user already logged in)
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        // user logged in
        console.log("User found:", user.email);
        // if not on dashboard, redirect user there
        if (!window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'dashboard.html';
        }
        // if on dashboard, show email
        const emailDisplay = document.getElementById('user-email');
        if (emailDisplay) {
            emailDisplay.innerText = user.email;
        }
    } 
}

// adding logout logic
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
}

checkUser();

// connecting face-scanner with database
async function saveMoodToDatabase(detectedMood,moodIntensity) {
    const { data: {user} } = await supabaseClient.auth.getUser();
    if (!user) return;
    const {data,error} = await supabaseClient.from('mood_history').insert([
        {
            user_id: user.id,
            mood: detectedMood,
            intensity: moodIntensity,
            song_name: "Youtube Guest Track"
        }
    ]);
    if (error) {
        console.log("Database Error:", error.message);
    } else {
        console.log("Mood saved to history")
    }
}