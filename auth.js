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
        console.log("User is logged in:", user.email);
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        console.log("No user is logged in.");
    }
}

checkUser();