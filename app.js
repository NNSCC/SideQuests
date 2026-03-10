document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    let isSignUpMode = false;

    // --- BUTTONS ---
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
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

    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => {
            vAuth.classList.remove('active');
            vCreate.classList.remove('active');
        };
    });

    // --- AUTH ---
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
            alert("Verification sent! Check your email.");
            setAuthMode(false);
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message);
            else window.location.reload();
        }
    };

    // --- PUBLISH ---
    document.getElementById('publishBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        const title = document.getElementById('qTitle').value;
        const desc = document.getElementById('qDesc').value;
        
        if (user && title && desc) {
            const { data: profile } = await db.getProfile(user.id);
            await db.createQuest({ 
                title, description: desc, is_public: true, 
                user_id: user.id, author_name: profile?.username || 'anon' 
            });
            vCreate.classList.remove('active');
            renderFeed();
        }
    };
});

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const section = document.getElementById('authSection');
        section.innerHTML = `
            <span class="text-[10px] font-black uppercase text-indigo-600 self-center">@${profile?.username || 'user'}</span>
            <button id="logoutBtn" class="text-[10px] font-black uppercase text-gray-300 hover:text-black">OUT</button>
        `;
        document.getElementById('logoutBtn').onclick = async () => { 
            await _supabase.auth.signOut(); 
            window.location.reload(); 
        };
    }
}

async function renderFeed() {
    const container = document.getElementById('questContainer');
    const { data: quests, error } = await db.getQuests();
    if (error) return;
    
    container.innerHTML = "";
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = "quest-card";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-black tracking-tight">${q.title}</h3>
                <span class="text-[9px] bg-gray-50 px-2 py-1 rounded font-black text-gray-400 uppercase tracking-widest">@${q.author_name || 'anon'}</span>
            </div>
            <p class="text-gray-500 leading-relaxed mb-6">${q.description}</p>
            <div class="flex gap-6 border-t border-gray-50 pt-6">
                <button onclick="handleVote('${q.id}', 'likes')" class="text-xs font-bold hover:text-indigo-600 transition">👍 ${q.likes}</button>
                <button onclick="handleVote('${q.id}', 'dislikes')" class="text-xs font-bold hover:text-red-500 transition">👎 ${q.dislikes}</button>
                <button onclick="handleBookmark('${q.id}')" class="text-[10px] ml-auto font-black text-indigo-600 uppercase">Save</button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.handleVote = async (id, type) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');

    const key = `v_${user.id}_${id}`;
    const prev = localStorage.getItem(key);
    const { data: q } = await _supabase.from('quests').select('likes, dislikes').eq('id', id).single();
    let up = { likes: q.likes, dislikes: q.dislikes };

    if (prev === type) { 
        up[type] = Math.max(0, up[type] - 1); 
        localStorage.removeItem(key); 
    } else {
        if (prev) up[prev] = Math.max(0, up[prev] - 1);
        up[type]++;
        localStorage.setItem(key, type);
    }
    await _supabase.from('quests').update(up).eq('id', id);
    renderFeed();
};

window.handleBookmark = async (id) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');
    const { error } = await db.addBookmark(user.id, id);
    alert(error ? "Already saved." : "Saved to log.");
};
