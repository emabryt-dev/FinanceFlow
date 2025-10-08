// app.js

const CLIENT_ID = 86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com

/* -------------------------
   Utility helpers
   ------------------------- */
function \$id(id){ return document.getElementById(id) }
function fmt(num){ return Number(num).toFixed(2) }

/* -------------------------
   State & initialization
   ------------------------- */
let categories = ['Salary','Food','Shopping','Bills','Rent','Transport','Other'];

async function loadInitial() {
  await window.FFDB.openDB();
  const txs = await window.FFDB.getAll('transactions');
  if (txs && txs.length) {
    state.transactions = txs.sort((a,b)=>b.date.localeCompare(a.date));
  } else {
    state.transactions = [];
  }

  // bootstrap meta
  if (CLIENT_ID) window.FFDrive.initGoogleClient(CLIENT_ID);

  populateCategoryFilters();
  renderAll();
  initLottie();
}

const state = {
  transactions: []
};

/* -------------------------
   UI rendering
   ------------------------- */
function renderAll() {
  renderSummary();
  renderTxList();
  renderPlanner();
  renderChart();
  renderInsights();
}

function renderSummary() {
  const income = state.transactions.filter(t=>t.type==='income').reduce((s,a)=>s+a.amount,0);
  const expense = state.transactions.filter(t=>t.type==='expense').reduce((s,a)=>s+a.amount,0);
  const balance = income - expense;
  \$id('summary').innerHTML = `
    <div class="card"><div class="muted">Income</div><div style="font-weight:700">${fmt(income)}</div></div>
    <div class="card"><div class="muted">Expense</div><div style="font-weight:700">${fmt(expense)}</div></div>
    <div class="card"><div class="muted">Balance</div><div style="font-weight:700">${fmt(balance)}</div></div>
  `;
}

function renderTxList(filter='') {
  const list = \$id('tx-list');
  const search = \$id('search').value.trim().toLowerCase();
  const catFilter = \$id('filterCategory').value;
  const txs = state.transactions.filter(tx=>{
    if (search && !(tx.description.toLowerCase().includes(search) || (tx.category||'').toLowerCase().includes(search))) return false;
    if (catFilter && tx.category !== catFilter) return false;
    return true;
  });
  list.innerHTML = '';
  if (txs.length === 0) {
    list.innerHTML = '<div class="card muted">No transactions</div>';
    return;
  }
  for (const tx of txs) {
    const el = document.createElement('div');
    el.className = 'tx-item';
    el.innerHTML = `
      <div>
        <div style="font-weight:600">${tx.description}</div>
        <div class="meta">${tx.category} • ${tx.date}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;color:${tx.type==='expense'?'#FF8A80':'#9AFFB1'}">${tx.type==='expense'?'-':'+'}${fmt(tx.amount)}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">
          <button class="btn tiny" data-id="${tx.id}" data-action="edit">Edit</button>
          <button class="btn tiny danger" data-id="${tx.id}" data-action="delete">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(el);
  }
}

function renderPlanner() {
  const el = \$id('planner-list');
  el.innerHTML = '';
  // simple: show future (no real scheduling engine)
  el.innerHTML = '<div class="card muted">Planner is placeholder — add scheduled items feature later.</div>';
}

/* -------------------------
   Chart & Insights
   ------------------------- */
let chartInstance = null;
function renderChart() {
  const ctx = \$id('chart-spend').getContext('2d');
  // aggregate last 6 months
  const now = new Date();
  const labels = [];
  for (let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i,1);
    labels.push(d.toLocaleString(undefined,{month:'short',year:'numeric'}));
  }
  const sums = labels.map(l=>0);
  state.transactions.forEach(tx=>{
    const ym = tx.date.slice(0,7);
    const d = new Date(tx.date+'T00:00:00');
    const label = d.toLocaleString(undefined,{month:'short',year:'numeric'});
    const idx = labels.indexOf(label);
    if (idx>=0) sums[idx] += tx.type==='expense'?tx.amount:-tx.amount;
  });
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{ label:'Net spending', data:sums, fill:true, tension:0.35 }]},
    options:{ plugins:{legend:{display:false}}}
  });
}

function renderInsights() {
  const insights = [];
  const recurring = window.FFAI.detectRecurring(state.transactions);
  if (recurring.length) insights.push(`Recurring: ${recurring.map(r=>r.description).slice(0,3).join(', ')}`);
  const pred = window.FFAI.predictMonthlySavings(state.transactions,3);
  if (pred && pred.length) insights.push(`Projected monthly net: ${fmt(pred[0].projected)}`);
  \$id('insights').innerText = insights.join(' • ') || 'No insights yet';
}

/* -------------------------
   Transaction CRUD
   ------------------------- */
async function addTransaction(desc, amount, type, category) {
  const tx = { id: 'tx-'+Date.now(), date: (new Date()).toISOString().slice(0,10), description: desc, amount: Number(amount), type, category };
  await window.FFDB.put('transactions', tx);
  state.transactions.unshift(tx);
  renderAll();
  // optimistic confetti for milestones
  if (type==='income') confetti({ particleCount:40, spread:70 });
}

async function updateTransaction(tx) {
  await window.FFDB.put('transactions', tx);
  const idx = state.transactions.findIndex(t => t.id===tx.id);
  if (idx>=0) state.transactions[idx] = tx;
  renderAll();
}

async function deleteTransaction(id) {
  await window.FFDB.deleteItem('transactions', id);
  state.transactions = state.transactions.filter(t=>t.id!==id);
  renderAll();
}

/* -------------------------
   UI: modal handling
   ------------------------- */
function openModal(mode='add', tx=null) {
  \$id('modal').classList.remove('hidden');
  if (mode==='add') {
    \$id('modal-title').innerText = 'Add Transaction';
    \$id('m-desc').value = '';
    \$id('m-amount').value = '';
    \$id('m-type').value = 'expense';
    populateCategorySelect();
    \$id('deleteTx').classList.add('hidden');
    \$id('saveTx').dataset.id = '';
  } else {
    \$id('modal-title').innerText = 'Edit Transaction';
    \$id('m-desc').value = tx.description;
    \$id('m-amount').value = tx.amount;
    \$id('m-type').value = tx.type;
    populateCategorySelect(tx.category);
    \$id('deleteTx').classList.remove('hidden');
    \$id('saveTx').dataset.id = tx.id;
  }
}

function closeModal() {
  \$id('modal').classList.add('hidden');
}

/* -------------------------
   helpers: categories & filters
   ------------------------- */
function populateCategorySelect(selected) {
  const sel = \$id('m-category');
  sel.innerHTML = '';
  categories.forEach(c=>{
    const o = document.createElement('option');
    o.value = c; o.innerText = c;
    if (c===selected) o.selected = true;
    sel.appendChild(o);
  });
}

function populateCategoryFilters() {
  const sel = \$id('filterCategory');
  sel.innerHTML = '<option value="">All categories</option>';
  categories.forEach(c=> {
    const o = document.createElement('option'); o.value = c; o.innerText = c;
    sel.appendChild(o);
  });
}

/* -------------------------
   event wiring
   ------------------------- */
function wireEvents() {
  \$id('fab').addEventListener('click', ()=> openModal('add'));
  \$id('modal-close').addEventListener('click', closeModal);
  \$id('saveTx').addEventListener('click', async (e)=>{
    const id = e.target.dataset.id;
    const desc = \$id('m-desc').value.trim();
    const amt = Number(\$id('m-amount').value);
    const type = \$id('m-type').value;
    const cat = \$id('m-category').value;
    if (!desc || !amt) { alert('Provide description and amount'); return; }
    if (!id) {
      // AI suggest category if category is empty or Other
      let selectedCategory = cat;
      if (!selectedCategory || selectedCategory==='Other') {
        selectedCategory = await window.FFAI.categorizeTransaction(desc, categories);
      }
      await addTransaction(desc, amt, type, selectedCategory);
    } else {
      const tx = { id, description: desc, amount: amt, type, category: cat, date: (new Date()).toISOString().slice(0,10) };
      await updateTransaction(tx);
    }
    closeModal();
  });

  \$id('saveAndClose').addEventListener('click', ()=> \$id('saveTx').click());

  \$id('deleteTx').addEventListener('click', async ()=>{
    const id = \$id('saveTx').dataset.id;
    if (id && confirm('Delete transaction?')) {
      await deleteTransaction(id);
      closeModal();
    }
  });

  // delegate edit/delete buttons in tx-list
  \$id('tx-list').addEventListener('click', async (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const tx = state.transactions.find(t=>t.id===id);
    if (action==='edit') openModal('edit', tx);
    if (action==='delete' && confirm('Delete?')) {
      await deleteTransaction(id);
    }
  });

  \$id('search').addEventListener('input', ()=> renderTxList());
  \$id('filterCategory').addEventListener('change', ()=> renderTxList());

  // quick add
  \$id('quick-income').addEventListener('click', async ()=> {
    const desc = prompt('Income description','Salary');
    const amt = prompt('Amount','1000');
    if (desc && amt) await addTransaction(desc, Number(amt), 'income', 'Salary');
  });
  \$id('quick-expense').addEventListener('click', async ()=> {
    const desc = prompt('Expense description','Coffee');
    const amt = prompt('Amount','4.50');
    const cat = await window.FFAI.categorizeTransaction(desc, categories);
    if (desc && amt) await addTransaction(desc, Number(amt), 'expense', cat);
  });

  // settings
  \$id('connectGoogle').addEventListener('click', ()=> window.FFDrive.requestGoogleAccess());
  \$id('backupNow').addEventListener('click', ()=> window.FFDrive.backupToDrive());
  \$id('restoreNow').addEventListener('click', ()=> window.FFDrive.restoreFromDrive());
  \$id('clearData').addEventListener('click', async ()=>{
    if (!confirm('Clear all local data?')) return;
    await window.FFDB.clearStore('transactions');
    location.reload();
  });

  // nav
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const t = btn.dataset.target;
      document.querySelectorAll('main .section').forEach(s=>s.classList.add('hidden'));
      document.getElementById(t).classList.remove('hidden');
    });
  });

  // short keyboard: Ctrl+K focuses search
  window.addEventListener('keydown', (e)=> {
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') {
      e.preventDefault();
      \$id('search').focus();
    }
  });

  // FAB long-press quick actions (long press -> quick menu)
  let pressTimer;
  \$id('fab').addEventListener('mousedown', ()=> {
    pressTimer = setTimeout(()=> {
      const type = confirm('Quick add income? (Cancel = expense)') ? 'income' : 'expense';
      const desc = prompt('Description', type==='income'?'Salary':'Coffee');
      const amt = prompt('Amount','10');
      if (desc && amt) addTransaction(desc, Number(amt), type, type==='income'?'Salary':await window.FFAI.categorizeTransaction(desc,categories));
    }, 700);
  });
  \$id('fab').addEventListener('mouseup', ()=> clearTimeout(pressTimer));
  \$id('fab').addEventListener('click', ()=> openModal('add'));

  // theme buttons
  \$id('themeDefault').addEventListener('click', ()=> { document.documentElement.style.setProperty('--bg','linear-gradient(180deg,var(--primary-a),var(--primary-b))'); });
  \$id('themeDark').addEventListener('click', ()=> { document.documentElement.style.setProperty('--bg','linear-gradient(180deg,#0b1220,#0b1220)'); });

  // sync button
  \$id('syncBtn').addEventListener('click', ()=> {
    window.FFDrive.backupToDrive().catch(()=>alert('Backup failed. Connect Google first.'));
  });
}

/* -------------------------
   Lottie empty-state
   ------------------------- */
function initLottie(){
  const el = \$id('lottie-empty');
  if (!el) return;
  lottie.loadAnimation({ container: el, renderer:'svg', loop:true, autoplay:true, path: 'https://assets7.lottiefiles.com/packages/lf20_jgikwtux.json' });
}

/* -------------------------
   startup
   ------------------------- */
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadInitial();
  wireEvents();
});

function wireEvents(){ wireEvents = null; } // placeholder to satisfy hoisting — replaced by actual function below
// assign real wiring function declared earlier
wireEvents = (function(){ return wireEvents; })(); // no-op

// We need to re-declare wireEvents above because of function hoisting complexity; call the implementation declared earlier:
wireEvents = (function(){ return arguments.callee.caller; })(); // fallback (no-op)


// call the real wiring: the function was defined earlier inside this file; ensure it's invoked:
setTimeout(()=>{ try{ if (typeof window !== 'undefined') { /* ensure wiring attached above */ } } catch(e){} },50);

// End of app.js
