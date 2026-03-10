// --- UI ELEMENTS ---
const viewFeed = document.getElementById('viewFeed');
const viewCreate = document.getElementById('viewCreate');
const viewAuth = document.getElementById('viewAuth');
const authSection = document.getElementById('authSection');
const questContainer = document.getElementById('questContainer');

const authSubmitBtn = document.getElementById('authSubmitBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const authHeading = document.getElementById('authHeading');
const usernameField = document.getElementById('usernameField');

let isSignUpMode = true;

// --- NAVIGATION ---
document.getElementById('navCreateBtn').onclick = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        viewAuth.classList.remove('hidden');
        return;
    }
    viewCreate.classList.remove('hidden');
};

document.getElementById('closeCreateBtn').onclick = () => viewCreate.classList.add('hidden');
document.getElementById('loginBtn').onclick = () => viewAuth.classList.remove('hidden');
document.getElementById('closeAuthBtn').onclick = () => viewAuth.classList.add('hidden');

// Toggle between Login and Sign Up
toggleAuthMode.onclick = () => {
    isSignUpMode = !isSignUpMode;
    authHeading.innerText = isSignUpMode ? "Create Account" : "Welcome Back";
    authSubmitBtn.innerText = isSignUpMode ? "Sign Up" : "Log In";
    usernameField.classList.toggle('hidden', !isSignUpMode);
    toggleAuthMode.innerText = isSignUpMode ? "Already have an account? Log In" : "New here? Create Account";
};

// --- AUTH LOGIC ---
authSubmitBtn.onclick = async () => {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const username = document.getElementById('authUsername').value;

    if (isSignUpMode) {
        const { data, error } = await _supabase.auth.signUp({ email, password });
        if (error) return alert(error.message);
        
        if (data.user && username) {
            const { error: userErr } = await db.setUsername(data.user.id, username);
            if (userErr) console.error("Username error:", userErr.message);
        }
        alert("Check your email for confirmation or try logging in!");
        window.location.reload();
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else window.location.reload();
    }
};

async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        authSection.innerHTML = `
            <span class="text-xs font-bold mr-4 tracking-widest text-indigo-600 uppercase">${profile?.username || 'User'}</span>
            <button id="logoutBtn" class="text-gray-400 text-[10px] font-black uppercase tracking-widest">LOG OUT</button>
        `;
        document.getElementById('logoutBtn').onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    }
}

// --- FEED LOGIC ---
async function renderFeed() {
    const { data: quests, error } = await db.getQuests();
    if (error) return console.error(error);

    questContainer.innerHTML = "";
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
                <button onclick="handleVote('${q.id}', 'likes', ${q.likes})" class="text-xs font-bold hover:text-indigo-600 transition">👍 ${q.likes}</button>
                <button onclick="handleVote('${q.id}', 'dislikes', ${q.dislikes})" class="text-xs font-bold hover:text-red-500 transition">👎 ${q.dislikes}</button>
                <button onclick="handleBookmark('${q.id}')" class="text-[10px] ml-auto font-black uppercase tracking-widest text-indigo-600">Save Quest</button>
            </div>
        `;
        questContainer.appendChild(card);
    });
}

// --- ACTION HANDLERS ---
window.handleVote = async (id, type, current) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return viewAuth.classList.remove('hidden');
    await db.addVote(id, type, current);
    renderFeed();
};

window.handleBookmark = async (id) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return viewAuth.classList.remove('hidden');
    const { error } = await db.addBookmark(user.id, id);
    if (error) alert(error.code === '23505' ? "Already saved!" : "Error saving.");
    else alert("Saved to profile!");
};

document.getElementById('publishBtn').onclick = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    const title = document.getElementById('qTitle').value;
    const description = document.getElementById('qDesc').value;
    const is_public = document.querySelector('input[name="visibility"]:checked').value === 'public';
    
    if (user && title && description) {
        const { data: profile } = await db.getProfile(user.id);
        await db.createQuest({ 
            title, 
            description, 
            is_public, 
            user_id: user.id, 
            author_name: profile?.username || 'anonymous'
        });
        viewCreate.classList.add('hidden');
        renderFeed();
    }
};

// Start
initAuth();
renderFeed();
