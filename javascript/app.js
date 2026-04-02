// SUPABASE AUTHENTICATION
const SUPABASE_URL = 'https://tkjpgygogszjfomxzfia.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRranBneWdvZ3N6amZvbXh6ZmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTc0MjMsImV4cCI6MjA5MDY5MzQyM30.seko5qkbw7jOyB0esvd0NuF82mqxm0E9n6ZqMsLtUhs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Store member ID for note modal
let currentMemberId = null;

// ============= REAL-TIME SUBSCRIPTIONS =============
function setupRealtimeSubscriptions() {
    // Listen for changes in contributions table
    supabaseClient
        .channel('contributions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, (payload) => {
            calculateTotal();
            fetchFriends(); // Refresh to update individual totals
        })
        .subscribe();

    // Listen for changes in friends table
    supabaseClient
        .channel('friends-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, (payload) => {
            fetchFriends();
        })
        .subscribe();
}

// ============= 1. ADD NEW MEMBER =============
async function addFriend() {
    const nameInput = document.getElementById('friend-name');
    const notesInput = document.getElementById('friend-notes');

    if (!nameInput.value) return alert("Pangalan muna, boss.");

    const { error } = await supabaseClient.from('friends').insert([
        { 
            name: nameInput.value.toUpperCase(), 
            notes: notesInput.value.toUpperCase(),
            individual_note: '' // Initialize empty note
        }
    ]);

    if (error) {
        console.error(error);
        alert('Error adding member');
    } else {
        nameInput.value = '';
        notesInput.value = '';
        fetchFriends();
    }
}

// ============= 2. LOG A CONTRIBUTION (PAID ONLY) =============
async function recordAmbag(friendId, amount) {
    const { error } = await supabaseClient.from('contributions').insert([
        { friend_id: friendId, amount: amount, status: 'Paid' }
    ]);

    if (error) {
        console.error(error);
        alert('Error logging contribution');
    } else {
        // Realtime subscription will handle updates
        alert(`₱${amount} logged for this member!`);
    }
}

// ============= 3. GET INDIVIDUAL MEMBER TOTAL =============
async function getMemberTotal(friendId) {
    const { data, error } = await supabaseClient
        .from('contributions')
        .select('amount')
        .eq('friend_id', friendId);
    
    if (error) {
        console.error(error);
        return 0;
    }
    
    return data.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
}

// ============= 4. RENDER THE ROSTER =============
async function fetchFriends() {
    const { data: friends, error } = await supabaseClient
        .from('friends')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) return console.error(error);

    const listContainer = document.getElementById('friends-list');
    listContainer.innerHTML = '';

    for (const f of friends) {
        // Get individual total for this member
        const individualTotal = await getMemberTotal(f.id);

        listContainer.innerHTML += `
            <div class="bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row items-center justify-between p-5 rounded-xl">
                <div class="mb-4 md:mb-0 text-center md:text-left flex-1">
                    <div class="flex items-center gap-2 justify-center md:justify-start">
                        <h4 class="text-xl font-black text-white italic tracking-tighter uppercase">${f.name}</h4>
                        <span class="text-sm font-bold text-blue-400">— ₱${individualTotal.toLocaleString()}</span>
                    </div>
                    <p class="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em]">${f.notes || 'REGULAR MEMBER'}</p>
                    ${f.individual_note ? `<p class="text-xs text-zinc-400 italic mt-1">"${f.individual_note}"</p>` : ''}
                </div>
                <div class="flex gap-3 w-full md:w-auto">
                    <button onclick="recordAmbag(${f.id}, 50)" 
                        class="flex-1 md:flex-none px-6 py-2 bg-white text-black font-black text-[10px] rounded hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest">
                        + ₱50
                    </button>
                    <button onclick="openMemberNoteModal(${f.id})" 
                        class="flex-1 md:flex-none px-4 py-2 border border-blue-600 text-blue-400 font-black text-[10px] rounded hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-1">
                        <i class="fas fa-sticky-note"></i> Note
                    </button>
                    <button onclick="deleteMember(${f.id})" 
                        class="flex-1 md:flex-none px-4 py-2 border border-red-900 text-red-500 font-black text-[10px] rounded hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-1">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }
}

// ============= 5. CALCULATE GRAND TOTAL =============
async function calculateTotal() {
    const { data, error } = await supabaseClient.from('contributions').select('amount');
    
    if (error) return console.error(error);

    const total = data.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    document.getElementById('grand-total').innerText = `₱${total.toLocaleString()}`;
}

// ============= 6. DELETE MEMBER WITH CASCADE =============
async function deleteMember(friendId) {
    if (!confirm('Delete this member and all their contributions? This cannot be undone.')) {
        return;
    }

    try {
        // Delete contributions first
        const { error: contributionsError } = await supabaseClient
            .from('contributions')
            .delete()
            .eq('friend_id', friendId);

        if (contributionsError) throw contributionsError;

        // Then delete the member
        const { error: memberError } = await supabaseClient
            .from('friends')
            .delete()
            .eq('id', friendId);

        if (memberError) throw memberError;

        fetchFriends();
        calculateTotal();
        alert('Member deleted successfully');
    } catch (error) {
        console.error(error);
        alert('Error deleting member');
    }
}

// ============= 7. MEMBER NOTE MODAL =============
function openMemberNoteModal(friendId) {
    currentMemberId = friendId;
    const modal = document.getElementById('member-note-modal');
    const textarea = document.getElementById('member-note-input');
    
    // Fetch current note
    supabaseClient
        .from('friends')
        .select('individual_note')
        .eq('id', friendId)
        .single()
        .then(({ data }) => {
            textarea.value = data.individual_note || '';
            modal.classList.remove('hidden');
        });
}

function closeMemberNoteModal() {
    document.getElementById('member-note-modal').classList.add('hidden');
    currentMemberId = null;
}

async function saveMemberNote() {
    if (!currentMemberId) return;

    const noteText = document.getElementById('member-note-input').value;

    const { error } = await supabaseClient
        .from('friends')
        .update({ individual_note: noteText })
        .eq('id', currentMemberId);

    if (error) {
        console.error(error);
        alert('Error saving note');
    } else {
        closeMemberNoteModal();
        fetchFriends();
        alert('Note saved!');
    }
}

// ============= 8. GLOBAL NOTEPAD MODAL =============
function openNotepadModal() {
    const modal = document.getElementById('notepad-modal');
    const textarea = document.getElementById('global-notepad');

    // Fetch current notes
    supabaseClient
        .from('admin_notes')
        .select('content')
        .eq('id', 1)
        .single()
        .then(({ data }) => {
            textarea.value = data.content || '';
            modal.classList.remove('hidden');
        })
        .catch(error => {
            console.error(error);
            textarea.value = '';
            modal.classList.remove('hidden');
        });
}

function closeNotepadModal() {
    document.getElementById('notepad-modal').classList.add('hidden');
}

async function saveGlobalNotes() {
    const noteText = document.getElementById('global-notepad').value;

    const { error } = await supabaseClient
        .from('admin_notes')
        .update({ content: noteText, updated_at: new Date().toISOString() })
        .eq('id', 1);

    if (error) {
        console.error(error);
        alert('Error saving notes');
    } else {
        closeNotepadModal();
        alert('Trip notes saved!');
    }
}

// ============= INITIALIZE APP =============
function init() {
    setupRealtimeSubscriptions();
    fetchFriends();
    calculateTotal();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);