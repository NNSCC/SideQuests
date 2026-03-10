document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    let isSignUpMode = false; // Default to Login

    // -- BUTTON ASSIGNMENTS --
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            alert("Login required to create a quest.");
            setAuthMode(true);
            vAuth.classList.add('active');
        } else {
            vCreate.classList.add('active');
        }
    };

    document.getElementById('loginBtn').onclick = () => {
        setAuthMode(false);
        vAuth.classList.add('active');
    };

    document.getElementById('closeAuthBtn').onclick = () => vAuth.classList.remove('active');
    document.getElementById('closeCreateBtn').onclick = () => vCreate.classList.remove('active');

    function setAuthMode(signUp) {
        isSignUpMode = signUp;
        document.getElementById('authHeading').innerText = isSignUpMode ? "Create Account" : "Welcome Back";
        document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Sign Up" : "Log In";
        document.getElementById('usernameField').classList.toggle('hidden', !isSignUpMode);
        document.getElementById('toggleAuthMode').innerText = isSignUpMode ? "Have an account? Log In" : "New here? Sign Up";
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
            alert("Success! Try logging in now.");
            setAuthMode(false);
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message);
            else window.location.reload();
        }
    };

    document.getElementById('publishBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        const title = document.getElementById('qTitle').value;
        const desc = document.getElementById('qDesc').value;
        const pub = document.querySelector('input[name="visibility"]:checked').value === 'public';
        
        if (user && title && desc) {
            const { data: profile } = await db.getProfile(user.id);
            const { error } = await db.createQuest({ 
                title, description: desc, is_public: pub, 
                user_id: user.id, author_name: profile?.username || 'anon' 
            });
            if (error) alert(error.message);
            else { vCreate.classList.remove('active'); renderFeed(); }
        }
    };
});

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    const section = document.getElementById('authSection');
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        section.innerHTML = `<span class="text-xs font-bold mr-4 text-indigo-600 uppercase">@${profile?.username || 'user'}</span><button id="logoutBtn" class="text-gray-400 text-[10px] font-black uppercase">LOG OUT</button>`;
        document.getElementById('logoutBtn').onclick = async () => { await _supabase.auth.signOut(); window.location.reload(); };
    }
}

async function renderFeed() {
    const container = document.getElementById('questContainer');
    const { data: quests, error } = await db.getQuests();
    if (error) return;
    container.innerHTML = "";
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = "quest-card p-8";
        card.innerHTML = `<div class="flex justify-between items-start mb-4"><h3 class="text-xl font-black tracking-tight">${q.title}</h3><span class="text-[10px] bg-gray-50 px-2 py-1 rounded font-bold text-gray-400 uppercase">@${q.author_name || 'anon'}</span></div><p class="text-gray-500 leading-relaxed mb-6">${q.description}</p><div class="flex gap-6 border-t border-gray-50 pt-6"><button onclick="handleVote('${q.id}', 'likes', ${q.likes})" class="text-xs font-bold">👍 ${q.likes}</button><button onclick="handleVote('${q.id}', 'dislikes', ${q.dislikes})" class="text-xs font-bold">👎 ${q.dislikes}</button><button onclick="handleBookmark('${q.id}')" class="text-[10px] ml-auto font-black text-indigo-600">SAVE</button></div>`;
        container.appendChild(card);
    });
}

window.handleVote = async (id, type, current) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');
    await db.addVote(id, type, current);
    renderFeed();
};

window.handleBookmark = async (id) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');
    const { error } = await db.addBookmark(user.id, id);
    alert(error ? "Already saved!" : "Saved!");
};
