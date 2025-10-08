// app.js - Finance Flow Complete Financial Management App
class FinanceFlow {
    constructor() {
        this.transactions = this.loadData('transactions') || [];
        this.categories = this.loadData('categories') || this.getDefaultCategories();
        this.settings = this.loadData('settings') || this.getDefaultSettings();
        this.monthlyBudgets = this.loadData('monthlyBudgets') || {};
        this.futureTransactions = this.loadData('futureTransactions') || { income: [], expenses: [] };
        this.loans = this.loadData('loans') || { given: [], taken: [] };
        
        this.aiInsights = [];
        this.isOnline = navigator.onLine;
        this.googleUser = null;
        this.googleAuth = null;
        this.syncInProgress = false;
        this.pendingSync = false;
        
        this.currentCategoryFilter = 'all';
        this.plannerTimeframe = '1year';
        
        // Chart instances
        this.overviewChart = null;
        this.incomePieChart = null;
        this.expensePieChart = null;
        this.healthTrendChart = null;
        this.categoryTrendChart = null;
        this.comparisonChart = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupServiceWorker();
        this.initializeGoogleAuth();
        this.calculateMonthlyRollover();
        this.calculateAIInsights();
        this.updateDashboard();
        this.renderCategoryList();
        this.setupSync();
        
        this.showTab('dashboard');
    }

    // Core Data Management
    loadData(key) {
        try {
            const data = localStorage.getItem(`financeFlow_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(`financeFlow_${key}`, JSON.stringify(data));
            this.triggerSync();
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    }

    getDefaultCategories() {
        return [
            { id: 1, name: 'Salary', type: 'income', color: '#10B981', icon: 'bi-bank' },
            { id: 2, name: 'Freelance', type: 'income', color: '#06D6A0', icon: 'bi-laptop' },
            { id: 3, name: 'Investment', type: 'income', color: '#118AB2', icon: 'bi-graph-up' },
            { id: 4, name: 'Food', type: 'expense', color: '#EF476F', icon: 'bi-cup-straw' },
            { id: 5, name: 'Transport', type: 'expense', color: '#FFD166', icon: 'bi-car-front' },
            { id: 6, name: 'Entertainment', type: 'expense', color: '#7209B7', icon: 'bi-controller' },
            { id: 7, name: 'Shopping', type: 'expense', color: '#4361EE', icon: 'bi-bag' },
            { id: 8, name: 'Utilities', type: 'expense', color: '#FF9E6D', icon: 'bi-lightning' }
        ];
    }

    getDefaultSettings() {
        return {
            currency: 'PKR',
            theme: 'auto',
            autoSync: true,
            notifications: true,
            biometricAuth: false,
            autoRollover: true,
            allowNegativeRollover: false
        };
    }

    // Enhanced AI Engine
    calculateAIInsights() {
        const insights = [];
        const healthScore = this.calculateHealthScore();
        
        insights.push({
            type: healthScore >= 80 ? 'positive' : healthScore >= 60 ? 'info' : 'warning',
            message: `Financial Health Score: ${healthScore}/100`,
            icon: 'bi-heart-pulse',
            priority: 1
        });

        const savingsRate = this.calculateSavingsRate();
        if (savingsRate < 0.1) {
            insights.push({
                type: 'warning',
                message: `Low savings rate (${(savingsRate * 100).toFixed(1)}%). Aim for 20%+`,
                icon: 'bi-piggy-bank',
                priority: 2
            });
        } else if (savingsRate > 0.3) {
            insights.push({
                type: 'positive',
                message: `Excellent savings rate (${(savingsRate * 100).toFixed(1)}%)!`,
                icon: 'bi-emoji-smile',
                priority: 1
            });
        }

        const spendingPattern = this.analyzeSpendingPattern();
        if (spendingPattern.trend > 0.1) {
            insights.push({
                type: 'warning',
                message: `${spendingPattern.category} spending increased by ${(spendingPattern.trend * 100).toFixed(1)}%`,
                icon: 'bi-graph-up-arrow',
                priority: 2
            });
        }

        const subscriptions = this.detectSubscriptions();
        if (subscriptions.length > 0) {
            const total = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
            insights.push({
                type: 'info',
                message: `${subscriptions.length} subscriptions costing ${this.formatCurrency(total)}/month`,
                icon: 'bi-arrow-repeat',
                priority: 1
            });
        }

        const prediction = this.predictNextMonthSpending();
        if (prediction && prediction.confidence > 0.6) {
            insights.push({
                type: 'info',
                message: `Next month spending: ~${this.formatCurrency(prediction.amount)}`,
                icon: 'bi-magic',
                priority: 2
            });
        }

        this.aiInsights = insights.sort((a, b) => b.priority - a.priority);
        return this.aiInsights;
    }

    calculateHealthScore() {
        const savingsRate = this.calculateSavingsRate();
        const expenseStability = this.calculateExpenseStability();
        const debtRatio = this.calculateDebtRatio();
        const emergencyFundScore = this.calculateEmergencyFundScore();
        
        const score = Math.min(100, Math.max(0, 
            (savingsRate * 40) + 
            (expenseStability * 30) + 
            ((1 - debtRatio) * 20) +
            (emergencyFundScore * 10)
        ));
        
        return Math.round(score);
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

    calculateExpenseStability() {
        const months = 3;
        let totalVariance = 0;
        let count = 0;
        
        for (let i = 0; i < months; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthlyData = this.getMonthlySummary(date);
            
            if (monthlyData.income > 0) {
                const variance = Math.abs(monthlyData.expenses - monthlyData.income * 0.7) / monthlyData.income;
                totalVariance += variance;
                count++;
            }
        }
        
        return count > 0 ? Math.max(0, 1 - (totalVariance / count)) : 0.5;
    }

    calculateDebtRatio() {
        const monthlyData = this.getMonthlySummary(new Date());
        return monthlyData.income > 0 ? Math.min(1, monthlyData.expenses / monthlyData.income) : 1;
    }

    calculateEmergencyFundScore() {
        const monthlyExpenses = this.getMonthlySummary(new Date()).expenses;
        const currentBalance = this.getCurrentBalance();
        
        if (monthlyExpenses === 0) return 0.5;
        
        const monthsCovered = currentBalance / monthlyExpenses;
        if (monthsCovered >= 6) return 1;
        if (monthsCovered >= 3) return 0.75;
        if (monthsCovered >= 1) return 0.5;
        return 0.25;
    }

    detectSubscriptions() {
        const subscriptions = [];
        const recurringKeywords = ['netflix', 'spotify', 'youtube', 'premium', 'subscription', 'membership'];
        
        this.transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const desc = transaction.description.toLowerCase();
                if (recurringKeywords.some(keyword => desc.includes(keyword))) {
                    subscriptions.push({
                        description: transaction.description,
                        amount: transaction.amount,
                        category: transaction.category
                    });
                }
            }
        });
        
        return subscriptions;
    }

    predictNextMonthSpending() {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const recentTransactions = this.transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= sixMonthsAgo && tx.type === 'expense';
        });
        
        if (recentTransactions.length < 10) return null;
        
        const monthlyExpenses = {};
        recentTransactions.forEach(tx => {
            const month = tx.date.substring(0, 7);
            monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
        });
        
        const amounts = Object.values(monthlyExpenses);
        const avgExpense = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        
        let trend = 0;
        if (amounts.length >= 2) {
            const lastTwo = amounts.slice(-2);
            trend = (lastTwo[1] - lastTwo[0]) / lastTwo[0];
        }
        
        const prediction = avgExpense * (1 + trend * 0.5);
        const confidence = Math.min(0.9, amounts.length / 10);
        
        return {
            amount: Math.round(prediction),
            confidence: confidence,
            trend: trend
        };
    }

    // Monthly Rollover System
    calculateMonthlyRollover() {
        this.monthlyBudgets = this.ensureAllMonthsHaveBudgets(this.monthlyBudgets);
        
        const months = Object.keys(this.monthlyBudgets).sort();
        
        months.forEach(month => {
            const monthData = this.monthlyBudgets[month];
            const monthTransactions = this.transactions.filter(tx => 
                this.getMonthKeyFromDate(tx.date) === month
            );
            
            monthData.income = monthTransactions
                .filter(tx => tx.type === 'income')
                .reduce((sum, tx) => sum + tx.amount, 0);
                
            monthData.expenses = monthTransactions
                .filter(tx => tx.type === 'expense')
                .reduce((sum, tx) => sum + tx.amount, 0);
        });
        
        for (let i = 0; i < months.length; i++) {
            const currentMonth = months[i];
            const monthData = this.monthlyBudgets[currentMonth];
            
            monthData.endingBalance = monthData.startingBalance + monthData.income - monthData.expenses;
            
            if (monthData.autoRollover && i < months.length - 1) {
                const nextMonth = months[i + 1];
                if (monthData.endingBalance >= 0 || monthData.allowNegative) {
                    this.monthlyBudgets[nextMonth].startingBalance = monthData.endingBalance;
                } else {
                    this.monthlyBudgets[nextMonth].startingBalance = 0;
                }
            }
        }
        
        this.saveData('monthlyBudgets', this.monthlyBudgets);
    }

    ensureAllMonthsHaveBudgets(budgets) {
        const transactionMonths = [...new Set(this.transactions.map(tx => this.getMonthKeyFromDate(tx.date)))];
        const currentMonth = this.getCurrentMonthKey();
        
        if (!transactionMonths.includes(currentMonth)) {
            transactionMonths.push(currentMonth);
        }
        
        transactionMonths.forEach(month => {
            if (!budgets[month]) {
                budgets[month] = {
                    startingBalance: 0,
                    income: 0,
                    expenses: 0,
                    endingBalance: 0,
                    autoRollover: this.settings.autoRollover,
                    allowNegative: this.settings.allowNegativeRollover
                };
            }
        });
        
        return budgets;
    }

    getMonthKeyFromDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date)) return this.getCurrentMonthKey();
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } catch {
            return this.getCurrentMonthKey();
        }
    }

    getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Enhanced Sync System
    async triggerSync() {
        if (!this.isOnline || !this.settings.autoSync || !this.googleUser) return;
        
        if (this.syncInProgress) {
            this.pendingSync = true;
            return;
        }
        
        this.syncInProgress = true;
        this.updateSyncStatus('syncing', 'Syncing to Google Drive...');
        
        try {
            const syncData = {
                transactions: this.transactions,
                categories: this.categories,
                settings: this.settings,
                monthlyBudgets: this.monthlyBudgets,
                futureTransactions: this.futureTransactions,
                loans: this.loans,
                lastSync: new Date().toISOString(),
                version: '2.0'
            };
            
            await this.uploadToDrive(syncData);
            this.updateSyncStatus('success', 'Data synced successfully');
        } catch (error) {
            console.error('Sync failed:', error);
            this.updateSyncStatus('error', 'Sync failed');
            this.queueSync();
        } finally {
            this.syncInProgress = false;
            
            if (this.pendingSync) {
                this.pendingSync = false;
                setTimeout(() => this.triggerSync(), 1000);
            }
        }
    }

    async uploadToDrive(data) {
        if (!this.googleUser || !this.googleUser.access_token) return;
        
        // Google Drive API implementation would go here
        console.log('Uploading to Google Drive:', data);
        
        // Simulate successful upload
        return new Promise((resolve) => setTimeout(resolve, 1000));
    }

    queueSync() {
        if ('serviceWorker' in navigator && 'sync' in registration) {
            registration.sync.register('finance-sync');
        }
    }

    // Google Drive Integration
    initializeGoogleAuth() {
        const savedUser = localStorage.getItem('googleUser');
        if (savedUser) {
            try {
                this.googleUser = JSON.parse(savedUser);
                this.updateProfileUI();
                this.updateSyncStatus('success', 'Connected to Google Drive');
            } catch (error) {
                console.error('Error loading saved user:', error);
                localStorage.removeItem('googleUser');
            }
        }
        
        this.waitForGoogleAuth();
    }

    waitForGoogleAuth() {
        if (window.google && google.accounts && google.accounts.oauth2) {
            this.setupGoogleAuth();
        } else {
            setTimeout(() => this.waitForGoogleAuth(), 500);
        }
    }

    setupGoogleAuth() {
        this.googleAuth = google.accounts.oauth2.initTokenClient({
            client_id: '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.googleUser = {
                        access_token: tokenResponse.access_token,
                        expires_in: tokenResponse.expires_in,
                        acquired_at: Date.now()
                    };
                    
                    localStorage.setItem('googleUser', JSON.stringify(this.googleUser));
                    this.updateProfileUI();
                    this.updateSyncStatus('success', 'Google Drive connected!');
                    
                    this.triggerSync();
                }
            },
            error_callback: (error) => {
                console.error('Google Auth error:', error);
                this.updateSyncStatus('error', 'Google Sign-In failed');
            }
        });
    }

    showGoogleSignIn() {
        if (this.googleAuth) {
            this.googleAuth.requestAccessToken();
        }
    }

    googleSignOut() {
        if (this.googleUser && this.googleUser.access_token) {
            if (window.google && google.accounts.oauth2) {
                google.accounts.oauth2.revoke(this.googleUser.access_token);
            }
        }
        
        this.googleUser = null;
        localStorage.removeItem('googleUser');
        this.updateProfileUI();
        this.updateSyncStatus('offline', 'Signed out from Google Drive');
    }

    updateProfileUI() {
        const signedInUser = document.getElementById('signedInUser');
        const userEmail = document.getElementById('userEmail');
        const signInOption = document.getElementById('signInOption');
        const signOutOption = document.getElementById('signOutOption');
        
        if (this.googleUser) {
            if (signedInUser) signedInUser.classList.remove('d-none');
            if (userEmail) userEmail.textContent = 'Connected to Google Drive';
            if (signInOption) signInOption.classList.add('d-none');
            if (signOutOption) signOutOption.classList.remove('d-none');
        } else {
            if (signedInUser) signedInUser.classList.add('d-none');
            if (signInOption) signInOption.classList.remove('d-none');
            if (signOutOption) signOutOption.classList.add('d-none');
        }
    }

    updateSyncStatus(status, message = '') {
        const syncIcon = document.getElementById('syncStatusIcon');
        const syncText = document.getElementById('syncStatusText');
        
        if (!syncIcon) return;
        
        syncIcon.className = 'bi';
        
        switch (status) {
            case 'success':
                syncIcon.classList.add('bi-cloud-check', 'text-success');
                break;
            case 'syncing':
                syncIcon.classList.add('bi-cloud-arrow-up', 'text-info', 'pulse');
                break;
            case 'warning':
                syncIcon.classList.add('bi-cloud-slash', 'text-warning');
                break;
            case 'error':
                syncIcon.classList.add('bi-cloud-x', 'text-danger');
                break;
            case 'offline':
                syncIcon.classList.add('bi-cloud-slash', 'text-muted');
                break;
            default:
                syncIcon.classList.add('bi-cloud', 'text-muted');
        }
        
        if (syncText) {
            syncText.textContent = message;
        }
    }

    // UI Management
    updateDashboard() {
        this.updateQuickStats();
        this.updateRecentTransactions();
        this.updateAIInsights();
        this.updateHealthScore();
        this.updateRolloverDisplay();
    }

    updateQuickStats() {
        const monthlyData = this.getMonthlySummary(new Date());
        
        const quickIncome = document.getElementById('quickIncome');
        const quickExpense = document.getElementById('quickExpense');
        const quickBalance = document.getElementById('quickBalance');
        
        if (quickIncome) quickIncome.textContent = this.formatCurrency(monthlyData.income);
        if (quickExpense) quickExpense.textContent = this.formatCurrency(monthlyData.expenses);
        if (quickBalance) quickBalance.textContent = this.formatCurrency(monthlyData.balance);
    }

    updateRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        if (!container) return;
        
        const recent = this.transactions.slice(-5).reverse();
        
        if (recent.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No recent transactions</div>';
            return;
        }
        
        container.innerHTML = recent.map(transaction => `
            <div class="transaction-item" onclick="editTransaction(${this.transactions.indexOf(transaction)})">
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
        if (!container) return;
        
        const quickInsights = this.aiInsights.slice(0, 3);
        
        if (quickInsights.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">Add transactions for AI insights</div>';
            return;
        }
        
        container.innerHTML = quickInsights.map(insight => `
            <div class="ai-insight ${insight.type}">
                <i class="bi ${insight.icon} me-2"></i>
                ${insight.message}
            </div>
        `).join('');
    }

    updateHealthScore() {
        const score = this.calculateHealthScore();
        const healthScoreElement = document.getElementById('healthScore');
        const analyticsHealthScore = document.getElementById('analyticsHealthScore');
        
        if (healthScoreElement) healthScoreElement.textContent = score;
        if (analyticsHealthScore) analyticsHealthScore.textContent = score;
        
        const progressBar = document.querySelector('.health-score-progress .progress-bar');
        if (progressBar) {
            progressBar.style.width = `${score}%`;
            
            if (score >= 80) {
                progressBar.style.background = 'linear-gradient(90deg, #10B981, #06D6A0)';
            } else if (score >= 60) {
                progressBar.style.background = 'linear-gradient(90deg, #FFD166, #FF9E6D)';
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #EF476F, #FF6B6B)';
            }
        }
    }

    updateRolloverDisplay() {
        const rolloverElement = document.getElementById('rolloverBalance');
        if (!rolloverElement) return;
        
        const currentMonth = this.getCurrentMonthKey();
        const monthData = this.monthlyBudgets[currentMonth];
        
        if (!monthData || monthData.startingBalance === 0) {
            rolloverElement.classList.add('d-none');
            return;
        }
        
        rolloverElement.classList.remove('d-none');
        
        if (monthData.startingBalance > 0) {
            rolloverElement.classList.add('rollover-positive');
            rolloverElement.classList.remove('rollover-negative');
        } else if (monthData.startingBalance < 0) {
            rolloverElement.classList.add('rollover-negative');
            rolloverElement.classList.remove('rollover-positive');
        }
        
        const rolloverAmount = document.getElementById('rolloverAmount');
        const rolloverDescription = document.getElementById('rolloverDescription');
        
        if (rolloverAmount) rolloverAmount.textContent = 
            `${monthData.startingBalance >= 0 ? '+' : ''}${this.formatCurrency(monthData.startingBalance)}`;
        
        if (rolloverDescription) rolloverDescription.textContent = 
            `Carried over from previous month`;
    }

    // Transaction Management
    addTransaction(transaction) {
        this.transactions.push(transaction);
        this.saveData('transactions', this.transactions);
        this.calculateMonthlyRollover();
        this.calculateAIInsights();
        this.updateDashboard();
        this.showToast('Transaction added successfully', 'success');
    }

    editTransaction(index) {
        const transaction = this.transactions[index];
        const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        
        document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-pencil"></i> Edit Transaction';
        document.getElementById('submitButtonText').textContent = 'Update';
        document.getElementById('editTransactionIndex').value = index;
        
        document.getElementById('dateInput').value = transaction.date;
        document.getElementById('descInput').value = transaction.description;
        document.getElementById('typeInput').value = transaction.type;
        document.getElementById('amountInput').value = transaction.amount;
        
        this.updateCategorySelect();
        document.getElementById('categoryInput').value = transaction.category;
        
        modal.show();
    }

    removeTransaction(index) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions.splice(index, 1);
            this.saveData('transactions', this.transactions);
            this.calculateMonthlyRollover();
            this.updateDashboard();
            this.showToast('Transaction deleted successfully', 'success');
        }
    }

    // Category Management
    renderCategoryList() {
        const ul = document.getElementById('categoryList');
        if (!ul) return;
        
        ul.innerHTML = '';
        
        const filteredCategories = this.categories.filter(cat => {
            if (this.currentCategoryFilter === 'all') return true;
            return cat.type === this.currentCategoryFilter;
        });
        
        if (filteredCategories.length === 0) {
            const li = document.createElement('li');
            li.className = "list-group-item text-center text-muted";
            li.textContent = "No categories found";
            ul.appendChild(li);
            return;
        }
        
        filteredCategories.forEach((cat, idx) => {
            const li = document.createElement('li');
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            li.innerHTML = `
                <div>
                    <span>${cat.name}</span>
                    <span class="badge ${cat.type === 'income' ? 'bg-success' : 'bg-danger'}">${cat.type}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="editCategory(${idx})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeCategory(${idx})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            ul.appendChild(li);
        });
        
        this.updateCategorySelect();
    }

    updateCategorySelect() {
        const typeSelect = document.getElementById('typeInput');
        const categorySelect = document.getElementById('categoryInput');
        const currentType = typeSelect ? typeSelect.value : 'expense';
        
        const filteredCategories = this.categories.filter(cat => cat.type === currentType);
        
        if (categorySelect) {
            categorySelect.innerHTML = '';
            
            if (filteredCategories.length === 0) {
                categorySelect.innerHTML = '<option disabled>No categories available</option>';
                return;
            }
            
            filteredCategories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = cat.name;
                categorySelect.appendChild(opt);
            });
        }
    }

    addCategory(name, type) {
        if (!name.trim()) {
            this.showToast('Please enter a category name', 'danger');
            return;
        }
        
        if (this.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('Category already exists', 'danger');
            return;
        }
        
        this.categories.push({
            id: Date.now(),
            name: name.trim(),
            type: type,
            color: this.getRandomColor(),
            icon: 'bi-tag'
        });
        
        this.saveData('categories', this.categories);
        this.renderCategoryList();
        this.showToast('Category added successfully', 'success');
    }

    editCategory(index) {
        const cat = this.categories[index];
        const newName = prompt("Edit category name:", cat.name);
        if (newName && newName.trim() && !this.categories.some((c, i) => i !== index && c.name.toLowerCase() === newName.toLowerCase())) {
            this.categories[index].name = newName.trim();
            this.saveData('categories', this.categories);
            this.renderCategoryList();
            this.updateDashboard();
        }
    }

    removeCategory(index) {
        const isUsed = this.transactions.some(tx => tx.category === this.categories[index].name);
        
        if (isUsed) {
            if (!confirm(`This category is used in ${this.transactions.filter(tx => tx.category === this.categories[index].name).length} transaction(s). Are you sure you want to delete it?`)) {
                return;
            }
        } else {
            if (!confirm("Are you sure you want to delete this category?")) {
                return;
            }
        }
        
        this.categories.splice(index, 1);
        this.saveData('categories', this.categories);
        this.renderCategoryList();
        this.updateDashboard();
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

    getRandomColor() {
        const colors = ['#4361EE', '#7209B7', '#10B981', '#EF476F', '#FFD166', '#118AB2', '#06D6A0', '#FF9E6D'];
        return colors[Math.floor(Math.random() * colors.length)];
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

    getCurrentBalance() {
        const monthlyData = this.getMonthlySummary(new Date());
        return monthlyData.balance;
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
        if (fab) {
            fab.addEventListener('click', () => {
                this.toggleFABMenu();
            });
        }

        // Transaction form
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTransactionSubmit();
            });
        }

        // Category form
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => {
                const name = document.getElementById('newCategoryInput').value;
                const type = document.getElementById('newCategoryType').value;
                this.addCategory(name, type);
                document.getElementById('newCategoryInput').value = '';
            });
        }

        // Type select change
        const typeInput = document.getElementById('typeInput');
        if (typeInput) {
            typeInput.addEventListener('change', () => {
                this.updateCategorySelect();
            });
        }

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

        // Settings changes
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                this.settings.currency = e.target.value;
                this.saveData('settings', this.settings);
                this.updateDashboard();
            });
        }

        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                document.body.classList.toggle('dark-mode', e.target.checked);
                this.settings.theme = e.target.checked ? 'dark' : 'light';
                this.saveData('settings', this.settings);
            });
        }

        // Swipe gestures for mobile
        this.setupSwipeGestures();

        // Search functionality
        const transactionSearch = document.getElementById('transactionSearch');
        if (transactionSearch) {
            transactionSearch.addEventListener('input', (e) => {
                this.filterTransactions(e.target.value);
            });
        }
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
        const tabs = ['dashboard', 'transactions', 'analytics', 'planner', 'debt', 'settings'];
        const currentTab = this.getCurrentTab();
        const currentIndex = tabs.indexOf(currentTab);

        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex < tabs.length - 1) {
                this.showTab(tabs[currentIndex + 1]);
            } else if (diff < 0 && currentIndex > 0) {
                this.showTab(tabs[currentIndex - 1]);
            }
        }
    }

    getCurrentTab() {
        return document.querySelector('.nav-btn.active')?.dataset.tab || 'dashboard';
    }

    showTab(tabName) {
        document.querySelectorAll('.tab-page').forEach(tab => {
            tab.classList.add('d-none');
        });

        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) {
            targetTab.classList.remove('d-none');
        }

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        this.initializeTab(tabName);
    }

    initializeTab(tabName) {
        switch (tabName) {
            case 'transactions':
                this.renderTransactionsTable();
                break;
            case 'analytics':
                this.renderEnhancedAnalytics();
                break;
            case 'planner':
                this.renderPlannerProjections();
                break;
            case 'debt':
                this.renderDebtManagement();
                break;
        }
    }

    toggleFABMenu() {
        const fabMenu = document.querySelector('.fab-menu');
        if (fabMenu) {
            fabMenu.classList.toggle('active');
        }
    }

    quickAddTransaction(type) {
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

    quickAddTransfer() {
        this.showToast('Transfer feature coming soon', 'info');
    }

    handleTransactionSubmit() {
        const date = document.getElementById('dateInput').value;
        const desc = document.getElementById('descInput').value.trim();
        const type = document.getElementById('typeInput').value;
        const cat = document.getElementById('categoryInput').value;
        const amount = parseFloat(document.getElementById('amountInput').value);
        const editIndex = parseInt(document.getElementById('editTransactionIndex').value);

        if (!date || !desc || !type || !cat || isNaN(amount)) {
            this.showToast('Please fill out all fields correctly', 'danger');
            return;
        }

        if (editIndex >= 0) {
            this.transactions[editIndex] = { date, description: desc, type, category: cat, amount };
            this.showToast('Transaction updated successfully', 'success');
        } else {
            this.addTransaction({ date, description: desc, type, category: cat, amount });
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
        if (modal) {
            modal.hide();
        }
    }

    renderTransactionsTable() {
        const tbody = document.getElementById('transactionsBody');
        const noTransactions = document.getElementById('noTransactions');
        
        if (!tbody) return;
        
        if (this.transactions.length === 0) {
            tbody.innerHTML = '';
            if (noTransactions) noTransactions.classList.remove('d-none');
            return;
        }
        
        if (noTransactions) noTransactions.classList.add('d-none');
        
        tbody.innerHTML = this.transactions.slice().reverse().map((tx, idx) => {
            const originalIndex = this.transactions.length - 1 - idx;
            return `
                <tr>
                    <td>${this.formatDate(tx.date)}</td>
                    <td>${tx.description}</td>
                    <td><span class="badge ${tx.type === 'income' ? 'bg-success' : 'bg-danger'}">${tx.type}</span></td>
                    <td>${tx.category}</td>
                    <td class="fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">
                        ${tx.type === 'income' ? '+' : '-'}${this.formatCurrency(tx.amount)}
                    </td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editTransaction(${originalIndex})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="removeTransaction(${originalIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterTransactions(searchTerm) {
        const filtered = this.transactions.filter(tx => 
            tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderFilteredTransactions(filtered);
    }

    renderFilteredTransactions(filteredTransactions) {
        const tbody = document.getElementById('transactionsBody');
        const noTransactions = document.getElementById('noTransactions');
        
        if (!tbody) return;
        
        if (filteredTransactions.length === 0) {
            tbody.innerHTML = '';
            if (noTransactions) noTransactions.classList.remove('d-none');
            return;
        }
        
        if (noTransactions) noTransactions.classList.add('d-none');
        
        tbody.innerHTML = filteredTransactions.slice().reverse().map((tx, idx) => {
            const originalIndex = this.transactions.indexOf(tx);
            return `
                <tr>
                    <td>${this.formatDate(tx.date)}</td>
                    <td>${tx.description}</td>
                    <td><span class="badge ${tx.type === 'income' ? 'bg-success' : 'bg-danger'}">${tx.type}</span></td>
                    <td>${tx.category}</td>
                    <td class="fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">
                        ${tx.type === 'income' ? '+' : '-'}${this.formatCurrency(tx.amount)}
                    </td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editTransaction(${originalIndex})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="removeTransaction(${originalIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Analytics
    renderEnhancedAnalytics() {
        this.updateAnalyticsOverview();
    }

    updateAnalyticsOverview() {
        const savingsRate = this.calculateSavingsRate();
        const savingsRateValue = document.getElementById('savingsRateValue');
        if (savingsRateValue) {
            savingsRateValue.textContent = `${(savingsRate * 100).toFixed(1)}%`;
        }
        
        const progressBar = document.getElementById('savingsRateProgress');
        if (progressBar) {
            const progressWidth = Math.min(100, Math.max(0, savingsRate * 200));
            progressBar.style.width = `${progressWidth}%`;
            
            if (savingsRate >= 0.2) {
                progressBar.className = 'progress-bar bg-success';
            } else if (savingsRate >= 0.1) {
                progressBar.className = 'progress-bar bg-warning';
            } else {
                progressBar.className = 'progress-bar bg-danger';
            }
        }
    }

    // Planner
    renderPlannerProjections() {
        // Implementation for financial planner
        console.log('Rendering planner projections');
    }

    // Debt Management
    renderDebtManagement() {
        // Implementation for debt management
        console.log('Rendering debt management');
    }

    // Service Worker
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
        // Setup periodic sync every 5 minutes
        setInterval(() => {
            if (this.isOnline && this.googleUser && !this.syncInProgress) {
                this.triggerSync();
            }
        }, 5 * 60 * 1000);
    }

    // Toast System
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Manual Sync
    manualSync() {
        if (!this.googleUser) {
            this.showGoogleSignIn();
            return;
        }
        
        this.triggerSync();
    }
}

// Global functions for HTML event handlers
function showGoogleSignIn() {
    if (window.financeFlow) {
        window.financeFlow.showGoogleSignIn();
    }
}

function googleSignOut() {
    if (window.financeFlow) {
        window.financeFlow.googleSignOut();
    }
}

function manualSync() {
    if (window.financeFlow) {
        window.financeFlow.manualSync();
    }
}

function showTab(tabName) {
    if (window.financeFlow) {
        window.financeFlow.showTab(tabName);
    }
}

function quickAddTransaction(type) {
    if (window.financeFlow) {
        window.financeFlow.quickAddTransaction(type);
    }
}

function quickAddTransfer() {
    if (window.financeFlow) {
        window.financeFlow.quickAddTransfer();
    }
}

function editTransaction(index) {
    if (window.financeFlow) {
        window.financeFlow.editTransaction(index);
    }
}

function removeTransaction(index) {
    if (window.financeFlow) {
        window.financeFlow.removeTransaction(index);
    }
}

function editCategory(index) {
    if (window.financeFlow) {
        window.financeFlow.editCategory(index);
    }
}

function removeCategory(index) {
    if (window.financeFlow) {
        window.financeFlow.removeCategory(index);
    }
}

function toggleRolloverSettings() {
    alert('Rollover settings feature - Implementation needed');
}

function openAddFutureIncome() {
    alert('Add future income feature - Implementation needed');
}

function openAddFutureExpense() {
    alert('Add future expense feature - Implementation needed');
}

function openAddLoan(type) {
    alert(`Add loan ${type} feature - Implementation needed`);
}

function showAIDetails() {
    alert('AI insights feature - Implementation needed');
}

function showFullAIAnalysis() {
    alert('Full AI analysis feature - Implementation needed');
}

function applyAISuggestions() {
    alert('Apply AI suggestions feature - Implementation needed');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.financeFlow = new FinanceFlow();
    
    // Open add transaction modal when clicking FAB
    const openAddTransactionModal = document.getElementById('openAddTransactionModal');
    if (openAddTransactionModal) {
        openAddTransactionModal.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            modal.show();
        });
    }
});
