// =======================
// FinanceFlow App
// =======================

let transactions = [];
let categories = ["Salary", "Food", "Shopping", "Bills", "Other"];

// Load state from localStorage
function loadData() {
  const tx = localStorage.getItem("transactions");
  if (tx) transactions = JSON.parse(tx);
}
function saveData() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// Add transaction
function addTransaction(desc, amount, type, category) {
  const tx = {
    id: Date.now(),
    date: new Date().toISOString().slice(0,10),
    description: desc,
    amount: parseFloat(amount),
    type,
    category
  };
  transactions.unshift(tx);
  saveData();
  render();
  syncNow(); // trigger Google Drive sync
}

// Render dashboard summary
function renderSummary() {
  const income = transactions.filter(t=>t.type==="income").reduce((s,a)=>s+a.amount,0);
  const expense = transactions.filter(t=>t.type==="expense").reduce((s,a)=>s+a.amount,0);
  const balance = income - expense;

  document.getElementById("summary").innerHTML = `
    <div class="card"><div>Income</div><div>${income.toFixed(2)}</div></div>
    <div class="card"><div>Expense</div><div>${expense.toFixed(2)}</div></div>
    <div class="card"><div>Balance</div><div>${balance.toFixed(2)}</div></div>
  `;
}

// Render transactions
function renderTransactions() {
  const list = document.getElementById("tx-list");
  list.innerHTML = "";
  if (transactions.length === 0) {
    list.innerHTML = `<div class="card">No transactions yet</div>`;
    return;
  }
  transactions.forEach(tx => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <b>${tx.description}</b><br>
      ${tx.category} • ${tx.date}<br>
      <span style="color:${tx.type==="expense"?"#EF476F":"#06D6A0"}">
        ${tx.type==="expense"?"-":"+"}${tx.amount.toFixed(2)}
      </span>
    `;
    list.appendChild(el);
  });
}

// Render analytics chart
let chart;
function renderAnalytics() {
  const ctx = document.getElementById("spending-chart");
  const months = {};
  transactions.forEach(tx => {
    const m = tx.date.slice(0,7);
    months[m] = (months[m]||0) + (tx.type==="expense"?tx.amount:-tx.amount);
  });

  const labels = Object.keys(months);
  const data = Object.values(months);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{ label:"Net Spending", data, fill:true }]
    }
  });
}

// Floating Action Button
document.getElementById("fab").addEventListener("click", async () => {
  const desc = prompt("Description:");
  const amount = prompt("Amount:");
  if (!desc || !amount) return;
  let type = confirm("Is this an expense?") ? "expense" : "income";

  // AI auto-category
  const category = await aiCategorize(desc, categories);
  addTransaction(desc, amount, type, category);
});

// Render all
function render() {
  renderSummary();
  renderTransactions();
  renderAnalytics();
}

// Init
loadData();
render();
