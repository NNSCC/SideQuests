document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    const vAccount = document.getElementById('viewAccount');

    // --- NAVIGATION & OVERLAYS ---
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) vAuth.classList.add('active');
        else vCreate.classList.add('active');
    };

    document.getElementById('closeAccountBtn').onclick = () => vAccount.classList.remove('active');

    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => {
            vAuth.classList.remove('active');
            vCreate.classList.remove('active');
        };
    });

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
    const authBtn = document.getElementById('loginBtn');

    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const username = profile?.username || 'User';
        
        // Change "Log In" to the Username
        authBtn.innerText = `@${username.toUpperCase()}`;
        authBtn.onclick = () => openAccount(user, username);

        // Show Debug if it's you
        if (user.email === 'rkormen80@nn.k12.in.us') {
            document.getElementById('debugMenu').classList.remove('hidden');
        }

        document.getElementById('logoutBtn').onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    } else {
        authBtn.onclick = () => document.getElementById('viewAuth').classList.add('active');
    }
}

async function openAccount(user, username) {
    document.getElementById('accUsername').innerText = `@${username}`;
    document.getElementById('viewAccount').classList.add('active');
    
    const container = document.getElementById('userQuestsContainer');
    container.innerHTML = `<p class="text-xs font-bold text-gray-300 animate-pulse">Loading your history...</p>`;
    
    const { data: quests } = await _supabase.from('quests').select('*').eq('user_id', user.id);
    
    container.innerHTML = quests.length ? "" : `<p class="text-sm text-gray-400 py-10">You haven't posted any quests yet.</p>`;
    quests.forEach(q => {
        const item = document.createElement('div');
        item.className = "p-5 bg-gray-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-indigo-100 transition-all";
        item.innerHTML = `<span class="font-bold text-sm">${q.title}</span><span class="text-[10px] font-black text-indigo-400">👍 ${q.likes}</span>`;
        container.appendChild(item);
    });
}

// --- UPDATED VOTING LOGIC (One vote per account) ---
window.handleVote = async (id, type) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return document.getElementById('viewAuth').classList.add('active');

    const key = `v_${user.id}_${id}`;
    const previousVote = localStorage.getItem(key); // Stores 'likes' or 'dislikes'
    const { data: q } = await _supabase.from('quests').select('likes, dislikes').eq('id', id).single();
    
    let updates = { likes: q.likes, dislikes: q.dislikes };

    if (previousVote === type) {
        // Toggle off if clicking the same button
        updates[type] = Math.max(0, updates[type] - 1);
        localStorage.removeItem(key);
    } else {
        // If they had a previous different vote, remove that first
        if (previousVote) updates[previousVote] = Math.max(0, updates[previousVote] - 1);
        // Add the new vote
        updates[type]++;
        localStorage.setItem(key, type);
    }

    await _supabase.from('quests').update(updates).eq('id', id);
    renderFeed();
};
