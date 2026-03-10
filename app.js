document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    let isSignUpMode = false;

    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) { setAuthMode(true); vAuth.classList.add('active'); }
        else vCreate.classList.add('active');
    };

    document.getElementById('loginBtn').onclick = () => { setAuthMode(false); vAuth.classList.add('active'); };

    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => { vAuth.classList.remove('active'); vCreate.classList.remove('active'); };
    });

    function setAuthMode(signUp) {
        isSignUpMode = signUp;
        document.getElementById('authHeading').innerText = signUp ? "Sign Up" : "Login";
        document.getElementById('usernameField').style.display = signUp ? "block" : "none";
        document.getElementById('toggleAuthMode').innerText = signUp ? "Back to Login" : "Need an account? Sign Up";
    }

    document.getElementById('toggleAuthMode').onclick = () => setAuthMode(!isSignUpMode);

    document.getElementById('authSubmitBtn').onclick = async () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        if (isSignUpMode) {
            await _supabase.auth.signUp({ email, password });
            alert("Check email!");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message); else window.location.reload();
        }
    };

    document.getElementById('publishBtn').onclick = async () => {
        const title = document.getElementById('qTitle').value;
        const desc = document.getElementById('qDesc').value;
        const { data: { user } } = await _supabase.auth.getUser();
        if (user && title && desc) {
            await db.createQuest({ title, description: desc, user_id: user.id });
            vCreate.classList.remove('active');
            renderFeed();
        }
    };
});

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        document.getElementById('authSection').innerHTML = `<button id="logoutBtn" class="text-[10px] font-black uppercase text-indigo-600">@${profile?.username || 'User'} (Logout)</button>`;
        document.getElementById('logoutBtn').onclick = () => { _supabase.auth.signOut(); window.location.reload(); };
    }
}

async function renderFeed() {
    const container = document.getElementById('questContainer');
    const { data: quests } = await db.getQuests();
    container.innerHTML = "";
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = "quest-card p-8";
        card.innerHTML = `<h3 class="text-xl font-black mb-2">${q.title}</h3><p class="text-gray-500 mb-6">${q.description}</p><div class="flex gap-4 border-t pt-4"><button onclick="handleVote('${q.id}', 'likes')" class="text-xs font-bold">👍 ${q.likes}</button><button onclick="handleVote('${q.id}', 'dislikes')" class="text-xs font-bold">👎 ${q.dislikes}</button></div>`;
        container.appendChild(card);
    });
}

window.handleVote = async (id, type) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');
    const { data: q } = await _supabase.from('quests').select('likes, dislikes').eq('id', id).single();
    let updates = { [type]: q[type] + 1 };
    await _supabase.from('quests').update(updates).eq('id', id);
    renderFeed();
};
