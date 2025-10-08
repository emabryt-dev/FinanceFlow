// Finance Flow - Enhanced Financial Management App
class FinanceFlow {
    constructor() {
        this.transactions = this.loadData('transactions') || [];
        this.categories = this.loadData('categories') || this.getDefaultCategories();
        this.settings = this.loadData('settings') || this.getDefaultSettings();
        this.aiInsights = [];
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupServiceWorker();
        this.calculateAIInsights();
        this.updateDashboard();
        this.setupSync();
    }

    // Enhanced Data Management
    loadData(key) {
        try {
            return JSON.parse(localStorage.getItem(`financeFlow_${key}`));
        } catch {
            return null;
        }
    }

    saveData(key, data) {
        localStorage.setItem(`financeFlow_${key}`, JSON.stringify(data));
        this.triggerSync();
    }

    getDefaultCategories() {
        return [
            { id: 1, name: 'Salary', type: 'income', color: '#10B981', icon: 'bi-bank' },
            { id: 2, name: 'Food', type: 'expense', color: '#EF476F', icon: 'bi-cup-straw' },
            { id: 3, name: 'Transport', type: 'expense', color: '#FFD166', icon: 'bi-car-front' },
            { id: 4, name: 'Entertainment', type: 'expense', color: '#7209B7', icon: 'bi-controller' },
            { id: 5, name: 'Shopping', type: 'expense', color: '#4361EE', icon: 'bi-bag' }
        ];
    }

    getDefaultSettings() {
        return {
            currency: 'PKR',
            theme: 'auto',
            autoSync: true,
            notifications: true,
            biometricAuth: false
        };
    }

    // Enhanced AI Engine
    calculateAIInsights() {
        const insights = [];
        
        // Spending pattern analysis
        const spendingPattern = this.analyzeSpendingPattern();
        if (spendingPattern.trend > 0.1) {
            insights.push({
                type: 'warning',
                message: `Your ${spendingPattern.category} spending increased by ${(spendingPattern.trend * 100).toFixed(1)}%`,
                icon: 'bi-graph-up-arrow',
                priority: 2
            });
        }

        // Savings rate analysis
        const savingsRate = this.calculateSavingsRate();
        if (savingsRate < 0.1) {
            insights.push({
                type: 'warning',
                message: 'Your savings rate is low. Consider reducing expenses.',
                icon: 'bi-piggy-bank',
                priority: 1
            });
        }

        // Budget optimization
        const budgetTips = this.generateBudgetTips();
        insights.push(...budgetTips);

        // Predictive insights
        const predictions = this.generatePredictions();
        insights.push(...predictions);

        this.aiInsights = insights.sort((a, b) => b.priority - a.priority);
        return this.aiInsights;
    }

    analyzeSpendingPattern() {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const currentSpending = this.getMonthlySpending(new Date());
        const previousSpending = this.getMonthlySpending(lastMonth);
        
        let maxIncrease = 0;
        let trendCategory = '';
        
        Object.keys(currentSpending).forEach(category => {
            if (previousSpending[category]) {
                const increase = (currentSpending[category] - previousSpending[category]) / previousSpending[category];
                if (increase > maxIncrease) {
                    maxIncrease = increase;
                    trendCategory = category;
                }
            }
        });
        
        return { trend: maxIncrease, category: trendCategory };
    }

    calculateSavingsRate() {
        const monthlyData = this.getMonthlySummary(new Date());
        return monthlyData.income > 0 ? (monthlyData.income - monthlyData.expenses) / monthlyData.income : 0;
    }

    generateBudgetTips() {
        const tips = [];
        const monthlyData = this.getMonthlySummary(new Date());
        
        if (monthlyData.expenses / monthlyData.income > 0.7) {
            tips.push({
                type: 'info',
                message: 'Over 70% of income spent. Review your budget.',
                icon: 'bi-exclamation-triangle',
                priority: 2
            });
        }
        
        const categorySpending = this.getCategorySpending();
        const highSpending = Object.entries(categorySpending)
            .filter(([_, amount]) => amount > monthlyData.income * 0.3)
            .map(([category]) => category);
            
        if (highSpending.length > 0) {
            tips.push({
                type: 'info',
                message: `High spending in ${highSpending.join(', ')}`,
                icon: 'bi-coin',
                priority: 1
            });
        }
        
        return tips;
    }

    generatePredictions() {
        const predictions = [];
        const monthlyData = this.getMonthlySummary(new Date());
        
        if (monthlyData.balance < 0) {
            predictions.push({
                type: 'warning',
                message: 'Projected negative balance this month',
                icon: 'bi-calculator',
                priority: 3
            });
        }
        
        const savingsGoal = this.calculateSavingsGoal();
        if (savingsGoal) {
            predictions.push({
                type: 'positive',
                message: savingsGoal,
                icon: 'bi-bullseye',
                priority: 1
            });
        }
        
        return predictions;
    }

    calculateSavingsGoal() {
        const monthlySavings = this.getMonthlySummary(new Date()).balance;
        if (monthlySavings <= 0) return null;
        
        const emergencyFund = 100000; // Example goal
        const months = Math.ceil(emergencyFund / monthlySavings);
        
        return `At current rate, emergency fund in ${months} months`;
    }

    // Enhanced Sync System
    async triggerSync() {
        if (!this.isOnline || !this.settings.autoSync) return;
        
        try {
            await this.syncWithDrive();
            this.showToast('Data synced successfully', 'success');
        } catch (error) {
            console.error('Sync failed:', error);
            this.queueSync();
        }
    }

    async syncWithDrive() {
        // Enhanced Google Drive sync implementation
        if (!this.googleUser) return;
        
        const syncData = {
            transactions: this.transactions,
            categories: this.categories,
            settings: this.settings,
            lastSync: new Date().toISOString(),
            version: '2.0'
        };
        
        // Implementation for Google Drive API
        await this.uploadToDrive(syncData);
    }

    queueSync() {
        // Queue for retry when online
        if ('serviceWorker' in navigator && 'sync' in registration) {
            registration.sync.register('finance-sync');
        }
    }

    // UI Management
    updateDashboard() {
        this.updateQuickStats();
        this.updateRecentTransactions();
        this.updateAIInsights();
        this.updateHealthScore();
    }

    updateQuickStats() {
        const monthlyData = this.getMonthlySummary(new Date());
        
        document.getElementById('quickIncome').textContent = 
            this.formatCurrency(monthlyData.income);
        document.getElementById('quickExpense').textContent = 
            this.formatCurrency(monthlyData.expenses);
        document.getElementById('quickBalance').textContent = 
            this.formatCurrency(monthlyData.balance);
    }

    updateRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        const recent = this.transactions.slice(-5).reverse();
        
        container.innerHTML = recent.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-icon ${transaction.type}">
                    <i class="bi ${this.getCategoryIcon(transaction.category)}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.description}</div>
                    <div class="transaction-meta">
                        ${transaction.category} • ${this.formatDate(transaction.date)}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
    }

    updateAIInsights() {
        const container = document.getElementById('aiQuickInsights');
        const quickInsights = this.aiInsights.slice(0, 3);
        
        container.innerHTML = quickInsights.map(insight => `
            <div class="ai-insight ${insight.type}">
                <i class="bi ${insight.icon} me-2"></i>
                ${insight.message}
            </div>
        `).join('');
    }

    updateHealthScore() {
        const score = this.calculateHealthScore();
        document.getElementById('healthScore').textContent = score;
        
        const progressBar = document.querySelector('.health-score-progress .progress-bar');
        progressBar.style.width = `${score}%`;
        
        // Update color based on score
        if (score >= 80) progressBar.style.background = 'linear-gradient(90deg, #10B981, #06D6A0)';
        else if (score >= 60) progressBar.style.background = 'linear-gradient(90deg, #FFD166, #FF9E6D)';
        else progressBar.style.background = 'linear-gradient(90deg, #EF476F, #FF6B6B)';
    }

    calculateHealthScore() {
        // Comprehensive health score calculation
        const savingsRate = this.calculateSavingsRate();
        const expenseStability = this.calculateExpenseStability();
        const debtRatio = this.calculateDebtRatio();
        
        return Math.min(100, Math.max(0, 
            (savingsRate * 50) + 
            (expenseStability * 30) + 
            ((1 - debtRatio) * 20)
        ));
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: this.settings.currency
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    getCategoryIcon(categoryName) {
        const category = this.categories.find(cat => cat.name === categoryName);
        return category ? category.icon : 'bi-tag';
    }

    getMonthlySpending(date) {
        const month = date.getMonth();
        const year = date.getFullYear();
        
        return this.transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === month && 
                       tDate.getFullYear() === year && 
                       t.type === 'expense';
            })
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});
    }

    getMonthlySummary(date) {
        const month = date.getMonth();
        const year = date.getFullYear();
        
        const monthlyTransactions = this.transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === month && tDate.getFullYear() === year;
        });
        
        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        return {
            income,
            expenses,
            balance: income - expenses
        };
    }

    getCategorySpending() {
        const currentMonth = new Date();
        return this.getMonthlySpending(currentMonth);
    }

    calculateExpenseStability() {
        // Calculate how stable expenses are month-to-month
        const months = 3;
        let variance = 0;
        
        for (let i = 0; i < months; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthlyData = this.getMonthlySummary(date);
            variance += Math.abs(monthlyData.expenses);
        }
        
        return Math.max(0, 1 - (variance / (months * this.getMonthlySummary(new Date()).income)));
    }

    calculateDebtRatio() {
        // Simplified debt ratio calculation
        const monthlyData = this.getMonthlySummary(new Date());
        return monthlyData.income > 0 ? monthlyData.expenses / monthlyData.income : 1;
    }

    // Event Handlers and Setup
    setupEventListeners() {
        // Bottom navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.showTab(tab);
            });
        });

        // FAB interactions
        const fab = document.getElementById('mainFab');
        fab.addEventListener('click', () => {
            this.toggleFABMenu();
        });

        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.triggerSync();
            this.showToast('Back online - Syncing data', 'info');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('Working offline', 'warning');
        });

        // Swipe gestures for mobile
        this.setupSwipeGestures();
    }

    setupSwipeGestures() {
        let startX = 0;
        let endX = 0;

        document.addEventListener('touchstart', e => {
            startX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', e => {
            endX = e.changedTouches[0].screenX;
            this.handleSwipe(startX, endX);
        });
    }

    handleSwipe(startX, endX) {
        const diff = startX - endX;
        const tabs = ['dashboard', 'transactions', 'analytics', 'planner', 'settings'];
        const currentTab = this.getCurrentTab();
        const currentIndex = tabs.indexOf(currentTab);

        if (Math.abs(diff) > 50) { // Minimum swipe distance
            if (diff > 0 && currentIndex < tabs.length - 1) {
                // Swipe left - next tab
                this.showTab(tabs[currentIndex + 1]);
            } else if (diff < 0 && currentIndex > 0) {
                // Swipe right - previous tab
                this.showTab(tabs[currentIndex - 1]);
            }
        }
    }

    getCurrentTab() {
        return document.querySelector('.nav-btn.active')?.dataset.tab || 'dashboard';
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-page').forEach(tab => {
            tab.classList.add('d-none');
        });

        // Show selected tab
        document.getElementById(`tab-${tabName}`).classList.remove('d-none');

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Tab-specific initializations
        this.initializeTab(tabName);
    }

    initializeTab(tabName) {
        switch (tabName) {
            case 'analytics':
                this.initializeAnalytics();
                break;
            case 'planner':
                this.initializePlanner();
                break;
            case 'settings':
                this.initializeSettings();
                break;
        }
    }

    toggleFABMenu() {
        const fabMenu = document.querySelector('.fab-menu');
        fabMenu.classList.toggle('active');
    }

    quickAddTransaction(type) {
        // Quick add transaction flow
        const amount = prompt(`Enter ${type} amount:`);
        if (amount && !isNaN(amount)) {
            const description = prompt('Enter description:') || 'Quick Entry';
            const category = this.categories.find(cat => cat.type === type)?.name || 'Other';
            
            this.addTransaction({
                date: new Date().toISOString().split('T')[0],
                description,
                type,
                category,
                amount: parseFloat(amount)
            });
        }
    }

    addTransaction(transaction) {
        this.transactions.push(transaction);
        this.saveData('transactions', this.transactions);
        this.updateDashboard();
        this.calculateAIInsights();
        this.showToast('Transaction added', 'success');
    }

    quickAddTransfer() {
        // Implement quick transfer between accounts
        this.showToast('Transfer feature coming soon', 'info');
    }

    showAIDetails() {
        // Show detailed AI analysis
        const modalContent = this.aiInsights.map(insight => `
            <div class="ai-insight ${insight.type} mb-2">
                <i class="bi ${insight.icon} me-2"></i>
                ${insight.message}
            </div>
        `).join('');
        
        this.showCustomModal('AI Financial Analysis', modalContent);
    }

    showCustomModal(title, content) {
        // Implementation for custom modal
        const modalId = 'customModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content glass-card">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        new bootstrap.Modal(modal).show();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        new bootstrap.Toast(toast).show();
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }
    }

    setupSync() {
        // Initialize Google Drive sync
        this.initializeGoogleAuth();
    }

    initializeGoogleAuth() {
        // Google Drive sync initialization
        if (window.google) {
            // Google auth implementation
        }
    }
}

// Google Drive Sync Implementation
class GoogleDriveSync {
    constructor() {
        this.clientId = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';
        this.fileName = 'finance_flow_data.json';
    }

    async authenticate() {
        // Google OAuth implementation
    }

    async uploadData(data) {
        // Upload to Google Drive
    }

    async downloadData() {
        // Download from Google Drive
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.financeFlow = new FinanceFlow();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FinanceFlow, GoogleDriveSync };
}
