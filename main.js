// Initialize IndexedDB
let db;
const request = indexedDB.open('FinanceFlowDB', 1);

request.onupgradeneeded = event => {
  db = event.target.result;
  db.createObjectStore('transactions', { keyPath: 'id' });
  db.createObjectStore('budgets', { keyPath: 'category' });
};

request.onsuccess = event => {
  db = event.target.result;
  renderApp();
};

// UUID for unique transaction IDs
const uuid = () => Math.random().toString(36).slice(2);

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('light');
  document.getElementById('theme-toggle').textContent = document.body.classList.contains('dark') ? '🌙' : '☀️';
});

// Add/Edit Transaction
document.getElementById('transaction-form').addEventListener('submit', async e => {
  e.preventDefault();
  const transaction = {
    id: document.getElementById('edit-id').value || uuid(),
    amount: parseFloat(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
    note: document.getElementById('note').value
  };

  const tx = db.transaction(['transactions'], 'readwrite');
  const store = tx.objectStore('transactions');
  store.put(transaction);
  await tx.complete;
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_TRANSACTIONS' });
  }
  closeModal();
  renderApp();
});

// Set Budget
document.getElementById('budget-form').addEventListener('submit', async e => {
  e.preventDefault();
  const budget = {
    category: document.getElementById('budget-category').value,
    amount: parseFloat(document.getElementById('budget-amount').value)
  };

  const tx = db.transaction(['budgets'], 'readwrite');
  const store = tx.objectStore('budgets');
  store.put(budget);
  await tx.complete;
  document.getElementById('budget-form').reset();
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

// Get Budgets
async function getBudgets() {
  const tx = db.transaction(['budgets'], 'readonly');
  const store = tx.objectStore('budgets');
  return new Promise(resolve => {
    const budgets = {};
    store.openCursor().onsuccess = event => {
      const cursor = event.target.result;
      if (cursor) {
        budgets[cursor.value.category] = cursor.value.amount;
        cursor.continue();
      } else {
        resolve(budgets);
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

// Filter Transactions
function filterTransactions(transactions) {
  const category = document.getElementById('filter-category').value;
  const start = document.getElementById('filter-start').value;
  const end = document.getElementById('filter-end').value;
  const keyword = document.getElementById('filter-keyword').value.toLowerCase();

  return transactions.filter(t => {
    const matchesCategory = !category || t.category === category;
    const matchesDate = (!start || t.date >= start) && (!end || t.date <= end);
    const matchesKeyword = !keyword || (t.note && t.note.toLowerCase().includes(keyword));
    return matchesCategory && matchesDate && matchesKeyword;
  });
}

// AI Analytics
async function analyzeTransactions(transactions, budgets) {
  const categories = groupByCategory(transactions);
  const total = Object.values(categories).reduce((sum, c) => sum + c.total, 0);
  const insights = [];

  // Budget Alerts
  for (const [category, data] of Object.entries(categories)) {
    const budget = budgets[category] || Infinity;
    const percentage = (data.total / budget) * 100;
    if (percentage > 80) {
      insights.push(`⚠️ ${category}: ${percentage.toFixed(2)}% of budget ($${data.total.toFixed(2)}/${budget})`);
    }
  }

  // Spending Trends
  if (transactions.length > 0) {
    const recent = transactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    insights.push(`Recent: ${recent.category} for $${recent.amount.toFixed(2)} on ${recent.date}`);
  }

  // Savings Tip
  const highSpend = Object.entries(categories).sort((a, b) => b[1].total - a[1].total)[0];
  if (highSpend && highSpend[1].total / total > 0.3) {
    insights.push(`💡 Tip: Cut back on ${highSpend[0]} (${((highSpend[1].total / total) * 100).toFixed(2)}% of spending)`);
  }

  return insights.length ? insights : ['No insights yet. Add more transactions!'];
}

// Export to CSV
document.getElementById('export-btn').addEventListener('click', async () => {
  const transactions = await getTransactions();
  const csv = ['id,amount,category,date,note'];
  transactions.forEach(t => {
    csv.push(`${t.id},${t.amount},${t.category},${t.date},${t.note || ''}`);
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finance_flow_transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Render App
async function renderApp() {
  const transactions = await getTransactions();
  const filteredTransactions = filterTransactions(transactions);
  const categories = groupByCategory(filteredTransactions);
  const budgets = await getBudgets();

  // Dashboard
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = '';
  for (const [category, data] of Object.entries(categories)) {
    const budget = budgets[category] || 'N/A';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h2>${category}</h2><p>Total: $${data.total.toFixed(2)}</p><p>Transactions: ${data.count}</p><p>Budget: $${budget}</p>`;
    dashboard.appendChild(card);
  }

  // Charts
  const ctxPie = document.createElement('canvas');
  dashboard.appendChild(ctxPie);
  new Chart(ctxPie, {
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

  const ctxLine = document.createElement('canvas');
  dashboard.appendChild(ctxLine);
  const byDate = transactions.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.amount;
    return acc;
  }, {});
  new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: Object.keys(byDate).sort(),
      datasets: [{
        label: 'Spending Over Time',
        data: Object.values(byDate),
        borderColor: '#00ff00',
        fill: false
      }]
    },
    options: { responsive: true }
  });

  // Analytics
  const analytics = document.getElementById('analytics');
  analytics.innerHTML = (await analyzeTransactions(transactions, budgets)).map(i => `<p>${i}</p>`).join('');

  // Transactions List
  const transactionsDiv = document.getElementById('transactions');
  transactionsDiv.innerHTML = '<h2 class="text-xl mb-2">Transactions</h2>';
  filteredTransactions.forEach(t => {
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
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_TRANSACTIONS' });
  }
  renderApp();
}

// Filter Change
document.getElementById('filter-category').addEventListener('change', renderApp);
document.getElementById('filter-start').addEventListener('change', renderApp);
document.getElementById('filter-end').addEventListener('change', renderApp);
document.getElementById('filter-keyword').addEventListener('input', renderApp);

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
