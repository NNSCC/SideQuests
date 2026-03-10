document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    let isSignUpMode = false;

    // -- OPEN OVERLAYS --
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

    // -- CLOSE OVERLAYS (BACK BUTTONS) --
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => {
            vAuth.classList.remove('active');
            vCreate.classList.remove('active');
        };
    });

    // -- AUTH MODE LOGIC --
    function setAuthMode(signUp) {
        isSignUpMode = signUp;
        document.getElementById('authHeading').innerText = isSignUpMode ? "Create Account" : "Welcome Back";
        document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Sign Up" : "Log In";
        document.getElementById('usernameField').classList.toggle('hidden', !isSignUpMode);
        document.getElementById('toggleAuthMode').innerText = isSignUpMode ? "Have an account? Log In" : "New here? Sign Up";
    }

    document.getElementById('toggleAuthMode').onclick = () => setAuthMode(!isSignUpMode);

    // -- AUTH SUBMIT --
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

    // -- PUBLISH QUEST --
    document.getElementById('publishBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        const title = document.getElementById('qTitle').value;
        const desc = document.getElementById('qDesc').value;
        const isPub = document.querySelector('input[name="visibility"]:checked').value === 'public';
        
        if (user && title && desc) {
            const { data: profile } = await db.getProfile(user.id);
            const { error } = await db.createQuest({ 
                title, description: desc, is_public: isPub, 
                user_id: user.id, author_name: profile?.username || 'anon' 
            });
            if (error) alert(error.message);
            else { vCreate.classList.remove('active'); renderFeed(); }
        }
    };
});

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const section = document.getElementById('authSection');
        section.innerHTML = `<span class="text-xs font-bold mr-4 text-indigo-600 uppercase">@${profile?.username || 'user'}</span><button id="logoutBtn" class="text-gray-400 text-[10px] font-black uppercase tracking-tighter">LOG OUT</button>`;
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
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-black tracking-tight">${q.title}</h3>
                <span class="text-[10px] bg-gray-50 px-2 py-1 rounded font-bold text-gray-400 uppercase">@${q.author_name || 'anon'}</span>
            </div>
            <p class="text-gray-500 leading-relaxed mb-6">${q.description}</p>
            <div class="flex gap-6 border-t border-gray-50 pt-6">
                <button onclick="handleVote('${q.id}', 'likes')" class="text-xs font-bold hover:text-indigo-600 transition-colors">👍 ${q.likes}</button>
                <button onclick="handleVote('${q.id}', 'dislikes')" class="text-xs font-bold hover:text-red-500 transition-colors">👎 ${q.dislikes}</button>
                <button onclick="handleBookmark('${q.id}')" class="text-[10px] ml-auto font-black text-indigo-600">SAVE</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// -- UPDATED VOTING LOGIC (LIKE/DISLIKE TOGGLE) --
window.handleVote = async (id, type) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');

    const storageKey = `vote_${user.id}_${id}`;
    const previousVote = localStorage.getItem(storageKey);

    const { data: quest } = await _supabase.from('quests').select('likes, dislikes').eq('id', id).single();
    let updates = { likes: quest.likes, dislikes: quest.dislikes };

    if (previousVote === type) {
        // Undo vote
        updates[type] = Math.max(0, updates[type] - 1);
        localStorage.removeItem(storageKey);
    } else {
        // Swap or New vote
        if (previousVote) updates[previousVote] = Math.max(0, updates[previousVote] - 1);
        updates[type]++;
        localStorage.setItem(storageKey, type);
    }

    await _supabase.from('quests').update(updates).eq('id', id);
    renderFeed();
};

window.handleBookmark = async (id) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');
    const { error } = await db.addBookmark(user.id, id);
    alert(error ? "Already saved!" : "Saved!");
};
