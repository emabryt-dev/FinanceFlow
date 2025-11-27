import { state } from './state.js';
import { formatCurrency, showToast } from './utils.js';

export const UI = {
    renderCategoryList() {
        const ul = document.getElementById('categoryList');
        if(!ul) return;
        ul.innerHTML = '';
        
        state.categories.forEach(cat => {
            const li = document.createElement('li');
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            li.innerHTML = `
                <span>${cat.name} <span class="badge bg-${cat.type === 'income' ? 'success' : 'danger'}">${cat.type}</span></span>
            `;
            ul.appendChild(li);
        });
        
        this.updateCategorySelect();
    },

    updateCategorySelect() {
        const typeSelect = document.getElementById('typeInput');
        const categorySelect = document.getElementById('categoryInput');
        if(!typeSelect || !categorySelect) return;

        const currentType = typeSelect.value;
        const filtered = state.categories.filter(c => c.type === currentType);
        
        categorySelect.innerHTML = '';
        filtered.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
            opt.textContent = cat.name;
            categorySelect.appendChild(opt);
        });
    },

    renderTransactionList() {
        const tbody = document.getElementById('transactionsBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if (state.transactions.length === 0) {
            document.getElementById('noTransactions').style.display = 'block';
            return;
        }
        document.getElementById('noTransactions').style.display = 'none';

        // Sort descending
        const sorted = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

        sorted.forEach((tx, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${tx.date}</td>
                <td>${tx.desc}</td>
                <td class="${tx.type === 'income' ? 'text-success' : 'text-danger'} fw-bold">${tx.type}</td>
                <td>${tx.category}</td>
                <td class="fw-bold">${formatCurrency(tx.amount, state.currency)}</td>
                <td><button class="btn btn-sm text-danger btn-delete-tx" data-id="${tx.id || index}"><i class="bi bi-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    },

    updateDashboard() {
        const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        document.getElementById('totalIncome').textContent = formatCurrency(totalIncome, state.currency);
        document.getElementById('totalExpense').textContent = formatCurrency(totalExpense, state.currency);
        document.getElementById('netWealth').textContent = formatCurrency(totalIncome - totalExpense, state.currency);
    },

    renderCharts() {
        const ctx = document.getElementById('overviewChart');
        if (!ctx) return;
        
        // Destroy existing if needed (requires storing chart instance in state)
        // For simplicity in this generated code, we assume clean render or handle later
        
        // Simple data prep
        const income = state.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
        const expense = state.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    label: 'Amount',
                    data: [income, expense],
                    backgroundColor: ['#198754', '#dc3545']
                }]
            }
        });
    }
};
