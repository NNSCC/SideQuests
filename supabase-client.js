const { createClient } = supabase;

const SUPABASE_URL = 'https://dugnxysgvmxjdnkujtsl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0uAmnWpM0gMwSAQ7ij5kZA_OVLIzpkL';

const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const db = {
    // Fetch all public quests
    async getQuests() {
        const { data, error } = await _supabase
            .from('quests')
            .select('*')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    // Create a new quest
    async createQuest(questData) {
        return await _supabase.from('quests').insert([questData]);
    },

    // Update vote count
    async addVote(id, type, currentCount) {
        return await _supabase.from('quests')
            .update({ [type]: currentCount + 1 })
            .eq('id', id);
    },

    // Add a bookmark
    async addBookmark(userId, questId) {
        return await _supabase.from('bookmarks').insert([
            { user_id: userId, quest_id: questId }
        ]);
    },

    // Get a specific user profile
    async getProfile(userId) {
        return await _supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();
    },

    // Call the SQL function to set username
    async setUsername(userId, username) {
        return await _supabase.rpc('set_profile_username', { 
            p_user: userId, 
            p_username: username 
        });
    }
};
