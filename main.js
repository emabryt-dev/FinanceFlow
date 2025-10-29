// Initialize IndexedDB
let db;
const request = indexedDB.open('FinanceFlowDB', 1);

request.onupgradeneeded = event => {
  db = event.target.result;
  db.createObjectStore('transactions', { keyPath: 'id' });
};

request.onsuccess = event => {
  db = event.target.result;
  renderApp();
};

// UUID for unique transaction IDs
const uuid = () => Math.random().toString(36).slice(2);

// Add/Edit Transaction
document.getElementById('transaction-form').addEventListener('submit', async e => {
  e.preventDefault();
  const transaction = {
    id: document.getElementById('edit-id').value || uuid(),
    amount: parseFloat(document.get Delete: document.getElementById('amount').value),
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
    note: document.getElementById('note').value
  };

  const tx = db.transaction(['transactions'], 'readwrite');
  const store = tx.objectStore('transactions');
  store.put(transaction);
  await tx.complete;
  closeModal();
  renderApp();
});

// Cancel Modal
document.getElementById('cancel-btn').addEventListener('click', closeModal);

// Open Modal
document.getElementById('add-btn').addEventListener('click', () => {
  document.getElementById('edit-id').value = '';
  document.getElementById('transaction-form').reset();
  document.getElementById('modal').classList.remove('hidden');
});

// Close Modal
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// Get Transactions
async function getTransactions() {
  const tx = db.transaction(['transactions'], 'readonly');
  const store = tx.objectStore('transactions');
  return new Promise(resolve => {
    const transactions = [];
    store.openCursor().onsuccess = event => {
      const cursor = event.target.result;
      if (cursor) {
        transactions.push(cursor.value);
        cursor.continue();
      } else {
        resolve(transactions);
      }
    };
  });
}

// Group by Category
function groupByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = acc[t.category] || { total: 0, count: 0 };
    acc[t.category].total += t.amount;
    acc[t.category].count += 1;
    return acc;
  }, {});
}

// Simple AI Analytics (Rule-based for MVP)
function analyzeTransactions(transactions) {
  const categories = groupByCategory(transactions);
  const total = Object.values(categories).reduce((sum, c) => sum + c.total, 0);
  const insights = [];

  for (const [category, data] of Object.entries(categories)) {
    const percentage = ((data.total / total) * 100).toFixed(2);
    if (percentage > 30) {
      insights.push(`Warning: ${category} is ${percentage}% of your spending!`);
    }
  }

  if (transactions.length > 0) {
    const recent = transactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    insights.push(`Last transaction: ${recent.category} for $${recent.amount} on ${recent.date}`);
  }

  return insights.length ? insights : ['No insights yet. Add more transactions!'];
}

// Render App
async function renderApp() {
  const transactions = await getTransactions();
  const categories = groupByCategory(transactions);

  // Dashboard
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = '';
  for (const [category, data] of Object.entries(categories)) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h2>${category}</h2><p>Total: $${data.total.toFixed(2)}</p><p>Transactions: ${data.count}</p>`;
    dashboard.appendChild(card);
  }

  // Chart
  const ctx = document.createElement('canvas');
  dashboard.appendChild(ctx);
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories).map(c => c.total),
        backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
      }]
    },
    options: { responsive: true }
  });

  // Analytics
  const analytics = document.getElementById('analytics');
  analytics.innerHTML = (await analyzeTransactions(transactions)).map(i => `<p>${i}</p>`).join('');

  // Transactions List
  const transactionsDiv = document.getElementById('transactions');
  transactionsDiv.innerHTML = '<h2 class="text-xl mb-2">Transactions</h2>';
  transactions.forEach(t => {
    const div = document.createElement('div');
    div.className = 'card flex justify-between';
    div.innerHTML = `
      <div>
        <p><strong>${t.category}</strong>: $${t.amount.toFixed(2)} on ${t.date}</p>
        <p>${t.note || 'No note'}</p>
      </div>
      <div>
        <button onclick="editTransaction('${t.id}')" class="bg-blue-500 p-1 rounded mr-2">Edit</button>
        <button onclick="deleteTransaction('${t.id}')" class="bg-red-500 p-1 rounded">Delete</button>
      </div>
    `;
    transactionsDiv.appendChild(div);
  });
}

// Edit Transaction
async function editTransaction(id) {
  const tx = db.transaction(['transactions'], 'readonly');
  const store = tx.objectStore('transactions');
  const transaction = await new Promise(resolve => {
    store.get(id).onsuccess = e => resolve(e.target.result);
  });
  document.getElementById('edit-id').value = id;
  document.getElementById('amount').value = transaction.amount;
  document.getElementById('category').value = transaction.category;
  document.getElementById('date').value = transaction.date;
  document.getElementById('note').value = transaction.note;
  document.getElementById('modal').classList.remove('hidden');
}

// Delete Transaction
async function deleteTransaction(id) {
  const tx = db.transaction(['transactions'], 'readwrite');
  const store = tx.objectStore('transactions');
  store.delete(id);
  await tx.complete;
  renderApp();
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
