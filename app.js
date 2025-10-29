// Finance Flow: Upgraded PWA with AI, IndexedDB, Encryption, Push Notifications

import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js';
import CryptoJS from 'https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.min.js';
import * as tf from 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.21.0/dist/tf.min.js';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js';
import JSConfetti from 'https://cdn.jsdelivr.net/npm/js-confetti@0.12.0/dist/js-confetti.browser.js';
import ListView from 'https://cdn.jsdelivr.net/npm/list-view@0.0.3/dist/list-view.min.js';

// Initialize IndexedDB
const db = new Dexie('FinanceFlowDB');
db.version(1).stores({
  transactions: 'id,type,amount,category,date,desc',
  categories: 'name,type',
  budgets: 'month',
  futureTransactions: 'id,type',
  loans: 'id,type',
  settings: 'key'
});
const encryptionKey = 'finance-flow-secure-key-2025'; // Rotate via user auth in production

// State
let transactions = [];
let categories = [];
let currency = 'USD';
let monthlyBudgets = {};
let futureTransactions = { income: [], expenses: [] };
let loans = { given: [], taken: [] };
let googleUser = null;
let isOnline = navigator.onLine;
let currentTab = 'dashboard';
let currentChartType = 'category';
let currentCategoryFilter = 'all';
let streakCount = 0;
const confetti = new JSConfetti();

// AI Analytics Engine
const AnalyticsEngine = {
  async calculateHealthScore(transactions, monthlyBudgets) {
    if (transactions.length === 0) return 50;
    const now = DateTime.now();
    const threeMonthsAgo = now.minus({ months: 3 });
    const recent = transactions.filter(tx => DateTime.fromISO(tx.date) >= threeMonthsAgo);
    if (!recent.length) return 50;

    const totalIncome = recent.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = recent.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpenses) / totalIncome) : 0;
    const savingsScore = Math.min(100, savingsRate * 200);
    const stabilityScore = Math.min(100, this.calculateExpenseStability(recent) * 100);
    const diversityScore = Math.min(100, this.calculateIncomeDiversity(recent) * 100);
    const emergencyFundScore = this.calculateEmergencyFundScore(totalExpenses, monthlyBudgets);
    return Math.round(savingsScore * 0.4 + stabilityScore * 0.3 + diversityScore * 0.2 + emergencyFundScore * 0.1);
  },

  calculateExpenseStability(transactions) {
    const monthlyExpenses = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const month = tx.date.slice(0, 7);
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
      }
    });
    const amounts = Object.values(monthlyExpenses);
    if (amounts.length < 2) return 0.7;
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
    return Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / avg));
  },

  calculateIncomeDiversity(transactions) {
    const incomeByCategory = {};
    transactions.filter(tx => tx.type === 'income').forEach(tx => {
      incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
    });
    const totalIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0) || 0;
    const shares = Object.values(incomeByCategory).map(amount => amount / totalIncome);
    return totalIncome ? 1 - shares.reduce((sum, share) => sum + Math.pow(share, 2), 0) : 0;
  },

  calculateEmergencyFundScore(monthlyExpenses, monthlyBudgets) {
    const avgMonthlyExpense = monthlyExpenses / 3;
    const currentMonth = getCurrentMonthKey();
    const currentBalance = monthlyBudgets[currentMonth]?.endingBalance || 0;
    if (avgMonthlyExpense === 0) return 50;
    const monthsCovered = currentBalance / avgMonthlyExpense;
    return monthsCovered >= 6 ? 100 : monthsCovered >= 3 ? 75 : monthsCovered >= 1 ? 50 : 25;
  },

  async predictNextMonthSpending(transactions) {
    const now = DateTime.now();
    const sixMonthsAgo = now.minus({ months: 6 });
    const recent = transactions.filter(tx => DateTime.fromISO(tx.date) >= sixMonthsAgo && tx.type === 'expense');
    if (recent.length < 10) return { amount: 0, confidence: 0, trend: 0 };

    const monthlyExpenses = {};
    recent.forEach(tx => {
      const month = tx.date.slice(0, 7);
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
    });
    const months = Object.keys(monthlyExpenses).sort().slice(-12);
    const inputs = months.map(m => [monthlyExpenses[m]]);
    const outputs = inputs.slice(1).concat([[0]]);

    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 32, inputShape: [12, 1] }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    await model.fit(
      tf.tensor3d(inputs, [inputs.length, 1, 1]),
      tf.tensor2d(outputs, [outputs.length, 1]),
      { epochs: 50, verbose: 0 }
    );

    const lastMonth = months[months.length - 1];
    const input = tf.tensor3d([[[monthlyExpenses[lastMonth]]]]);
    const prediction = model.predict(input).dataSync()[0];
    const amounts = Object.values(monthlyExpenses);
    const confidence = Math.min(0.9, amounts.length / 10);
    const trend = amounts.length >= 2 ? (amounts[amounts.length - 1] - amounts[amounts.length - 2]) / amounts[amounts.length - 2] : 0;
    return { amount: Math.round(prediction), confidence, trend };
  },

  detectAnomalies(transactions) {
    const monthlyExpenses = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const month = tx.date.slice(0, 7);
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
    });
    const amounts = Object.values(monthlyExpenses);
    if (amounts.length < 3) return [];
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length);
    return transactions.filter(tx => {
      const month = tx.date.slice(0, 7);
      return tx.type === 'expense' && Math.abs(tx.amount - avg) > 2 * stdDev;
    }).map(tx => ({
      type: 'warning',
      message: `Unusual spending: ${tx.desc} (${tx.amount.toLocaleString()} ${currency}) on ${tx.date}`,
      icon: 'bi-exclamation-triangle'
    }));
  },

  async generateInsights(transactions, monthlyBudgets) {
    const insights = [];
    const healthScore = await this.calculateHealthScore(transactions, monthlyBudgets);
    const prediction = await this.predictNextMonthSpending(transactions);
    const anomalies = this.detectAnomalies(transactions);

    if (healthScore >= 80) {
      insights.push({ type: 'positive', message: 'Excellent financial health!', icon: 'bi-emoji-smile' });
    } else if (healthScore >= 60) {
      insights.push({ type: 'info', message: 'Good financial health. Small tweaks for excellence.', icon: 'bi-emoji-neutral' });
    } else {
      insights.push({ type: 'warning', message: 'Review spending to boost financial health.', icon: 'bi-emoji-frown' });
    }

    const savingsRate = this.calculateSavingsRate(transactions);
    if (savingsRate >= 0.2) {
      insights.push({ type: 'positive', message: `Great ${Math.round(savingsRate * 100)}% savings rate!`, icon: 'bi-piggy-bank' });
    } else if (savingsRate < 0) {
      insights.push({ type: 'warning', message: 'Spending exceeds income. Cut back or boost income.', icon: 'bi-exclamation-triangle' });
    }

    if (prediction && prediction.confidence > 0.6) {
      insights.push({ type: 'info', message: `Next month predicted spend: ${prediction.amount.toLocaleString()} ${currency} (${prediction.trend > 0 ? 'up' : 'down'} trend)`, icon: 'bi-magic' });
    }

    insights.push(...anomalies);
    return insights.slice(0, 5);
  },

  calculateSavingsRate(transactions) {
    const now = DateTime.now();
    const threeMonthsAgo = now.minus({ months: 3 });
    const recent = transactions.filter(tx => DateTime.fromISO(tx.date) >= threeMonthsAgo);
    const totalIncome = recent.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = recent.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    return totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
  }
};

// Debt Engine
const DebtEngine = {
  getLoanStatus(loan) {
    const dueDate = DateTime.fromISO(loan.startDate).plus({ months: loan.termMonths });
    return dueDate < DateTime.now() ? 'overdue' : 'active';
  },

  calculateRepaymentPlan(loan) {
    const principal = loan.amount;
    const rate = (loan.interestRate || 0) / 100 / 12;
    const term = loan.termMonths;
    const payment = rate ? principal * (rate / (1 - Math.pow(1 + rate, -term))) : principal / term;
    return {
      monthlyPayment: payment.toFixed(2),
      totalInterest: payment ? ((payment * term - principal).toFixed(2)) : 0
    };
  }
};

// Data Handlers
async function loadTransactions() {
  const arr = await db.transactions.toArray();
  return arr.length ? arr : [];
}

async function saveTransactions(arr) {
  transactions = arr;
  await db.transactions.clear();
  await db.transactions.bulkPut(arr);
  await autoSyncToDrive();
  await checkBudgetAlerts();
  updateStreak();
}

async function loadCategories() {
  const arr = await db.categories.toArray();
  return arr.length ? arr : [
    { name: 'Salary', type: 'income' },
    { name: 'Food', type: 'expense' },
    { name: 'Shopping', type: 'expense' },
    { name: 'Utilities', type: 'expense' }
  ];
}

async function saveCategories(arr) {
  categories = arr;
  await db.categories.clear();
  await db.categories.bulkPut(arr);
  await autoSyncToDrive();
  renderCategoryList();
}

async function loadCurrency() {
  const setting = await db.settings.get('currency');
  return setting?.value || 'USD';
}

async function saveCurrency(val) {
  currency = val;
  await db.settings.put({ key: 'currency', value: val });
  await autoSyncToDrive();
}

async function loadMonthlyBudgets() {
  const budgets = await db.budgets.toArray();
  return budgets.reduce((acc, b) => ({ ...acc, [b.month]: b }), {});
}

async function saveMonthlyBudgets(budgets) {
  monthlyBudgets = budgets;
  await db.budgets.clear();
  await db.budgets.bulkPut(Object.values(budgets));
  await autoSyncToDrive();
}

async function loadFutureTransactions() {
  const arr = await db.futureTransactions.toArray();
  return {
    income: arr.filter(t => t.type === 'income'),
    expenses: arr.filter(t => t.type === 'expense')
  };
}

async function saveFutureTransactions(ft) {
  futureTransactions = ft;
  await db.futureTransactions.clear();
  await db.futureTransactions.bulkPut([...ft.income, ...ft.expenses]);
  await autoSyncToDrive();
}

async function loadLoans() {
  const arr = await db.loans.toArray();
  const updated = arr.map(loan => ({ ...loan, status: DebtEngine.getLoanStatus(loan) }));
  return {
    given: updated.filter(l => l.type === 'given'),
    taken: updated.filter(l => l.type === 'taken')
  };
}

async function saveLoans(l) {
  loans = l;
  await db.loans.clear();
  await db.loans.bulkPut([...l.given, ...l.taken]);
  await autoSyncToDrive();
  await checkLoanAlerts();
}

// Google Drive Sync
async function loadDataFromDrive() {
  if (!googleUser || !isOnline) return false;
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name="finance_flow_data.json"', {
      headers: { Authorization: `Bearer ${googleUser.access_token}` }
    });
    const data = await response.json();
    if (data.files.length) {
      const file = await fetch(`https://www.googleapis.com/drive/v3/files/${data.files[0].id}?alt=media`, {
        headers: { Authorization: `Bearer ${googleUser.access_token}` }
      });
      const encrypted = await file.text();
      const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey).toString(CryptoJS.enc.Utf8);
      const parsed = JSON.parse(decrypted);
      transactions = parsed.transactions || [];
      categories = parsed.categories || [];
      currency = parsed.currency || 'USD';
      monthlyBudgets = parsed.monthlyBudgets || {};
      futureTransactions = parsed.futureTransactions || { income: [], expenses: [] };
      loans = parsed.loans || { given: [], taken: [] };
      await saveTransactions(transactions);
      await saveCategories(categories);
      await saveCurrency(currency);
      await saveMonthlyBudgets(monthlyBudgets);
      await saveFutureTransactions(futureTransactions);
      await saveLoans(loans);
      showToast('Data synced from Google Drive', 'success');
      return true;
    }
    return false;
  } catch (e) {
    console.error('Drive load error:', e);
    showToast('Failed to sync from Drive', 'danger');
    return false;
  }
}

async function saveDataToDrive() {
  if (!googleUser || !isOnline) return;
  const data = { transactions, categories, currency, monthlyBudgets, futureTransactions, loans };
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
  const file = new Blob([encrypted], { type: 'application/json' });
  const metadata = { name: 'finance_flow_data.json', mimeType: 'application/json' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  try {
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${googleUser.access_token}` },
      body: form
    });
    if (response.ok) showToast('Data synced to Google Drive', 'success');
  } catch (e) {
    console.error('Drive save error:', e);
    showToast('Failed to sync to Drive', 'danger');
  }
}

async function autoSyncToDrive() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_DATA' });
  }
}

// UI Handlers
function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  document.getElementById('toastContainer').appendChild(toast);
  new bootstrap.Toast(toast).show();
}

async function updateUI() {
  // Update dashboard
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  document.getElementById('netWealth').textContent = (totalIncome - totalExpenses).toLocaleString(undefined, { style: 'currency', currency });
  document.getElementById('totalIncome').textContent = totalIncome.toLocaleString(undefined, { style: 'currency', currency });
  document.getElementById('totalExpense').textContent = totalExpenses.toLocaleString(undefined, { style: 'currency', currency });

  // Update analytics chart
  const ctx = document.getElementById('analyticsChart').getContext('2d');
  if (window.mainChart) window.mainChart.destroy();
  window.mainChart = new Chart(ctx, {
    type: currentChartType === 'category' ? 'pie' : 'line',
    data: {
      labels: currentChartType === 'category' ? Object.keys(groupByCategory(transactions)) : Object.keys(groupByDate(transactions)).sort(),
      datasets: [{
        label: currentChartType === 'category' ? 'Spending by Category' : 'Spending Over Time',
        data: currentChartType === 'category' ? Object.values(groupByCategory(transactions)).map(c => c.total) : Object.values(groupByDate(transactions)),
        backgroundColor: ['#00ff00', '#00cc00', '#009900', '#006600', '#003300'],
        borderColor: '#00ff00',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: currentChartType === 'category' ? 'Category Breakdown' : 'Spending Trend' }
      }
    }
  });

  // Render other UI components
  renderTransactions();
  renderPlannerProjections();
  renderDebtManagement();
  renderQuickInsights();
  renderCategoryFilter();

  // Celebrate milestones
  if ((await AnalyticsEngine.calculateHealthScore(transactions, monthlyBudgets)) > 80) {
    confetti.addConfetti({ emojis: ['💰', '🎉'] });
  }
  if (streakCount >= 5) {
    confetti.addConfetti({ emojis: ['🔥', '🏆'] });
    showToast(`5-day streak! You're killing it!`, 'success');
  }
}

function groupByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = acc[t.category] || { total: 0, count: 0 };
    acc[t.category].total += t.amount;
    acc[t.category].count += 1;
    return acc;
  }, {});
}

function groupByDate(transactions) {
  return transactions.reduce((acc, t) => {
    if (t.type === 'expense') {
      acc[t.date.slice(0, 7)] = (acc[t.date.slice(0, 7)] || 0) + t.amount;
    }
    return acc;
  }, {});
}

function renderTransactions() {
  const list = document.getElementById('transactionsList');
  list.innerHTML = '';
  const filtered = transactions.filter(t => currentCategoryFilter === 'all' || t.category === currentCategoryFilter);
  new ListView(list, {
    data: filtered,
    template: t => `
      <tr class="transaction-row" data-id="${t.id}">
        <td>${t.date}</td>
        <td>${t.desc}</td>
        <td>${t.category}</td>
        <td>${t.amount.toLocaleString(undefined, { style: 'currency', currency })}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="editTransaction('${t.id}')" aria-label="Edit transaction">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteTransaction('${t.id}')" aria-label="Delete transaction">Delete</button>
        </td>
      </tr>
    `,
    height: 400,
    itemHeight: 50
  });
}

async function renderPlannerProjections() {
  const timeframe = document.getElementById('plannerTimeframe').value;
  const years = parseInt(timeframe);
  const projections = document.getElementById('plannerProjections');
  projections.innerHTML = '';
  const now = DateTime.now();
  for (let i = 0; i < years * 12; i++) {
    const month = now.plus({ months: i }).toFormat('yyyy-MM');
    const income = futureTransactions.income.reduce((sum, ft) => {
      if (isTransactionApplicable(ft, month)) return sum + ft.amount;
      return sum;
    }, 0);
    const expenses = futureTransactions.expenses.reduce((sum, ft) => {
      if (isTransactionApplicable(ft, month)) return sum + ft.amount;
      return sum;
    }, 0);
    projections.innerHTML += `
      <div class="card mb-2">
        <div class="card-body">
          <h6>${month}</h6>
          <p>Income: ${income.toLocaleString(undefined, { style: 'currency', currency })}</p>
          <p>Expenses: ${expenses.toLocaleString(undefined, { style: 'currency', currency })}</p>
          <p>Balance: ${(income - expenses).toLocaleString(undefined, { style: 'currency', currency })}</p>
        </div>
      </div>
    `;
  }
}

function isTransactionApplicable(ft, month) {
  const start = DateTime.fromISO(ft.startDate);
  const end = ft.endDate ? DateTime.fromISO(ft.endDate) : DateTime.fromISO('9999-12-31');
  const target = DateTime.fromISO(month);
  if (target < start || target > end) return false;
  if (ft.frequency === 'one-time') return target.toFormat('yyyy-MM') === start.toFormat('yyyy-MM');
  if (ft.frequency === 'monthly') return true;
  if (ft.frequency === 'quarterly') return target.diff(start, 'months').months % 3 === 0;
  if (ft.frequency === 'yearly') return target.diff(start, 'years').years % 1 === 0;
  return false;
}

async function renderDebtManagement() {
  const debt = document.getElementById('debtManagement');
  debt.innerHTML = '';
  ['given', 'taken'].forEach(type => {
    debt.innerHTML += `<h5>${type.charAt(0).toUpperCase() + type.slice(1)} Loans</h5>`;
    loans[type].forEach(loan => {
      const plan = DebtEngine.calculateRepaymentPlan(loan);
      debt.innerHTML += `
        <div class="card mb-2">
          <div class="card-body">
            <h6>${loan.description}</h6>
            <p>Amount: ${loan.amount.toLocaleString(undefined, { style: 'currency', currency })}</p>
            <p>Status: ${loan.status}</p>
            <p>Monthly Payment: ${plan.monthlyPayment} ${currency}</p>
            <p>Total Interest: ${plan.totalInterest} ${currency}</p>
            <button class="btn btn-primary btn-sm" onclick="editLoan('${loan.id}', '${type}')" aria-label="Edit loan">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteLoan('${loan.id}', '${type}')" aria-label="Delete loan">Delete</button>
          </div>
        </div>
      `;
    });
  });
}

async function renderQuickInsights() {
  const insights = await AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
  document.getElementById('quickInsights').innerHTML = insights.map(i => `
    <div class="alert alert-${i.type} d-flex align-items-center">
      <i class="bi ${i.icon} me-2"></i> ${i.message}
    </div>
  `).join('');
}

function renderCategoryList() {
  const list = document.getElementById('categoryList');
  list.innerHTML = categories.map(c => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      ${c.name} (${c.type})
      <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.name}')" aria-label="Delete category ${c.name}">Delete</button>
    </li>
  `).join('');
  const select = document.getElementById('categoryInput');
  select.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function renderCategoryFilter() {
  const select = document.getElementById('filterCategory');
  select.innerHTML = `<option value="all">All Categories</option>` + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function getCurrentMonthKey() {
  return DateTime.now().toFormat('yyyy-MM');
}

async function calculateMonthlyRollover() {
  const sortedMonths = Object.keys(monthlyBudgets).sort();
  let lastBalance = 0;
  sortedMonths.forEach(month => {
    const budget = monthlyBudgets[month];
    const income = transactions.filter(t => t.date.startsWith(month) && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.date.startsWith(month) && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    budget.startingBalance = budget.autoRollover ? lastBalance : 0;
    budget.endingBalance = budget.allowNegative ? budget.startingBalance + income - expenses : Math.max(0, budget.startingBalance + income - expenses);
    lastBalance = budget.endingBalance;
  });
  await saveMonthlyBudgets(monthlyBudgets);
}

async function checkBudgetAlerts() {
  const currentMonth = getCurrentMonthKey();
  const budget = monthlyBudgets[currentMonth] || { budget: Infinity };
  const expenses = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  if (expenses / budget.budget > 0.8) {
    showPushNotification('Budget Alert', `You're nearing your ${currentMonth} budget limit!`);
  }
}

async function checkLoanAlerts() {
  loans.given.concat(loans.taken).forEach(loan => {
    if (loan.status === 'overdue') {
      showPushNotification('Loan Overdue', `${loan.description} is overdue. Review now.`);
    }
  });
}

function showPushNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'icons/icon-192.png' });
  } else if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: 'icons/icon-192.png' });
      }
    });
  }
}

async function updateStreak() {
  const today = DateTime.now().toFormat('yyyy-MM-dd');
  const lastTransaction = transactions.sort((a, b) => b.date.localeCompare(a.date))[0];
  if (lastTransaction && lastTransaction.date === today) {
    streakCount = (streakCount || 0) + 1;
  } else if (lastTransaction && DateTime.fromISO(lastTransaction.date).plus({ days: 1 }).toFormat('yyyy-MM-dd') !== today) {
    streakCount = 0;
  }
  await db.settings.put({ key: 'streakCount', value: streakCount });
}

// Event Handlers
function showGoogleSignIn() {
  google.accounts.id.renderButton(document.getElementById('googleSignInButton'), {
    theme: 'outline',
    size: 'large',
    width: 300
  });
  bootstrap.Modal.getOrCreateInstance(document.getElementById('googleSignInModal')).show();
}

function googleSignOut() {
  if (googleUser) {
    google.accounts.id.disableAutoSelect();
    googleUser = null;
    document.getElementById('signedInUser').classList.add('d-none');
    document.getElementById('signInOption').classList.remove('d-none');
    document.getElementById('signOutOption').classList.add('d-none');
    document.getElementById('syncStatusText').textContent = 'Sign in to sync across devices';
    showToast('Signed out', 'info');
  }
}

function manualSync() {
  if (googleUser && isOnline) {
    saveDataToDrive();
  } else {
    showToast('Sign in and connect to sync', 'warning');
  }
}

function showAddTransactionModal() {
  document.getElementById('transactionForm').reset();
  document.getElementById('editTransactionIndex').value = '-1';
  document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
  document.getElementById('submitButtonText').textContent = 'Add';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('addTransactionModal')).show();
}

function editTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  if (tx) {
    document.getElementById('editTransactionIndex').value = id;
    document.getElementById('dateInput').value = tx.date;
    document.getElementById('amountInput').value = tx.amount;
    document.getElementById('descInput').value = tx.desc;
    document.getElementById('typeInput').value = tx.type;
    document.getElementById('categoryInput').value = tx.category;
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-pencil"></i> Edit Transaction';
    document.getElementById('submitButtonText').textContent = 'Save';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('addTransactionModal')).show();
  }
}

function confirmDeleteTransaction(id) {
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmationModal'));
  document.getElementById('confirmationTitle').textContent = 'Delete Transaction';
  document.getElementById('confirmationMessage').textContent = 'Are you sure you want to delete this transaction?';
  document.getElementById('confirmActionBtn').onclick = async () => {
    transactions = transactions.filter(t => t.id !== id);
    await saveTransactions(transactions);
    modal.hide();
    updateUI();
  };
  modal.show();
}

function showFutureIncomeModal() {
  document.getElementById('futureIncomeForm').reset();
  document.getElementById('futureIncomeIndex').value = '-1';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('futureIncomeModal')).show();
}

function showFutureExpenseModal() {
  document.getElementById('futureExpenseForm').reset();
  document.getElementById('futureExpenseIndex').value = '-1';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('futureExpenseModal')).show();
}

function showLoanModal() {
  document.getElementById('loanForm').reset();
  document.getElementById('loanIndex').value = '-1';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('loanModal')).show();
}

function editLoan(id, type) {
  const loan = loans[type].find(l => l.id === id);
  if (loan) {
    document.getElementById('loanIndex').value = id;
    document.getElementById('loanDescription').value = loan.description;
    document.getElementById('loanType').value = loan.type;
    document.getElementById('loanAmount').value = loan.amount;
    document.getElementById('loanInterestRate').value = loan.interestRate;
    document.getElementById('loanTermMonths').value = loan.termMonths;
    document.getElementById('loanStartDate').value = loan.startDate;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('loanModal')).show();
  }
}

function confirmDeleteLoan(id, type) {
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmationModal'));
  document.getElementById('confirmationTitle').textContent = 'Delete Loan';
  document.getElementById('confirmationMessage').textContent = 'Are you sure you want to delete this loan?';
  document.getElementById('confirmActionBtn').onclick = async () => {
    loans[type] = loans[type].filter(l => l.id !== id);
    await saveLoans(loans);
    modal.hide();
    renderDebtManagement();
  };
  modal.show();
}

async function deleteCategory(name) {
  if (transactions.some(t => t.category === name)) {
    showToast('Cannot delete category in use', 'danger');
    return;
  }
  categories = categories.filter(c => c.name !== name);
  await saveCategories(categories);
}

async function showAIInsights() {
  const insights = await AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
  document.getElementById('aiInsightsContent').innerHTML = insights.map(i => `
    <div class="alert alert-${i.type} d-flex align-items-center">
      <i class="bi ${i.icon} me-2"></i> ${i.message}
    </div>
  `).join('');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('aiInsightsModal')).show();
}

function addTransactionForCategory() {
  showAddTransactionModal();
  document.getElementById('categoryInput').value = currentCategoryFilter !== 'all' ? currentCategoryFilter : categories[0]?.name || '';
}

// Event Listeners
document.getElementById('transactionForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('editTransactionIndex').value || crypto.randomUUID();
  const transaction = {
    id,
    type: document.getElementById('typeInput').value,
    amount: parseFloat(document.getElementById('amountInput').value),
    category: document.getElementById('categoryInput').value,
    date: document.getElementById('dateInput').value,
    desc: document.getElementById('descInput').value
  };
  transactions = transactions.filter(t => t.id !== id);
  transactions.push(transaction);
  await saveTransactions(transactions);
  bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
  updateUI();
});

document.getElementById('futureIncomeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const index = document.getElementById('futureIncomeIndex').value;
  const ft = {
    id: index === '-1' ? crypto.randomUUID() : index,
    type: 'income',
    description: document.getElementById('futureIncomeDescription').value,
    amount: parseFloat(document.getElementById('futureIncomeAmount').value),
    frequency: document.getElementById('futureIncomeFrequency').value,
    startDate: document.getElementById('futureIncomeStartDate').value,
    endDate: document.getElementById('futureIncomeEndDate').value || null
  };
  futureTransactions.income = futureTransactions.income.filter(f => f.id !== index);
  futureTransactions.income.push(ft);
  await saveFutureTransactions(futureTransactions);
  bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal')).hide();
  renderPlannerProjections();
});

document.getElementById('futureExpenseForm').addEventListener('submit', async e => {
  e.preventDefault();
  const index = document.getElementById('futureExpenseIndex').value;
  const ft = {
    id: index === '-1' ? crypto.randomUUID() : index,
    type: 'expense',
    description: document.getElementById('futureExpenseDescription').value,
    amount: parseFloat(document.getElementById('futureExpenseAmount').value),
    frequency: document.getElementById('futureExpenseFrequency').value,
    startDate: document.getElementById('futureExpenseStartDate').value,
    endDate: document.getElementById('futureExpenseEndDate').value || null
  };
  futureTransactions.expenses = futureTransactions.expenses.filter(f => f.id !== index);
  futureTransactions.expenses.push(ft);
  await saveFutureTransactions(futureTransactions);
  bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal')).hide();
  renderPlannerProjections();
});

document.getElementById('loanForm').addEventListener('submit', async e => {
  e.preventDefault();
  const index = document.getElementById('loanIndex').value;
  const type = document.getElementById('loanType').value;
  const loan = {
    id: index === '-1' ? crypto.randomUUID() : index,
    type,
    description: document.getElementById('loanDescription').value,
    amount: parseFloat(document.getElementById('loanAmount').value),
    interestRate: parseFloat(document.getElementById('loanInterestRate').value),
    termMonths: parseInt(document.getElementById('loanTermMonths').value),
    startDate: document.getElementById('loanStartDate').value,
    status: 'active'
  };
  loans[type] = loans[type].filter(l => l.id !== index);
  loans[type].push(loan);
  await saveLoans(loans);
  bootstrap.Modal.getInstance(document.getElementById('loanModal')).hide();
  renderDebtManagement();
});

document.getElementById('addCategoryBtn').addEventListener('click', async () => {
  const name = document.getElementById('newCategoryInput').value;
  const type = document.getElementById('newCategoryType').value;
  if (name && !categories.find(c => c.name === name)) {
    categories.push({ name, type });
    await saveCategories(categories);
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = { transactions, categories, currency, monthlyBudgets, futureTransactions, loans };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finance_flow_export.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);
      transactions = data.transactions || [];
      categories = data.categories || [];
      currency = data.currency || 'USD';
      monthlyBudgets = data.monthlyBudgets || {};
      futureTransactions = data.futureTransactions || { income: [], expenses: [] };
      loans = data.loans || { given: [], taken: [] };
      await saveTransactions(transactions);
      await saveCategories(categories);
      await saveCurrency(currency);
      await saveMonthlyBudgets(monthlyBudgets);
      await saveFutureTransactions(futureTransactions);
      await saveLoans(loans);
      updateUI();
      showToast('Import successful', 'success');
    } catch {
      showToast('Import failed: Invalid file', 'danger');
    }
  };
  reader.readAsText(file);
});

document.getElementById('darkModeToggle').addEventListener('change', async function() {
  document.body.classList.toggle('dark-mode', this.checked);
  await db.settings.put({ key: 'darkMode', value: this.checked });
});

document.getElementById('autoRolloverToggle').addEventListener('change', async function() {
  const currentMonth = getCurrentMonthKey();
  monthlyBudgets[currentMonth] = monthlyBudgets[currentMonth] || { month: currentMonth, budget: 0 };
  monthlyBudgets[currentMonth].autoRollover = this.checked;
  await saveMonthlyBudgets(monthlyBudgets);
  calculateMonthlyRollover();
});

document.getElementById('allowNegativeRollover').addEventListener('change', async function() {
  const currentMonth = getCurrentMonthKey();
  monthlyBudgets[currentMonth] = monthlyBudgets[currentMonth] || { month: currentMonth, budget: 0 };
  monthlyBudgets[currentMonth].allowNegative = this.checked;
  await saveMonthlyBudgets(monthlyBudgets);
  calculateMonthlyRollover();
});

document.getElementById('currencySelect').addEventListener('change', async function() {
  await saveCurrency(this.value);
  updateUI();
});

document.getElementById('filterCategory').addEventListener('change', function() {
  currentCategoryFilter = this.value;
  renderTransactions();
});

document.getElementById('overviewChartType').addEventListener('change', function() {
  currentChartType = this.value;
  updateUI();
});

document.getElementById('plannerTimeframe').addEventListener('change', renderPlannerProjections);

document.getElementById('toggleCategorySettings').addEventListener('click', () => {
  const panel = document.getElementById('categorySettingsPanel');
  const icon = document.getElementById('catCollapseIcon');
  const isCollapsed = panel.classList.contains('show');
  icon.innerHTML = `<i class="bi bi-chevron-${isCollapsed ? 'right' : 'down'}"></i>`;
  bootstrap.Collapse.getOrCreateInstance(panel).toggle();
});

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-page').forEach(page => page.classList.add('d-none'));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('d-none');
    currentTab = btn.dataset.tab;
  });
});

window.addEventListener('online', () => {
  isOnline = true;
  if (googleUser) saveDataToDrive();
});

window.addEventListener('offline', () => {
  isOnline = false;
  showToast('Offline mode: Data will sync when online', 'warning');
});

// Initialization
async function init() {
  transactions = await loadTransactions();
  categories = await loadCategories();
  currency = await loadCurrency();
  monthlyBudgets = await loadMonthlyBudgets();
  futureTransactions = await loadFutureTransactions();
  loans = await loadLoans();
  streakCount = (await db.settings.get('streakCount'))?.value || 0;
  const darkMode = (await db.settings.get('darkMode'))?.value || false;
  document.getElementById('darkModeToggle').checked = darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  const currentMonth = getCurrentMonthKey();
  monthlyBudgets[currentMonth] = monthlyBudgets[currentMonth] || {
    month: currentMonth,
    budget: 0,
    autoRollover: true,
    allowNegative: false
  };
  await saveMonthlyBudgets(monthlyBudgets);
  google.accounts.id.initialize({
    client_id: 'YOUR_GOOGLE_CLIENT_ID',
    callback: async response => {
      googleUser = response;
      document.getElementById('userEmail').textContent = googleUser.email;
      document.getElementById('signedInUser').classList.remove('d-none');
      document.getElementById('signInOption').classList.add('d-none');
      document.getElementById('signOutOption').classList.remove('d-none');
      document.getElementById('syncStatusText').textContent = `Synced as ${googleUser.email}`;
      await loadDataFromDrive();
      updateUI();
    }
  });
  await calculateMonthlyRollover();
  await checkBudgetAlerts();
  await checkLoanAlerts();
  updateUI();
}

init();
