document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    const vAccount = document.getElementById('viewAccount');
    let isSignUpMode = false;

    // --- OVERLAY CONTROLS ---
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            setAuthMode(true);
            vAuth.classList.add('active');
        } else {
            vCreate.classList.add('active');
        }
    };

    // Global Back Button Logic (Fixed)
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => {
            vAuth.classList.remove('active');
            vCreate.classList.remove('active');
        };
    });

    document.getElementById('closeAccountBtn').onclick = () => vAccount.classList.remove('active');

    // --- AUTH LOGIC (Fixed) ---
    function setAuthMode(signUp) {
        isSignUpMode = signUp;
        document.getElementById('authHeading').innerText = signUp ? "Sign Up" : "Login";
        document.getElementById('authSubmitBtn').innerText = signUp ? "Create Account" : "Welcome Back";
        document.getElementById('usernameField').classList.toggle('hidden', !signUp);
        document.getElementById('toggleAuthMode').innerText = signUp ? "Have an account? Log In" : "New here? Sign Up";
    }

    document.getElementById('toggleAuthMode').onclick = () => setAuthMode(!isSignUpMode);

    document.getElementById('authSubmitBtn').onclick = async () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const username = document.getElementById('authUsername').value;

        if (isSignUpMode) {
            const { data, error } = await _supabase.auth.signUp({ email, password });
            if (error) return alert(error.message);
            if (data.user && username) await db.setUsername(data.user.id, username);
            alert("Check your email for the confirmation link!");
            setAuthMode(false);
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message);
            else window.location.reload();
        }
    };

    // --- DEBUG ACTIONS ---
    document.getElementById('debugResetVotes').onclick = async () => {
        if(confirm("Reset all likes/dislikes?")) {
            await _supabase.from('quests').update({ likes: 0, dislikes: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
            renderFeed();
        }
    };

    document.getElementById('debugDeleteAll').onclick = async () => {
        if(confirm("DELETE EVERYTHING?")) {
            await _supabase.from('quests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            renderFeed();
        }
    };
});

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authSection = document.getElementById('authSection');

    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const username = profile?.username || 'User';
        
        authSection.innerHTML = `
            <button id="userProfileBtn" class="bg-black text-white px-5 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-all active:scale-95">
                @${username.toUpperCase()}
            </button>
        `;

        document.getElementById('userProfileBtn').onclick = () => openAccount(user, username);

        if (user.email === 'rkormen80@nn.k12.in.us') {
            document.getElementById('debugMenu').classList.remove('hidden');
        }

        document.getElementById('logoutBtn').onclick = async (e) => {
            e.preventDefault();
            await _supabase.auth.signOut();
            window.location.reload();
        };
    } else {
        // Ensure Login button works when logged out
        authSection.innerHTML = `
            <button id="loginBtn" class="bg-black text-white px-5 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-all active:scale-95">
                Log In
            </button>
        `;
        document.getElementById('loginBtn').onclick = () => {
            document.getElementById('viewAuth').classList.add('active');
        };
    }
}

async function openAccount(user, username) {
    document.getElementById('accUsername').innerText = `@${username}`;
    document.getElementById('viewAccount').classList.add('active');
    
    const container = document.getElementById('userQuestsContainer');
    container.innerHTML = `<p class="text-xs font-bold text-gray-300 animate-pulse">Loading history...</p>`;
    
    const { data: quests } = await _supabase.from('quests').select('*').eq('user_id', user.id);
    
    container.innerHTML = quests.length ? "" : `<p class="text-sm text-gray-400 py-10">No quests posted yet.</p>`;
    quests.forEach(q => {
        const item = document.createElement('div');
        item.className = "p-5 bg-gray-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-indigo-100 transition-all";
        item.innerHTML = `<span class="font-bold text-sm">${q.title}</span><span class="text-[10px] font-black text-indigo-400">👍 ${q.likes}</span>`;
        container.appendChild(item);
    });
}
