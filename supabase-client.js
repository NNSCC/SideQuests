const { createClient } = supabase;

const SUPABASE_URL = 'https://dugnxysgvmxjdnkujtsl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0uAmnWpM0gMwSAQ7ij5kZA_OVLIzpkL';

const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Exporting functions so app.js can use them
const db = {
    async getQuests() {
        const { data, error } = await _supabase
            .from('quests')
            .select('*')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    async createQuest(questData) {
        return await _supabase.from('quests').insert([questData]);
    },

    async addVote(id, type, currentCount) {
        return await _supabase.from('quests')
            .update({ [type]: currentCount + 1 })
            .eq('id', id);
    },

    async addBookmark(userId, questId) {
        return await _supabase.from('bookmarks').insert([
            { user_id: userId, quest_id: questId }
        ]);
    }
};
