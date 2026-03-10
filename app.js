window.onload = () => {
    initAuth();
    renderFeed();

    const viewAuth = document.getElementById('viewAuth');
    const viewCreate = document.getElementById('viewCreate');
    let isSignUpMode = true;

    // -- NAV GATING --
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            // Force Sign Up mode for new users from the Create button
            setAuthMode(true);
            viewAuth.classList.add('active');
        } else {
            viewCreate.classList.add('active');
        }
    };

    document.getElementById('loginBtn').onclick = () => {
        setAuthMode(false); // Force Login mode
        viewAuth.classList.add('active');
    };

    document.getElementById('closeAuthBtn').onclick = () => viewAuth.classList.remove('active');
    document.getElementById('closeCreateBtn').onclick = () => viewCreate.classList.remove('active');

    // -- AUTH TOGGLE FUNCTION --
    function setAuthMode(signUp) {
        isSignUpMode = signUp;
        document.getElementById('authHeading').innerText = isSignUpMode ? "Create Account" : "Welcome Back";
        document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Sign Up" : "Log In";
        document.getElementById('usernameField').classList.toggle('hidden', !isSignUpMode);
        document.getElementById('toggleAuthMode').innerText = isSignUpMode ? "Already have an account? Log In" : "New here? Create Account";
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
            alert("Signup successful! You can now log in.");
            setAuthMode(false);
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message);
            else window.location.reload();
        }
    };

    // -- PUBLISH --
    document.getElementById('publishBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        const title = document.getElementById('qTitle').value;
        const description = document.getElementById('qDesc').value;
        const is_public = document.querySelector('input[name="visibility"]:checked').value === 'public';
        
        if (user && title && description) {
            const { data: profile } = await db.getProfile(user.id);
            const { error } = await db.createQuest({ 
                title, 
                description, 
                is_public, 
                user_id: user.id, 
                author_name: profile?.username || 'anon' 
            });
            
            if (error) alert(error.message);
            else {
                viewCreate.classList.remove('active');
                renderFeed();
            }
        }
    };
};

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const section = document.getElementById('authSection');
        section.innerHTML = `
            <span class="text-xs font-bold mr-4 text-indigo-600 tracking-widest uppercase">${profile?.username || 'User'}</span>
            <button id="logoutBtn" class="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors">LOG OUT</button>
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
    if (error) return console.error(error);
    container.innerHTML = "";
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = "quest-card p-8";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-black tracking-tight">${q.title}</h3>
                <span class="text-[10px] bg-gray-50 px-2 py-1 rounded font-bold text-gray-400 uppercase tracking-widest">@${q.author_name || 'anon'}</span>
            </div>
            <p class="text-gray-500 leading-relaxed mb-6">${q.description}</p>
            <div class="flex gap-6 border-t border-gray-50 pt-6">
                <button onclick="handleVote('${q.id}', 'likes', ${q.likes})" class="text-xs font-bold hover:text-indigo-600 transition-colors">👍 ${q.likes}</button>
                <button onclick="handleVote('${q.id}', 'dislikes', ${q.dislikes})" class="text-xs font-bold hover:text-red-500 transition-colors">👎 ${q.dislikes}</button>
                <button onclick="handleBookmark('${q.id}')" class="text-[10px] ml-auto font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">Save Quest</button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.handleVote = async (id, type, current) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Log in to vote!");
        document.getElementById('viewAuth').classList.add('active');
        return;
    }
    await db.addVote(id, type, current);
    renderFeed();
};

window.handleBookmark = async (id) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Log in to save!");
        document.getElementById('viewAuth').classList.add('active');
        return;
    }
    const { error } = await db.addBookmark(user.id, id);
    alert(error ? (error.code === '23505' ? "Already saved!" : "Error saving.") : "Saved!");
};
