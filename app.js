document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    const vAccount = document.getElementById('viewAccount');
    let isSignUpMode = false;

    // --- NAVIGATION ---
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) { setAuthMode(true); vAuth.classList.add('active'); }
        else vCreate.classList.add('active');
    };

    document.getElementById('loginBtn').onclick = () => { setAuthMode(false); vAuth.classList.add('active'); };

    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => { vAuth.classList.remove('active'); vCreate.classList.remove('active'); };
    });

    document.getElementById('closeAccountBtn').onclick = () => vAccount.classList.remove('active');

    // --- AUTH LOGIC ---
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

    // --- MOD TOOLS ---
    document.getElementById('modResetVotes').onclick = async () => {
        if(!confirm("Reset all likes/dislikes?")) return;
        await _supabase.from('quests').update({ likes: 0, dislikes: 0 }).neq('title', '');
        renderFeed();
    };

    document.getElementById('modDeleteAll').onclick = async () => {
        if(!confirm("DELETE EVERY QUEST?")) return;
        await _supabase.from('quests').delete().neq('title', '');
        renderFeed();
    };
});

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const userBtn = document.getElementById('loginBtn');
        userBtn.innerText = `@${profile?.username || 'USER'}`;
        userBtn.onclick = () => openAccount(user, profile?.username);

        if (user.email === 'rkormen80@nn.k12.in.us') {
            document.getElementById('modSection').classList.remove('hidden');
        }
        
        document.getElementById('logoutBtn').onclick = async () => { 
            await _supabase.auth.signOut(); 
            window.location.reload(); 
        };
    }
}

async function openAccount(user, name) {
    document.getElementById('accUsername').innerText = `@${name || 'USER'}`;
    document.getElementById('viewAccount').classList.add('active');
    const container = document.getElementById('userQuestsContainer');
    container.innerHTML = `<p class="text-xs font-bold text-gray-300">Fetching history...</p>`;
    
    const { data: quests } = await _supabase.from('quests').select('*').eq('user_id', user.id);
    container.innerHTML = quests.length ? "" : `<p class="text-sm text-gray-400">No quests yet.</p>`;
    quests.forEach(q => {
        const div = document.createElement('div');
        div.className = "p-4 bg-gray-50 rounded-2xl flex justify-between items-center";
        div.innerHTML = `<span class="font-bold text-sm">${q.title}</span><span class="text-[10px] font-black text-indigo-400">👍 ${q.likes}</span>`;
        container.appendChild(div);
    });
}

async function renderFeed() {
    const container = document.getElementById('questContainer');
    const { data: quests, error } = await db.getQuests();
    if (error) return;
    container.innerHTML = "";
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = "quest-card p-8";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-black tracking-tight">${q.title}</h3>
                <span class="text-[9px] bg-gray-50 px-2 py-1 rounded font-black text-gray-400 uppercase tracking-widest">@${q.author_name || 'anon'}</span>
            </div>
            <p class="text-gray-500 leading-relaxed mb-6">${q.description}</p>
            <div class="flex gap-6 border-t border-gray-50 pt-6">
                <button onclick="handleVote('${q.id}', 'likes')" class="text-xs font-bold transition hover:text-indigo-600">👍 ${q.likes}</button>
                <button onclick="handleVote('${q.id}', 'dislikes')" class="text-xs font-bold transition hover:text-red-500">👎 ${q.dislikes}</button>
                <button onclick="handleBookmark('${q.id}')" class="text-[10px] ml-auto font-black text-indigo-600 uppercase tracking-widest">Save</button>
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

    if (prev === type) { up[type] = Math.max(0, up[type] - 1); localStorage.removeItem(key); }
    else {
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
    alert(error ? "Already saved." : "Saved!");
};
