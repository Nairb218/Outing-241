// SUPABASE AUTHENTICATION
const SUPABASE_URL = 'https://tkjpgygogszjfomxzfia.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRranBneWdvZ3N6amZvbXh6ZmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTc0MjMsImV4cCI6MjA5MDY5MzQyM30.seko5qkbw7jOyB0esvd0NuF82mqxm0E9n6ZqMsLtUhs';
const supabaseClient = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// APP INITIALIZATION

// 1. ADD NEW MEMBER
async function addFriend() {
    const nameInput = document.getElementById('friend-name');
    const notesInput = document.getElementById('friend-notes');

    if (!nameInput.value) return alert("Pangalan muna, boss.");

    const { error } = await supabaseClient.from('friends').insert([
        { 
            name: nameInput.value.toUpperCase(), 
            notes: notesInput.value.toUpperCase() 
        }
    ]);

    if (error) {
        console.error(error);
    } else {
        nameInput.value = '';
        notesInput.value = '';
        fetchFriends();
    }
}

// 2. LOG A CONTRIBUTION (PAID OR MISSED)
async function recordAmbag(friendId, amount, status) {
    const { error } = await supabaseClient.from('contributions').insert([
        { friend_id: friendId, amount: amount, status: status }
    ]);

    if (error) {
        console.error(error);
    } else {
        calculateTotal();
        alert(`Entry Logged: ${status}`);
    }
}

// 3. RENDER THE ROSTER
async function fetchFriends() {
    const { data: friends, error } = await supabaseClient.from('friends').select('*').order('name', { ascending: true });
    
    if (error) return console.error(error);

    const listContainer = document.getElementById('friends-list');
    listContainer.innerHTML = '';

    friends.forEach(f => {
        listContainer.innerHTML += `
            <div class="friend-row flex flex-col md:flex-row items-center justify-between p-5">
                <div class="mb-4 md:mb-0 text-center md:text-left">
                    <h4 class="text-xl font-black text-white italic tracking-tighter uppercase">${f.name}</h4>
                    <p class="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em]">${f.notes || 'REGULAR MEMBER'}</p>
                </div>
                <div class="flex gap-3 w-full md:w-auto">
                    <button onclick="recordAmbag(${f.id}, 50, 'Paid')" 
                        class="flex-1 md:flex-none px-6 py-2 bg-white text-black font-black text-[10px] rounded hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest">
                        + ₱50
                    </button>
                    <button onclick="recordAmbag(${f.id}, 0, 'Missed')" 
                        class="flex-1 md:flex-none px-6 py-2 border border-red-900 text-red-500 font-black text-[10px] rounded hover:bg-red-600 hover:text-white transition-all italic uppercase tracking-widest">
                        MISSED
                    </button>
                </div>
            </div>
        `;
    });
}

// 4. CALCULATE WAR CHEST
async function calculateTotal() {
    const { data, error } = await supabaseClient.from('contributions').select('amount');
    
    if (error) return console.error(error);

    const total = data.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    document.getElementById('grand-total').innerText = `₱${total.toLocaleString()}`;
}

// BOOTSTRAP APP
await fetchFriends();
await calculateTotal();