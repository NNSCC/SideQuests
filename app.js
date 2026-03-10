document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    renderFeed();

    const vAuth = document.getElementById('viewAuth');
    const vCreate = document.getElementById('viewCreate');
    const vAccount = document.getElementById('viewAccount');

    // --- NAVIGATION & OVERLAYS ---
    document.getElementById('navCreateBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            setAuthMode(true);
            vAuth.classList.add('active');
        } else {
            vCreate.classList.add('active');
        }
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
    const authSection = document.getElementById('authSection');

    if (user) {
        const { data: profile } = await db.getProfile(user.id);
        const username = profile?.username || 'User';
        
        // This replaces the "Log In" button with just your Username
        authSection.innerHTML = `
            <button id="userProfileBtn" class="bg-black text-white px-5 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-all active:scale-95">
                @${username.toUpperCase()}
            </button>
        `;

        // Opens Account Page
        document.getElementById('userProfileBtn').onclick = () => openAccount(user, username);

        // Debug Check
        if (user.email === 'rkormen80@nn.k12.in.us') {
            document.getElementById('debugMenu').classList.remove('hidden');
        }

        // Logout Logic inside the Account Page
        document.getElementById('logoutBtn').onclick = async (e) => {
            e.preventDefault();
            await _supabase.auth.signOut();
            window.location.href = window.location.pathname; // Hard reset to home
        };
    } else {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.onclick = () => {
                setAuthMode(false);
                document.getElementById('viewAuth').classList.add('active');
            };
        }
    }
}

async function openAccount(user, username) {
    document.getElementById('accUsername').innerText = `@${username}`;
    document.getElementById('viewAccount').classList.add('active');
    
    const container = document.getElementById('userQuestsContainer');
    container.innerHTML = `<p class="text-xs font-bold text-gray-300 animate-pulse">Loading history...</p>`;
    
    const { data: quests } = await _supabase.from('quests').select('*').eq('user_id', user.id);
    
    container.innerHTML = quests.length ? "" : `<p class="text-sm text-gray-400 py-10">No quests posted yet.</p>`;
    quests.forEach(q => {
        const item = document.createElement('div');
        item.className = "p-5 bg-gray-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-indigo-100 transition-all";
        item.innerHTML = `
            <span class="font-bold text-sm">${q.title}</span>
            <span class="text-[10px] font-black text-indigo-400">👍 ${q.likes}</span>
        `;
        container.appendChild(item);
    });
}

// Keep your existing renderFeed, handleVote, and handleBookmark below...
