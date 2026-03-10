// --- UI ELEMENTS ---
const viewFeed = document.getElementById('viewFeed');
const viewCreate = document.getElementById('viewCreate');
const authSection = document.getElementById('authSection');
const questContainer = document.getElementById('questContainer');

// --- AUTH HANDLERS ---
async function initAuth() {
    const { data: { user } } = await _supabase.auth.getUser();
    updateAuthUI(user);
}

function updateAuthUI(user) {
    if (user) {
        authSection.innerHTML = `
            <span class="text-sm font-bold mr-4">${user.user_metadata.full_name || 'CEO'}</span>
            <button id="logoutBtn" class="text-gray-400 text-sm">Log Out</button>
        `;
        document.getElementById('logoutBtn').onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    }
}

document.getElementById('loginBtn').onclick = async () => {
    await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
};

// --- NAVIGATION ---
document.getElementById('navCreateBtn').onclick = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Log in to create a quest!");
    viewCreate.classList.remove('hidden');
};

document.getElementById('closeCreateBtn').onclick = () => viewCreate.classList.add('hidden');

// --- FEED LOGIC ---
async function renderFeed() {
    const { data: quests, error } = await db.getQuests();
    if (error) return console.error(error);

    questContainer.innerHTML = "";
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = "quest-card p-6 rounded-2xl shadow-sm";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-lg font-bold">${q.title}</h3>
                <span class="text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-500">By ${q.author_name || 'Anonymous'}</span>
            </div>
            <p class="text-gray-600 mb-4">${q.description}</p>
            <div class="flex gap-4 border-t pt-4">
                <button onclick="handleVote('${q.id}', 'likes', ${q.likes})" class="text-sm hover:text-indigo-600">👍 ${q.likes}</button>
                <button onclick="handleVote('${q.id}', 'dislikes', ${q.dislikes})" class="text-sm hover:text-red-600">👎 ${q.dislikes}</button>
                <button onclick="handleBookmark('${q.id}')" class="text-sm ml-auto text-indigo-600 font-medium">🔖 Save</button>
            </div>
        `;
        questContainer.appendChild(card);
    });
}

// --- ACTIONS ---
window.handleVote = async (id, type, current) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Log in to vote!");
    await db.addVote(id, type, current);
    renderFeed();
};

window.handleBookmark = async (id) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Log in to save!");
    const { error } = await db.addBookmark(user.id, id);
    if (error) alert(error.code === '23505' ? "Already saved!" : "Error saving.");
    else alert("Saved to profile!");
};

document.getElementById('publishBtn').onclick = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    const title = document.getElementById('qTitle').value;
    const description = document.getElementById('qDesc').value;
    const is_public = document.querySelector('input[name="visibility"]:checked').value === 'public';

    if (title && description) {
        await db.createQuest({ 
            title, description, is_public, 
            user_id: user.id, 
            author_name: user.user_metadata.full_name 
        });
        viewCreate.classList.add('hidden');
        renderFeed();
    }
};

// Start the app
initAuth();
renderFeed();
