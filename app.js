window.onload = () => {
    initAuth();
    renderFeed();

    // -- NAV GATING --
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            alert("Please login to create a quest.");
            document.getElementById('viewAuth').classList.remove('hidden');
        } else {
            document.getElementById('viewCreate').classList.remove('hidden');
        }
    };

    document.getElementById('loginBtn').onclick = () => document.getElementById('viewAuth').classList.remove('hidden');
    document.getElementById('closeAuthBtn').onclick = () => document.getElementById('viewAuth').classList.add('hidden');
    document.getElementById('closeCreateBtn').onclick = () => document.getElementById('viewCreate').classList.add('hidden');

    // -- AUTH TOGGLE --
    let isSignUpMode = true;
    document.getElementById('toggleAuthMode').onclick = () => {
        isSignUpMode = !isSignUpMode;
        document.getElementById('authHeading').innerText = isSignUpMode ? "Create Account" : "Welcome Back";
        document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Sign Up" : "Log In";
        document.getElementById('usernameField').classList.toggle('hidden', !isSignUpMode);
    };

    // -- AUTH SUBMIT --
    document.getElementById('authSubmitBtn').onclick = async () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const username = document.getElementById('authUsername').value;

        if (isSignUpMode) {
            const { data, error } = await _supabase.auth.signUp({ email, password });
            if (error) return alert(error.message);
            if (data.user && username) await db.setUsername(data.user.id, username);
            alert("Signup successful! Check email or try logging in.");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message);
        }
        window.location.reload();
    };

    // -- PUBLISH --
    document.getElementById('publishBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        const title = document.getElementById('qTitle').value;
        const description = document.getElementById('qDesc').value;
        const is_public = document.querySelector('input[name="visibility"]:checked').value === 'public';
        
        if (user && title && description) {
            const { data: profile } = await db.getProfile(user.id);
            await db.createQuest({ title, description, is_public, user_id: user.id, author_name: profile?.username || 'anon' });
            document.getElementById('viewCreate').classList.add('hidden');
            renderFeed();
        }
    };
};

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const section = document.getElementById('authSection');
        section.innerHTML = `<span class="text-xs font-bold mr-4 text-indigo-600 tracking-widest uppercase">${profile?.username || 'User'}</span><button id="logoutBtn" class="text-gray-400 text-[10px] font-black uppercase tracking-widest">LOG OUT</button>`;
        document.getElementById('logoutBtn').onclick = async () => { await _supabase.auth.signOut(); window.location.reload(); };
    }
}

async function renderFeed() {
    const container = document.getElementById('questContainer');
    const { data: quests, error } = await db.getQuests();
    if (error) return console.error(error);
    container.innerHTML = "";
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = "quest-card p-8";
        card.innerHTML = `<div class="flex justify-between items-start mb-4"><h3 class="text-xl font-black tracking-tight">${q.title}</h3><span class="text-[10px] bg-gray-50 px-2 py-1 rounded font-bold text-gray-400 uppercase tracking-widest">@${q.author_name || 'anon'}</span></div><p class="text-gray-500 leading-relaxed mb-6">${q.description}</p><div class="flex gap-6 border-t border-gray-50 pt-6"><button onclick="handleVote('${q.id}', 'likes', ${q.likes})" class="text-xs font-bold hover:text-indigo-600 transition">👍 ${q.likes}</button><button onclick="handleVote('${q.id}', 'dislikes', ${q.dislikes})" class="text-xs font-bold hover:text-red-500 transition">👎 ${q.dislikes}</button><button onclick="handleBookmark('${q.id}')" class="text-[10px] ml-auto font-black uppercase tracking-widest text-indigo-600">Save Quest</button></div>`;
        container.appendChild(card);
    });
}

window.handleVote = async (id, type, current) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.remove('hidden');
    await db.addVote(id, type, current);
    renderFeed();
};

window.handleBookmark = async (id) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.remove('hidden');
    const { error } = await db.addBookmark(user.id, id);
    alert(error ? (error.code === '23505' ? "Already saved!" : "Error saving.") : "Saved!");
};
