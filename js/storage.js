import { state } from './state.js';
import { StorageService } from './storage.js';
import { UI } from './ui.js';
import { AnalyticsEngine, BudgetEngine, PlannerEngine, DebtEngine } from './engines.js';
import { SyncService } from './sync.js';
import { showToast } from './utils.js';

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Wealth Command Initializing...');
    
    // 1. Load Data
    state.transactions = await StorageService.getTransactions();
    state.categories = await StorageService.getCategories();
    
    if (state.categories.length === 0) {
        state.categories = state.defaultCategories;
        await StorageService.saveCategories(state.categories);
    }
    
    state.monthlyBudgets = await StorageService.getMonthlyBudgets();
    
    // 2. Initialize Engines/Logic
    state.monthlyBudgets = BudgetEngine.ensureAllMonthsHaveBudgets(state.monthlyBudgets, state.transactions);
    state.monthlyBudgets = BudgetEngine.calculateMonthlyRollover(state.monthlyBudgets, state.transactions);
    
    // 3. Initialize UI
    UI.renderCategoryList();
    UI.renderTransactionList();
    UI.updateDashboard();
    
    // 4. Init Sync
    SyncService.init();
    
    // 5. Event Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-page').forEach(p => p.classList.add('d-none'));
            document.getElementById(`tab-${tabId}`).classList.remove('d-none');
            
            // Render specific tab content
            if(tabId === 'analytics') UI.renderCharts();
        });
    });

    // Add Transaction
    const form = document.getElementById('transactionForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const desc = document.getElementById('descInput').value;
            const amount = parseFloat(document.getElementById('amountInput').value);
            const type = document.getElementById('typeInput').value;
            const category = document.getElementById('categoryInput').value;
            const date = document.getElementById('dateInput').value;

            const newTx = { desc, amount, type, category, date };
            
            // Save to DB
            const id = await StorageService.addTransaction(newTx);
            newTx.id = id; // Update local object with ID
            
            // Update State
            state.transactions.push(newTx);
            
            // Refresh UI
            UI.renderTransactionList();
            UI.updateDashboard();
            
            // Close Modal
            const modalEl = document.getElementById('addTransactionModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            form.reset();
            showToast('Transaction Added', 'success');
        });
    }

    // Google Sign In
    document.getElementById('btnGoogleSignIn')?.addEventListener('click', () => SyncService.signIn());
    
    // Delete Transaction Delegation
    document.getElementById('transactionsBody').addEventListener('click', async (e) => {
        if (e.target.closest('.btn-delete-tx')) {
            const btn = e.target.closest('.btn-delete-tx');
            const id = parseInt(btn.dataset.id); // Dexie IDs are numbers
            
            if(confirm('Delete this transaction?')) {
                await StorageService.deleteTransaction(id);
                state.transactions = state.transactions.filter(t => t.id !== id && t !== state.transactions[id]); // Handle both ID types
                UI.renderTransactionList();
                UI.updateDashboard();
            }
        }
    });

    // Category Inputs
    document.getElementById('typeInput').addEventListener('change', () => UI.updateCategorySelect());
}
