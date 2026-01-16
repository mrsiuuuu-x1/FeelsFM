// --- CONFIGURATION ---
// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS FROM YOUR PROJECT
const supabaseUrl = 'https://hfikhcjndnjujcttlgjw.supabase.co'; 
const supabaseKey = 'sb_publishable_U15_tdSGE0RNV8TGiQNVVA_6SSephN7';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 1. LOGIN LOGIC (For login.html) ---
const loginBtn = document.getElementById('google-login-btn');

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        console.log("Initiating Google Login...");

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // FORCE redirect to dashboard.html
                redirectTo: window.location.origin + '/dashboard.html' 
            }
        });

        if (error) {
            console.error("Login Error:", error.message);
            alert("Login failed: " + error.message);
        }
    });
}

// --- 2. LOGOUT LOGIC (For dashboard.html) ---
const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error("Logout Error:", error);
        } else {
            // Redirect to Login page after logout
            window.location.href = 'login.html';
        }
    });
}

// --- 3. AUTH GUARD (For dashboard.html) ---
// This checks if the user is actually logged in. If not, kicks them out.
if (window.location.pathname.includes('dashboard.html')) {
    checkSession();
}

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // No user found? Go back to login!
        window.location.href = 'login.html';
    } else {
        // User found? Update the UI
        const emailSpan = document.getElementById('user-email');
        if (emailSpan) {
            emailSpan.innerText = session.user.email;
        }
        console.log("Logged in as:", session.user.email);
    }
}