const supabaseUrl = 'https://hfikhcjndnjujcttlgjw.supabase.co'; 
const supabaseKey = 'sb_publishable_U15_tdSGE0RNV8TGiQNVVA_6SSephN7';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- LOGIN LOGIC ---
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

// --- LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        //Clear Guest Ticket
        localStorage.removeItem('guestMode'); 

        //Sign out of Supabase (just in case)
        const { error } = await supabaseClient.auth.signOut();
        
        //Go back to Login
        window.location.href = 'login.html';
    });
}

// --- 3. AUTH GUARD (For dashboard.html) ---
// This checks if the user is actually logged in. If not, kicks them out.
if (window.location.pathname.includes('dashboard.html')) {
    checkSession();
}

async function checkSession() {
    console.log("Checking session...");

    //CHECK FOR GUEST TICKET 
    const isGuest = localStorage.getItem('guestMode') === 'true';

    if (isGuest) {
        console.log("Guest Access Granted");
        
        // Update UI
        const emailSpan = document.getElementById('user-email');
        if (emailSpan) {
            emailSpan.innerText = "Guest User";
        }
        
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        console.warn("No Session & No Guest Ticket. Kicking out.");
        window.location.href = 'login.html';
    } else {
        const emailSpan = document.getElementById('user-email');
        if (emailSpan) {
            emailSpan.innerText = session.user.email;
        }
        console.log("Logged in as:", session.user.email);
    }
}