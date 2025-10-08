// Finance Flow - Complete Financial Management App
class FinanceFlow {
    constructor() {
        // Initialize all data structures
        this.transactions = this.loadData('transactions') || [];
        this.categories = this.loadData('categories') || this.getDefaultCategories();
        this.settings = this.loadData('settings') || this.getDefaultSettings();
        this.monthlyBudgets = this.loadData('monthlyBudgets') || {};
        this.futureTransactions = this.loadData('futureTransactions') || { income: [], expenses: [] };
        this.loans = this.loadData('loans') || { given: [], taken: [] };
        
        // Analytics and UI state
        this.aiInsights = [];
        this.isOnline = navigator.onLine;
        this.googleUser = null;
        this.googleAuth = null;
        this.syncInProgress = false;
        this.pendingSync = false;
        this.lastBackupMonth = null;
        this.lastSyncTime = null;
        
        // UI state
        this.currentCategoryFilter = 'all';
        this.plannerTimeframe = '1year';
        this.currentCategoryView = null;
        this.currentCategoryTransactions = [];
        
        // Chart instances
        this.overviewChart = null;
        this.incomePieChart = null;
        this.expensePieChart = null;
        this.healthTrendChart = null;
        this.categoryTrendChart = null;
        this.comparisonChart = null;
        this.mainChart = null;
        
        // Google Drive constants
        this.GOOGLE_DRIVE_FILE_NAME = 'finance_flow_data.json';
        this.GOOGLE_CLIENT_ID = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';
        
        this.init();
    }

init() {
    // Wait a bit longer for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.setupServiceWorker();
            this.initializeGoogleAuth();
            this.calculateMonthlyRollover();
            this.calculateAIInsights();
            this.updateDashboard();
            this.renderCategoryList();
            this.setupSync();
            
            // Initialize tabs
            this.showTab('dashboard');
        });
    } else {
        // DOM is already ready
        this.setupEventListeners();
        this.setupServiceWorker();
        this.initializeGoogleAuth();
        this.calculateMonthlyRollover();
        this.calculateAIInsights();
        this.updateDashboard();
        this.renderCategoryList();
        this.setupSync();
        
        // Initialize tabs
        this.showTab('dashboard');
    }
}

    // Service Worker setup with error handling
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Use relative path for GitHub Pages
            const swPath = './service-worker.js';
            
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('SW registered successfully: ', registration);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('New service worker found:', newWorker);
                    });
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                    // Don't show error to user - app works without SW
                });
        } else {
            console.log('Service workers not supported');
        }
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
        
        // Health score calculation
        const healthScore = this.calculateHealthScore();
        
        // Spending pattern analysis
        const spendingPattern = this.analyzeSpendingPattern();
        if (spendingPattern.trend > 0.1) {
            insights.push({
                type: 'warning',
                message: `${spendingPattern.category} spending increased by ${(spendingPattern.trend * 100).toFixed(1)}%`,
                icon: 'bi-graph-up-arrow',
                priority: 2
            });
        }

        // Savings rate analysis
        const savingsRate = this.calculateSavingsRate();
        if (savingsRate < 0.1) {
            insights.push({
                type: 'warning',
                message: `Low savings rate (${(savingsRate * 100).toFixed(1)}%). Aim for 20%+`,
                icon: 'bi-piggy-bank',
                priority: 1
            });
        } else if (savingsRate > 0.3) {
            insights.push({
                type: 'positive',
                message: `Excellent savings rate (${(savingsRate * 100).toFixed(1)}%)!`,
                icon: 'bi-emoji-smile',
                priority: 1
            });
        }

        // Budget optimization tips
        const budgetTips = this.generateBudgetTips();
        insights.push(...budgetTips);

        // Predictive insights
        const predictions = this.generatePredictions();
        insights.push(...predictions);

        // Transaction categorization suggestions
        const categorizationTips = this.suggestCategorization();
        insights.push(...categorizationTips);

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

    generateBudgetTips() {
        const tips = [];
        const monthlyData = this.getMonthlySummary(new Date());
        
        if (monthlyData.expenses / monthlyData.income > 0.7) {
            tips.push({
                type: 'warning',
                message: 'Over 70% of income spent. Review discretionary spending.',
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
                message: `High spending in ${highSpending.join(', ')}. Consider budgeting.`,
                icon: 'bi-coin',
                priority: 1
            });
        }
        
        // Subscription detection
        const subscriptions = this.detectSubscriptions();
        if (subscriptions.length > 0) {
            const total = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
            tips.push({
                type: 'info',
                message: `${subscriptions.length} subscriptions costing ${this.formatCurrency(total)}/month`,
                icon: 'bi-arrow-repeat',
                priority: 1
            });
        }
        
        return tips;
    }

detectSubscriptions() {
    const subscriptions = [];
    const monthlyData = this.getMonthlySummary(new Date());
    
    // Simple subscription detection based on recurring descriptions
    const recurringKeywords = ['netflix', 'spotify', 'youtube', 'premium', 'subscription', 'membership'];
    
    this.transactions.forEach(transaction => {
        if (transaction.type === 'expense' && transaction.description) {
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
        
        // Spending prediction
        const nextMonthPrediction = this.predictNextMonthSpending();
        if (nextMonthPrediction) {
            predictions.push({
                type: 'info',
                message: `Next month spending: ~${this.formatCurrency(nextMonthPrediction.amount)}`,
                icon: 'bi-magic',
                priority: 2
            });
        }
        
        return predictions;
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
        
        // Simple trend calculation
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

    calculateSavingsGoal() {
        const monthlySavings = this.getMonthlySummary(new Date()).balance;
        if (monthlySavings <= 0) return null;
        
        const emergencyFund = 100000; // Example goal
        const months = Math.ceil(emergencyFund / monthlySavings);
        
        return `Emergency fund in ${months} months at current rate`;
    }

    suggestCategorization() {
        const suggestions = [];
        const uncategorized = this.transactions.filter(t => 
            !this.categories.some(c => c.name === t.category)
        );
        
        if (uncategorized.length > 5) {
            suggestions.push({
                type: 'info',
                message: `${uncategorized.length} transactions need categorization`,
                icon: 'bi-tag',
                priority: 1
            });
        }
        
        // AI-powered categorization suggestions
        const commonPatterns = this.findCategorizationPatterns();
        if (commonPatterns.length > 0) {
            suggestions.push({
                type: 'info',
                message: `Found ${commonPatterns.length} spending patterns for auto-categorization`,
                icon: 'bi-robot',
                priority: 2
            });
        }
        
        return suggestions;
    }

findCategorizationPatterns() {
    const patterns = [];
    const expenseTransactions = this.transactions.filter(t => t.type === 'expense' && t.description);
    
    // Simple pattern detection based on description keywords
    const categoryKeywords = {
        'Food': ['restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'meal'],
        'Transport': ['uber', 'taxi', 'fuel', 'petrol', 'transport', 'bus', 'train'],
        'Shopping': ['mall', 'store', 'shop', 'amazon', 'aliexpress'],
        'Entertainment': ['movie', 'cinema', 'game', 'netflix', 'spotify']
    };
    
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        const matches = expenseTransactions.filter(t => 
            keywords.some(keyword => t.description.toLowerCase().includes(keyword)) &&
            t.category !== category
        );
        
        if (matches.length > 0) {
            patterns.push({
                category: category,
                matches: matches.length,
                sample: matches[0].description
            });
        }
    });
    
    return patterns;
}

    // Enhanced Monthly Rollover System
    calculateMonthlyRollover() {
        console.log('Calculating monthly rollover...');
        
        // Ensure all months have budget entries
        this.monthlyBudgets = this.ensureAllMonthsHaveBudgets(this.monthlyBudgets);
        
        const months = Object.keys(this.monthlyBudgets).sort();
        console.log('Processing months:', months);
        
        // First pass: Calculate income and expenses for each month
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
                
            console.log(`Month ${month}: Income=${monthData.income}, Expenses=${monthData.expenses}`);
        });
        
        // Second pass: Calculate ending balances and rollovers
        for (let i = 0; i < months.length; i++) {
            const currentMonth = months[i];
            const monthData = this.monthlyBudgets[currentMonth];
            
            monthData.endingBalance = monthData.startingBalance + monthData.income - monthData.expenses;
            
            // Roll over to next month if auto-rollover is enabled
            if (monthData.autoRollover && i < months.length - 1) {
                const nextMonth = months[i + 1];
                if (monthData.endingBalance >= 0 || monthData.allowNegative) {
                    this.monthlyBudgets[nextMonth].startingBalance = monthData.endingBalance;
                } else {
                    this.monthlyBudgets[nextMonth].startingBalance = 0;
                }
                console.log(`Rollover from ${currentMonth} to ${nextMonth}: ${this.monthlyBudgets[nextMonth].startingBalance}`);
            }
        }
        
        this.saveData('monthlyBudgets', this.monthlyBudgets);
        console.log('Rollover calculation completed');
    }

    ensureAllMonthsHaveBudgets(budgets) {
        // Get all unique months from transactions
        const transactionMonths = [...new Set(this.transactions.map(tx => this.getMonthKeyFromDate(tx.date)))];
        
        // Add current month if no transactions exist
        const currentMonth = this.getCurrentMonthKey();
        if (!transactionMonths.includes(currentMonth)) {
            transactionMonths.push(currentMonth);
        }
        
        // Add next month for rollover calculation
        const nextMonth = this.getNextMonthKey();
        if (!transactionMonths.includes(nextMonth)) {
            transactionMonths.push(nextMonth);
        }
        
        // Ensure each month has a budget entry
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
        
        // Sort months chronologically
        const sortedMonths = Object.keys(budgets).sort();
        const sortedBudgets = {};
        sortedMonths.forEach(month => {
            sortedBudgets[month] = budgets[month];
        });
        
        return sortedBudgets;
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

    getNextMonthKey() {
        const now = new Date();
        let nextMonth = now.getMonth() + 1;
        let year = now.getFullYear();
        
        if (nextMonth > 11) {
            nextMonth = 0;
            year++;
        }
        
        return `${year}-${String(nextMonth + 1).padStart(2, '0')}`;
    }

    getPreviousMonth(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        let prevYear = year;
        let prevMonth = month - 1;
        
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }
        
        return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }

    // Enhanced Sync System
    async triggerSync() {
        if (this.syncInProgress) {
            this.pendingSync = true;
            return false;
        }
        
        if (!this.googleUser || !this.googleUser.access_token) {
            console.log('Not authenticated, skipping sync');
            return false;
        }
        
        if (!this.isOnline) {
            console.log('Offline, skipping sync');
            this.pendingSync = true;
            this.updateSyncStatus('warning', 'Offline - changes queued for sync');
            return false;
        }
        
        // Check if token is expired
        if (this.isTokenExpired(this.googleUser)) {
            this.updateSyncStatus('warning', 'Session expired. Please sign in again.');
            this.googleSignOut();
            return false;
        }
        
        this.syncInProgress = true;
        this.updateSyncStatus('syncing', 'Syncing to Google Drive...');
        
        try {
            const currentMonth = this.getCurrentMonthKey();
            const shouldCreateMonthlyBackup = this.lastBackupMonth !== currentMonth;
            
            const fileData = {
                transactions: this.transactions,
                categories: this.categories,
                currency: this.settings.currency,
                monthlyBudgets: this.monthlyBudgets,
                futureTransactions: this.futureTransactions,
                loans: this.loans,
                lastSync: new Date().toISOString(),
                lastBackupMonth: currentMonth,
                version: '2.0',
                app: 'Finance Flow'
            };
            
            // Step 1: Sync main file (always)
            console.log('Syncing main file...');
            const mainFileSuccess = await this.syncSingleFile(this.GOOGLE_DRIVE_FILE_NAME, fileData);
            
            if (!mainFileSuccess) {
                throw new Error('Failed to sync main file');
            }
            
            // Step 2: Create monthly backup if needed
            if (shouldCreateMonthlyBackup) {
                console.log('Creating monthly backup...');
                const monthlyFileName = this.getMonthlyBackupFileName();
                const monthlyBackupData = {
                    ...fileData,
                    isMonthlyBackup: true,
                    backupMonth: currentMonth,
                    created: new Date().toISOString()
                };
                
                await this.syncSingleFile(monthlyFileName, monthlyBackupData, false);
                
                // Update last backup month
                this.lastBackupMonth = currentMonth;
                fileData.lastBackupMonth = currentMonth;
                
                // Update main file with new backup month info
                await this.syncSingleFile(this.GOOGLE_DRIVE_FILE_NAME, fileData);
                
                this.updateSyncStatus('success', 'Data synced + monthly backup created!');
            } else {
                this.updateSyncStatus('success', 'Data synced to Google Drive!');
            }
            
            this.lastSyncTime = new Date().toISOString();
            console.log('Sync completed successfully');
            return true;
        } catch (error) {
            console.error('Error syncing to Drive:', error);
            
            if (error.message.includes('Authentication expired') || error.message.includes('401')) {
                this.updateSyncStatus('warning', 'Authentication expired. Please sign in again.');
                this.googleSignOut();
            } else {
                this.updateSyncStatus('error', 'Sync failed: ' + error.message);
            }
            return false;
        } finally {
            this.syncInProgress = false;
            
            // Process pending sync if any
            if (this.pendingSync) {
                this.pendingSync = false;
                setTimeout(() => this.triggerSync(), 1000);
            }
        }
    }

    async syncSingleFile(fileName, fileData, overwrite = true) {
        // Search for existing file
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id)`,
            {
                headers: {
                    'Authorization': `Bearer ${this.googleUser.access_token}`
                }
            }
        );
        
        if (searchResponse.status === 401) {
            throw new Error('Authentication expired');
        }
        
        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        const existingFile = searchData.files?.[0];
        
        let response;
        
        if (existingFile && overwrite) {
            // Update existing file
            console.log(`Updating existing file: ${fileName}`);
            response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.googleUser.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(fileData)
                }
            );
        } else if (!existingFile) {
            // Create new file
            console.log(`Creating new file: ${fileName}`);
            
            // First create the file metadata
            const createResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.googleUser.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: fileName,
                        mimeType: 'application/json',
                        description: `Finance Flow ${fileName.includes('backup') ? 'Monthly Backup' : 'Main Sync File'}`
                    })
                }
            );
            
            if (!createResponse.ok) {
                throw new Error(`File creation failed: ${createResponse.status}`);
            }
            
            const newFile = await createResponse.json();
            
            // Then upload the content
            response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${newFile.id}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.googleUser.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(fileData)
                }
            );
        } else {
            // File exists but we shouldn't overwrite (for monthly backups)
            console.log(`File ${fileName} already exists, skipping creation`);
            return true;
        }
        
        if (response.ok) {
            console.log(`File ${fileName} synced successfully`);
            return true;
        } else {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }
    }

    getMonthlyBackupFileName() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `finance_flow_backup_${year}-${month}.json`;
    }

    isTokenExpired(user) {
        if (!user || !user.acquired_at || !user.expires_in) return true;
        
        const elapsed = Date.now() - user.acquired_at;
        const expiresIn = user.expires_in * 1000; // Convert to milliseconds
        const buffer = 2 * 60 * 1000; // 2 minutes buffer
        
        return elapsed > (expiresIn - buffer);
    }

    setupSync() {
        // Start periodic sync (every 5 minutes when online and authenticated)
        setInterval(() => {
            if (this.googleUser && this.isOnline && !this.syncInProgress) {
                console.log('Periodic sync check...');
                this.triggerSync();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Google Drive Integration
    initializeGoogleAuth() {
        const savedUser = localStorage.getItem('googleUser');
        if (savedUser) {
            try {
                this.googleUser = JSON.parse(savedUser);
                this.updateProfileUI();
                
                // Check if token is expired
                if (this.isTokenExpired(this.googleUser)) {
                    console.log('Token expired, working offline');
                    localStorage.removeItem('googleUser');
                    this.googleUser = null;
                    this.updateSyncStatus('warning', 'Working offline - Sign in to sync');
                } else {
                    this.updateSyncStatus('success', 'Google Drive connected');
                    this.setupTokenAutoRefresh();
                    
                    // Try to load from Drive
                    this.loadDataFromDrive().then(success => {
                        if (!success) {
                            console.log('Failed to load from Drive, using local data');
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading saved user:', error);
                localStorage.removeItem('googleUser');
                this.googleUser = null;
            }
        }
        
        this.waitForGoogleAuth();
    }

    waitForGoogleAuth() {
        if (window.google && google.accounts && google.accounts.oauth2) {
            this.setupGoogleAuth();
            this.updateProfileUI();
        } else {
            setTimeout(() => this.waitForGoogleAuth(), 500);
        }
    }

    setupGoogleAuth() {
        try {
            this.googleAuth = google.accounts.oauth2.initTokenClient({
                client_id: this.GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        this.googleUser = {
                            access_token: tokenResponse.access_token,
                            expires_in: tokenResponse.expires_in,
                            acquired_at: Date.now(),
                            scope: tokenResponse.scope
                        };
                        
                        localStorage.setItem('googleUser', JSON.stringify(this.googleUser));
                        this.updateSyncStatus('success', 'Google Drive connected!');
                        this.updateProfileUI();
                        
                        this.setupTokenAutoRefresh();
                        
                        // Auto-load data from Drive after sign-in
                        const success = await this.loadDataFromDrive();
                        if (!success) {
                            await this.triggerSync();
                        }
                    }
                },
                error_callback: (error) => {
                    console.error('Google Auth error:', error);
                    if (error.type === 'user_logged_out') {
                        this.googleUser = null;
                        localStorage.removeItem('googleUser');
                        this.updateProfileUI();
                        this.updateSyncStatus('offline', 'Signed out from Google Drive');
                    } else {
                        this.updateSyncStatus('error', 'Google Sign-In failed');
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing Google Auth:', error);
            this.updateSyncStatus('error', 'Failed to initialize Google authentication');
        }
    }

    setupTokenAutoRefresh() {
        if (this.googleUser && this.googleUser.expires_in) {
            const refreshTime = (this.googleUser.expires_in - 300) * 1000; // Refresh 5 minutes before expiry
            if (refreshTime > 0) {
                setTimeout(() => {
                    if (this.googleUser && this.isOnline) {
                        console.log('Refreshing Google token before expiry');
                        this.showGoogleSignIn();
                    }
                }, refreshTime);
            }
        }
    }

    async loadDataFromDrive() {
        if (!this.googleUser || !this.googleUser.access_token) {
            this.updateSyncStatus('offline', 'Not authenticated with Google Drive');
            return false;
        }
        
        if (!this.isOnline) {
            this.updateSyncStatus('warning', 'Cannot load: You are offline');
            return false;
        }
        
        // Check if token is expired
        if (this.isTokenExpired(this.googleUser)) {
            this.updateSyncStatus('warning', 'Session expired. Please sign in again.');
            this.googleSignOut();
            return false;
        }
        
        try {
            this.updateSyncStatus('syncing', 'Loading data from Google Drive...');
            
            // Search for the main sync file
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${this.GOOGLE_DRIVE_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.googleUser.access_token}`
                    }
                }
            );
            
            if (searchResponse.status === 401) {
                this.updateSyncStatus('warning', 'Authentication expired. Please sign in again.');
                this.googleSignOut();
                return false;
            }
            
            if (!searchResponse.ok) {
                throw new Error(`Drive API error: ${searchResponse.status}`);
            }
            
            const searchData = await searchResponse.json();
            
            if (searchData.files && searchData.files.length > 0) {
                const file = searchData.files[0];
                const fileResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.googleUser.access_token}`
                        }
                    }
                );
                
                if (!fileResponse.ok) {
                    throw new Error(`File download error: ${fileResponse.status}`);
                }
                
                const driveData = await fileResponse.json();
                
                // Validate and load data
                if (driveData.transactions && Array.isArray(driveData.transactions)) {
                    this.transactions = driveData.transactions;
                    this.saveData('transactions', this.transactions);
                }
                
                if (driveData.categories && Array.isArray(driveData.categories)) {
                    this.categories = driveData.categories;
                    this.saveData('categories', this.categories);
                }
                
                if (driveData.currency) {
                    this.settings.currency = driveData.currency;
                    this.saveData('settings', this.settings);
                }
                
                if (driveData.monthlyBudgets) {
                    this.monthlyBudgets = driveData.monthlyBudgets;
                    this.saveData('monthlyBudgets', this.monthlyBudgets);
                }
                
                if (driveData.futureTransactions) {
                    this.futureTransactions = driveData.futureTransactions;
                    this.saveData('futureTransactions', this.futureTransactions);
                }
                
                if (driveData.loans) {
                    this.loans = driveData.loans;
                    this.saveData('loans', this.loans);
                }
                
                // Update last backup month from loaded data
                if (driveData.lastBackupMonth) {
                    this.lastBackupMonth = driveData.lastBackupMonth;
                }
                
                if (driveData.lastSync) {
                    this.lastSyncTime = driveData.lastSync;
                }
                
                // Update UI with loaded data
                this.updateDashboard();
                this.populateSummaryFilters();
                this.renderCategoryList();
                this.renderPlannerProjections();
                this.renderDebtManagement();
                
                this.updateSyncStatus('success', 'Data loaded from Google Drive!');
                console.log('Data loaded from Drive:', {
                    transactions: this.transactions.length,
                    categories: this.categories.length,
                    currency: this.settings.currency,
                    monthlyBudgets: Object.keys(this.monthlyBudgets).length,
                    futureTransactions: this.futureTransactions,
                    loans: this.loans
                });
                
                return true;
            } else {
                this.updateSyncStatus('info', 'No existing data found. Creating new backup...');
                // No file found, create one with current data
                await this.triggerSync();
                return true;
            }
        } catch (error) {
            console.error('Error loading from Drive:', error);
            this.updateSyncStatus('error', 'Error loading from Google Drive');
            return false;
        }
    }

    showGoogleSignIn() {
        if (this.googleAuth) {
            this.googleAuth.requestAccessToken();
        } else {
            this.setupGoogleAuth();
            setTimeout(() => {
                if (this.googleAuth) {
                    this.googleAuth.requestAccessToken();
                }
            }, 500);
        }
    }

    googleSignOut() {
        if (this.googleUser && this.googleUser.access_token) {
            if (window.google && google.accounts.oauth2) {
                google.accounts.oauth2.revoke(this.googleUser.access_token, () => {
                    console.log('Token revoked');
                });
            }
        }
        
        this.googleUser = null;
        localStorage.removeItem('googleUser');
        this.updateProfileUI();
        this.updateSyncStatus('offline', 'Signed out from Google Drive');
    }

    updateProfileUI() {
        const profilePicture = document.getElementById('profilePicture');
        const signedInUser = document.getElementById('signedInUser');
        const userEmail = document.getElementById('userEmail');
        const signInOption = document.getElementById('signInOption');
        const signOutOption = document.getElementById('signOutOption');
        const syncStatusText = document.getElementById('syncStatusText');
        
        if (this.googleUser && this.googleUser.access_token) {
            if (profilePicture) profilePicture.innerHTML = `<i class="bi bi-cloud-check-fill profile-icon"></i>`;
            if (signedInUser) signedInUser.classList.remove('d-none');
            if (userEmail) userEmail.textContent = 'Connected to Google Drive';
            if (signInOption) signInOption.classList.add('d-none');
            if (signOutOption) signOutOption.classList.remove('d-none');
            
            if (syncStatusText) {
                syncStatusText.textContent = 'Synced with Google Drive';
            }
            this.updateSyncStatus('success', 'Connected to Google Drive');
        } else {
            if (profilePicture) profilePicture.innerHTML = `<i class="bi bi-person-circle profile-icon"></i>`;
            if (signedInUser) signedInUser.classList.add('d-none');
            if (signInOption) signInOption.classList.remove('d-none');
            if (signOutOption) signOutOption.classList.add('d-none');
            
            if (syncStatusText) {
                syncStatusText.textContent = 'Sign in to sync with Google Drive';
            }
            this.updateSyncStatus('offline', 'Sign in to sync with Google Drive');
        }
    }

    updateSyncStatus(status, message = '') {
        const syncIcon = document.getElementById('syncStatusIcon');
        const syncTooltip = document.getElementById('syncStatusTooltip');
        
        if (!syncIcon) return;
        
        // Remove all existing classes
        syncIcon.className = 'bi';
        
        switch (status) {
            case 'success':
                syncIcon.classList.add('bi-cloud-check', 'text-success');
                if (syncTooltip) syncTooltip.textContent = message || `Synced ${this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleTimeString() : 'just now'}`;
                break;
            case 'info':
            case 'syncing':
                syncIcon.classList.add('bi-cloud-arrow-up', 'text-info', 'pulse');
                if (syncTooltip) syncTooltip.textContent = message || 'Syncing...';
                break;
            case 'warning':
                syncIcon.classList.add('bi-cloud-slash', 'text-warning');
                if (syncTooltip) syncTooltip.textContent = message || 'Offline - changes will sync when online';
                break;
            case 'danger':
            case 'error':
                syncIcon.classList.add('bi-cloud-x', 'text-danger');
                if (syncTooltip) syncTooltip.textContent = message || 'Sync failed';
                break;
            case 'offline':
                syncIcon.classList.add('bi-cloud-slash', 'text-muted');
                if (syncTooltip) syncTooltip.textContent = message || 'Offline';
                break;
            default:
                syncIcon.classList.add('bi-cloud', 'text-muted');
                if (syncTooltip) syncTooltip.textContent = message || 'Not signed in';
        }
    }

    // Enhanced Toast System
    showToast(message, type = 'info', duration = 4000) {
        // Only show critical toasts, use status icons for sync messages
        if (type === 'info' && message.includes('sync') || message.includes('Sync')) {
            this.updateSyncStatus(type, message);
            return;
        }
        
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();
        
        const icons = {
            success: 'bi-check-circle-fill',
            info: 'bi-info-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            danger: 'bi-x-circle-fill'
        };
        
        const toastHTML = `
            <div id="${toastId}" class="toast toast-${type}" role="alert">
                <div class="toast-body">
                    <div class="d-flex align-items-center">
                        <i class="bi ${icons[type]} me-2 text-${type}"></i>
                        <span class="flex-grow-1">${message}</span>
                        <button type="button" class="btn-close ms-2" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-progress"></div>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, { delay: duration });
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
        
        bsToast.show();
    }

    // UI Management
updateDashboard() {
    // Add null checks for all dashboard elements
    try {
        this.updateQuickStats();
        this.updateRecentTransactions();
        this.updateAIInsights();
        this.updateHealthScore();
        this.updateRolloverDisplay();
        this.updateCategoryBreakdowns();
    } catch (error) {
        console.warn('Error updating dashboard:', error);
    }
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
    if (!container) {
        console.warn('recentTransactions container not found');
        return;
    }
    
    const recent = this.transactions.slice(-5).reverse();
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">No recent transactions</div>';
        return;
    }
    
    container.innerHTML = recent.map(transaction => {
        const originalIndex = this.transactions.indexOf(transaction);
        return `
            <div class="transaction-item" onclick="editTransaction(${originalIndex})">
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
        `;
    }).join('');
}

    updateCategoryBreakdowns() {
        // Income Breakdown
        const incomeBreakdown = document.getElementById("incomeBreakdown");
        const noIncomeMsg = document.getElementById("noIncomeCategories");
        if (incomeBreakdown) {
            incomeBreakdown.innerHTML = "";
            
            const incomeCategories = this.categories.filter(cat => cat.type === "income");
            let hasIncomeData = false;
            
            if (incomeCategories.length === 0) {
                if (noIncomeMsg) noIncomeMsg.classList.remove('d-none');
            } else {
                if (noIncomeMsg) noIncomeMsg.classList.add('d-none');
                
                incomeCategories.forEach(cat => {
                    const catAmount = this.transactions
                        .filter(tx => tx.category === cat.name && tx.type === "income")
                        .reduce((sum, tx) => sum + tx.amount, 0);
                    
                    if (catAmount > 0) {
                        hasIncomeData = true;
                        
                        const item = document.createElement("div");
                        item.className = "breakdown-item";
                        item.onclick = (e) => {
                            e.stopPropagation();
                            this.showCategoryTransactions('income', cat.name);
                        };
                        item.innerHTML = `
                            <span class="breakdown-category">${cat.name}</span>
                            <span class="breakdown-amount">${this.formatCurrency(catAmount)}</span>
                        `;
                        incomeBreakdown.appendChild(item);
                    }
                });
                
                if (!hasIncomeData) {
                    if (noIncomeMsg) noIncomeMsg.classList.remove('d-none');
                } else {
                    if (noIncomeMsg) noIncomeMsg.classList.add('d-none');
                }
            }
        }

        // Expense Breakdown
        const expenseBreakdown = document.getElementById("expenseBreakdown");
        const noExpenseMsg = document.getElementById("noExpenseCategories");
        if (expenseBreakdown) {
            expenseBreakdown.innerHTML = "";
            
            const expenseCategories = this.categories.filter(cat => cat.type === "expense");
            let hasExpenseData = false;
            
            if (expenseCategories.length === 0) {
                if (noExpenseMsg) noExpenseMsg.classList.remove('d-none');
            } else {
                if (noExpenseMsg) noExpenseMsg.classList.add('d-none');
                
                expenseCategories.forEach(cat => {
                    const catAmount = this.transactions
                        .filter(tx => tx.category === cat.name && tx.type === "expense")
                        .reduce((sum, tx) => sum + tx.amount, 0);
                    
                    if (catAmount > 0) {
                        hasExpenseData = true;
                        
                        const item = document.createElement("div");
                        item.className = "breakdown-item";
                        item.onclick = (e) => {
                            e.stopPropagation();
                            this.showCategoryTransactions('expense', cat.name);
                        };
                        item.innerHTML = `
                            <span class="breakdown-category">${cat.name}</span>
                            <span class="breakdown-amount">${this.formatCurrency(catAmount)}</span>
                        `;
                        expenseBreakdown.appendChild(item);
                    }
                });
                
                if (!hasExpenseData) {
                    if (noExpenseMsg) noExpenseMsg.classList.remove('d-none');
                } else {
                    if (noExpenseMsg) noExpenseMsg.classList.add('d-none');
                }
            }
        }
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
        const healthLabelElement = document.getElementById('healthScoreLabel');
        
        if (healthScoreElement) healthScoreElement.textContent = score;
        if (analyticsHealthScore) analyticsHealthScore.textContent = score;
        
        const progressBar = document.querySelector('.health-score-progress .progress-bar');
        if (progressBar) {
            progressBar.style.width = `${score}%`;
            
            // Update color based on score
            if (score >= 80) {
                progressBar.style.background = 'linear-gradient(90deg, #10B981, #06D6A0)';
                if (healthLabelElement) healthLabelElement.textContent = 'Excellent';
            } else if (score >= 60) {
                progressBar.style.background = 'linear-gradient(90deg, #FFD166, #FF9E6D)';
                if (healthLabelElement) healthLabelElement.textContent = 'Good';
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #EF476F, #FF6B6B)';
                if (healthLabelElement) healthLabelElement.textContent = 'Needs Attention';
            }
        }
    }

    updateRolloverDisplay() {
        const rolloverElement = document.getElementById('rolloverBalance');
        const monthSel = document.getElementById('summaryMonth');
        const yearSel = document.getElementById('summaryYear');
        
        if (!monthSel || !yearSel) return;
        
        const selectedMonth = monthSel.value;
        const selectedYear = yearSel.value;
        
        if (selectedMonth === 'all' || selectedYear === 'all') {
            if (rolloverElement) rolloverElement.classList.add('d-none');
            return;
        }
        
        const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        const monthData = this.monthlyBudgets[monthKey];
        
        if (!monthData || monthData.startingBalance === 0) {
            if (rolloverElement) rolloverElement.classList.add('d-none');
            return;
        }
        
        if (rolloverElement) {
            rolloverElement.classList.remove('d-none');
            
            if (monthData.startingBalance > 0) {
                rolloverElement.classList.add('rollover-positive');
                rolloverElement.classList.remove('rollover-negative');
            } else if (monthData.startingBalance < 0) {
                rolloverElement.classList.add('rollover-negative');
                rolloverElement.classList.remove('rollover-positive');
            } else {
                rolloverElement.classList.remove('rollover-positive', 'rollover-negative');
            }
            
            document.getElementById('rolloverAmount').textContent = 
                `${monthData.startingBalance >= 0 ? '+' : ''}${this.formatCurrency(monthData.startingBalance)}`;
            
            const prevMonth = this.getPreviousMonth(monthKey);
            document.getElementById('rolloverDescription').textContent = 
                `Carried over from ${prevMonth}`;
        }
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
        const transaction = this.transactions[index];
        const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        
        document.getElementById('confirmationTitle').textContent = 'Delete Transaction?';
        document.getElementById('confirmationMessage').innerHTML = `
            Are you sure you want to delete this transaction?<br>
            <strong>${transaction.description}</strong> - ${this.formatCurrency(transaction.amount)}<br>
            <small class="text-muted">${transaction.date} • ${transaction.category}</small>
        `;
        
        document.getElementById('confirmActionBtn').onclick = () => {
            this.transactions.splice(index, 1);
            this.saveData('transactions', this.transactions);
            this.updateDashboard();
            this.populateSummaryFilters();
            confirmationModal.hide();
            this.showToast('Transaction deleted successfully', 'success');
        };
        
        confirmationModal.show();
    }

    // Category Management
    renderCategoryList() {
        const ul = document.getElementById('categoryList');
        if (!ul) return;
        
        ul.innerHTML = '';
        
        const filterButtons = `
            <div class="category-filter-buttons mb-2">
                <button class="btn btn-sm category-filter-btn ${this.currentCategoryFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setCategoryFilter('all')">All</button>
                <button class="btn btn-sm category-filter-btn ${this.currentCategoryFilter === 'income' ? 'btn-success' : 'btn-outline-success'}" onclick="setCategoryFilter('income')">Income</button>
                <button class="btn btn-sm category-filter-btn ${this.currentCategoryFilter === 'expense' ? 'btn-danger' : 'btn-outline-danger'}" onclick="setCategoryFilter('expense')">Expense</button>
            </div>
        `;
        ul.innerHTML = filterButtons;
        
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
                    <span class="category-type-badge ${cat.type === 'income' ? 'category-income' : 'category-expense'}">
                        ${cat.type}
                    </span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-1" title="Edit" onclick="editCategory(${idx})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="removeCategory(${idx})">
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
        if (!typeSelect || !categorySelect) return;
        
        const currentType = typeSelect.value;
        const filteredCategories = this.categories.filter(cat => cat.type === currentType);
        
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

    addCategory(name, type) {
        if (!name.trim()) {
            this.showCategoryAlert("Please enter a category name", "danger");
            return;
        }
        
        if (this.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            this.showCategoryAlert("Category already exists", "danger");
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
        this.showCategoryAlert("Category added successfully", "success");
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

    showCategoryAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        const categorySettingsPanel = document.getElementById('categorySettingsPanel');
        if (categorySettingsPanel) {
            categorySettingsPanel.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 3000);
        }
    }

    // Category Transactions Modal
    showCategoryTransactions(type, categoryName) {
        this.currentCategoryView = { type, categoryName };
        const modal = new bootstrap.Modal(document.getElementById('categoryTransactionsModal'));
        const title = document.getElementById('categoryTransactionsTitle');
        const info = document.getElementById('categoryTransactionsInfo');
        const totalAmount = document.getElementById('categoryTotalAmount');
        const transactionsList = document.getElementById('categoryTransactionsList');
        const noTransactions = document.getElementById('noCategoryTransactions');
        
        const monthSel = document.getElementById('summaryMonth');
        const yearSel = document.getElementById('summaryYear');
        
        let filteredTx = this.transactions.filter(tx => tx.type === type);
        
        if (categoryName !== 'all') {
            filteredTx = filteredTx.filter(tx => tx.category === categoryName);
        }
        
        if (monthSel && yearSel && (monthSel.value !== "all" || yearSel.value !== "all")) {
            filteredTx = filteredTx.filter(tx => {
                const d = new Date(tx.date);
                if (isNaN(d)) return false;
                let valid = true;
                if (monthSel.value !== "all") valid = valid && (d.getMonth()+1) == monthSel.value;
                if (yearSel.value !== "all") valid = valid && d.getFullYear() == yearSel.value;
                return valid;
            });
        }
        
        // Store the filtered transactions with their original indices
        this.currentCategoryTransactions = filteredTx.map(tx => {
            const originalIndex = this.transactions.findIndex(t => 
                t.date === tx.date && t.description === tx.description && t.amount === tx.amount && t.type === tx.type && t.category === tx.category
            );
            return { ...tx, originalIndex };
        }).filter(item => item.originalIndex !== -1);
        
        if (categoryName === 'all') {
            title.innerHTML = `<i class="bi bi-list-ul"></i> All ${type.charAt(0).toUpperCase() + type.slice(1)} Transactions`;
            info.textContent = `Showing ${this.currentCategoryTransactions.length} transactions`;
        } else {
            title.innerHTML = `<i class="bi bi-tag"></i> ${categoryName} Transactions`;
            info.textContent = `Showing ${this.currentCategoryTransactions.length} ${type} transactions`;
        }
        
        const total = this.currentCategoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        totalAmount.textContent = this.formatCurrency(total);
        totalAmount.className = `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
        
        if (transactionsList) transactionsList.innerHTML = '';
        
        if (this.currentCategoryTransactions.length === 0) {
            if (noTransactions) noTransactions.classList.remove('d-none');
            if (transactionsList) transactionsList.classList.add('d-none');
        } else {
            if (noTransactions) noTransactions.classList.add('d-none');
            if (transactionsList) {
                transactionsList.classList.remove('d-none');
                
                this.currentCategoryTransactions.slice().reverse().forEach((tx, idx) => {
                    const item = document.createElement('div');
                    item.className = 'category-transaction-item';
                    item.innerHTML = `
                        <div class="category-transaction-info">
                            <div class="fw-bold">${tx.description}</div>
                            <small class="text-muted">${tx.date} • ${tx.category}</small>
                        </div>
                        <div class="category-transaction-actions">
                            <span class="fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}">
                                ${this.formatCurrency(tx.amount)}
                            </span>
                            <button class="btn-action btn-edit" title="Edit" onclick="editTransactionFromCategory(${tx.originalIndex})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn-action btn-delete" title="Delete" onclick="removeTransactionFromCategory(${tx.originalIndex})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `;
                    transactionsList.appendChild(item);
                });
            }
        }
        
        modal.show();
    }

    editTransactionFromCategory(idx) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
        if (modal) {
            modal.hide();
        }
        setTimeout(() => this.editTransaction(idx), 300);
    }

    removeTransactionFromCategory(idx) {
        const transaction = this.transactions[idx];
        if (!transaction) {
            this.showToast('Transaction not found', 'danger');
            return;
        }

        const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        
        document.getElementById('confirmationTitle').textContent = 'Delete Transaction?';
        document.getElementById('confirmationMessage').innerHTML = `
            Are you sure you want to delete this transaction?<br>
            <strong>${transaction.description}</strong> - ${this.formatCurrency(transaction.amount)}<br>
            <small class="text-muted">${transaction.date} • ${transaction.category}</small>
        `;
        
        document.getElementById('confirmActionBtn').onclick = () => {
            this.transactions.splice(idx, 1);
            this.saveData('transactions', this.transactions);
            this.updateDashboard();
            this.populateSummaryFilters();
            confirmationModal.hide();
            
            // Refresh the category modal
            setTimeout(() => {
                if (this.currentCategoryView) {
                    this.showCategoryTransactions(this.currentCategoryView.type, this.currentCategoryView.categoryName);
                }
            }, 500);
            
            this.showToast('Transaction deleted successfully', 'success');
        };
        
        confirmationModal.show();
    }

    addTransactionForCategory() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
        if (modal) {
            modal.hide();
        }
        
        setTimeout(() => {
            if (this.currentCategoryView && this.currentCategoryView.categoryName !== 'all') {
                document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
                document.getElementById('submitButtonText').textContent = 'Add';
                document.getElementById('editTransactionIndex').value = '-1';
                document.getElementById('transactionForm').reset();
                
                document.getElementById('typeInput').value = this.currentCategoryView.type;
                this.updateCategorySelect();
                document.getElementById('categoryInput').value = this.currentCategoryView.categoryName;
                
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('dateInput').value = today;
                
                const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
                addTxModal.show();
            } else {
                // Open the regular add transaction modal
                document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
                document.getElementById('submitButtonText').textContent = 'Add';
                document.getElementById('editTransactionIndex').value = '-1';
                document.getElementById('transactionForm').reset();
                
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('dateInput').value = today;
                
                const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
                addTxModal.show();
            }
        }, 300);
    }

    // Summary Filters
    populateSummaryFilters() {
        const monthSel = document.getElementById('summaryMonth');
        const yearSel = document.getElementById('summaryYear');
        if (!monthSel || !yearSel) return;
        
        monthSel.innerHTML = '';
        yearSel.innerHTML = '';
        
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        monthNames.forEach((m,i) => {
            const opt = document.createElement('option');
            opt.value = i + 1;
            opt.textContent = m;
            opt.selected = (i + 1) === currentMonth;
            monthSel.appendChild(opt);
        });
        
        const yearsArr = Array.from(new Set(this.transactions.map(tx => {
            const d = new Date(tx.date);
            return isNaN(d) ? null : d.getFullYear();
        }).filter(Boolean)
        ));
        
        if (!yearsArr.includes(currentYear)) {
            yearsArr.push(currentYear);
        }
        
        yearsArr.sort((a,b)=>b-a);
        yearsArr.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            opt.selected = y === currentYear;
            yearSel.appendChild(opt);
        });
        
        const allMonthOpt = document.createElement('option');
        allMonthOpt.value = "all";
        allMonthOpt.textContent = "All Months";
        monthSel.insertBefore(allMonthOpt, monthSel.firstChild);
        
        const allYearOpt = document.createElement('option');
        allYearOpt.value = "all";
        allYearOpt.textContent = "All Years";
        yearSel.insertBefore(allYearOpt, yearSel.firstChild);
        
        // Add event listeners
        monthSel.addEventListener('change', () => this.updateDashboard());
        yearSel.addEventListener('change', () => this.updateDashboard());
    }

    // Enhanced Analytics
    renderEnhancedAnalytics() {
        this.updateAnalyticsOverview();
        this.renderTrendsTab();
        this.renderComparisonTab();
        this.updateAIInsights();
    }

    updateAnalyticsOverview() {
        // Update health score
        const healthScore = this.calculateHealthScore();
        const healthScoreElement = document.getElementById('healthScoreValue');
        const healthLabelElement = document.getElementById('healthScoreLabel');
        
        if (healthScoreElement) {
            healthScoreElement.textContent = healthScore;
            healthScoreElement.className = 'health-score-value';
            
            if (healthScore >= 80) {
                healthScoreElement.classList.add('excellent');
                if (healthLabelElement) healthLabelElement.textContent = 'Excellent';
            } else if (healthScore >= 60) {
                healthScoreElement.classList.add('good');
                if (healthLabelElement) healthLabelElement.textContent = 'Good';
            } else if (healthScore >= 40) {
                healthScoreElement.classList.add('fair');
                if (healthLabelElement) healthLabelElement.textContent = 'Fair';
            } else {
                healthScoreElement.classList.add('poor');
                if (healthLabelElement) healthLabelElement.textContent = 'Needs Attention';
            }
        }
        
        // Update savings rate
        const savingsRate = this.calculateSavingsRate();
        const savingsRateElement = document.getElementById('savingsRateValue');
        const savingsProgressElement = document.getElementById('savingsRateProgress');
        
        if (savingsRateElement) {
            const percentage = (savingsRate * 100).toFixed(1);
            savingsRateElement.textContent = `${percentage}%`;
            
            if (savingsProgressElement) {
                const progressWidth = Math.min(100, Math.max(0, savingsRate * 200));
                savingsProgressElement.style.width = `${progressWidth}%`;
                
                if (savingsRate >= 0.2) {
                    savingsProgressElement.className = 'progress-bar bg-success';
                } else if (savingsRate >= 0.1) {
                    savingsProgressElement.className = 'progress-bar bg-warning';
                } else {
                    savingsProgressElement.className = 'progress-bar bg-danger';
                }
            }
        }
        
        this.renderOverviewChart();
        this.renderPieCharts();
        this.renderRiskAlerts();
    }

    renderOverviewChart() {
        const ctx = document.getElementById('overviewChart');
        if (!ctx) return;
        
        const canvasCtx = ctx.getContext('2d');
        const placeholder = document.getElementById('overviewChartPlaceholder');
        
        if (this.overviewChart) {
            this.overviewChart.destroy();
        }
        
        if (this.transactions.length === 0) {
            if (placeholder) placeholder.classList.remove('d-none');
            return;
        }
        
        if (placeholder) placeholder.classList.add('d-none');
        
        const chartType = document.getElementById('overviewChartType')?.value || 'category';
        
        switch (chartType) {
            case 'category':
                this.renderCategoryOverviewChart(canvasCtx);
                break;
            case 'monthly':
                this.renderMonthlyOverviewChart(canvasCtx);
                break;
            case 'yearly':
                this.renderYearlyOverviewChart(canvasCtx);
                break;
        }
    }

    renderCategoryOverviewChart(ctx) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const categoryData = {};
        this.categories.forEach(cat => {
            if (cat.type === 'expense') {
                categoryData[cat.name] = 0;
            }
        });
        
        this.transactions.forEach(tx => {
            if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
                categoryData[tx.category] = (categoryData[tx.category] || 0) + tx.amount;
            }
        });
        
        const labels = Object.keys(categoryData).filter(cat => categoryData[cat] > 0);
        const data = labels.map(cat => categoryData[cat]);
        
        this.overviewChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Spending',
                    data: data,
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Current Month Spending by Category'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const category = labels[index];
                        this.showCategoryTransactions('expense', category);
                    }
                }
            }
        });
    }

    renderMonthlyOverviewChart(ctx) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        const monthlyData = Array(12).fill().map(() => ({ income: 0, expense: 0 }));
        
        this.transactions.forEach(tx => {
            const d = new Date(tx.date);
            if (d.getFullYear() === currentYear) {
                const month = d.getMonth();
                if (tx.type === 'income') {
                    monthlyData[month].income += tx.amount;
                } else {
                    monthlyData[month].expense += tx.amount;
                }
            }
        });
        
        const incomeData = monthlyData.map(m => m.income);
        const expenseData = monthlyData.map(m => m.expense);
        
        this.overviewChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: '#198754',
                        backgroundColor: 'rgba(25, 135, 84, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Monthly Trend - ${currentYear}`
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    renderYearlyOverviewChart(ctx) {
        const years = Array.from(new Set(this.transactions.map(tx => new Date(tx.date).getFullYear())))
            .filter(year => !isNaN(year))
            .sort((a, b) => a - b);
        
        const yearlyData = {};
        years.forEach(year => {
            yearlyData[year] = { income: 0, expense: 0 };
        });
        
        this.transactions.forEach(tx => {
            const year = new Date(tx.date).getFullYear();
            if (yearlyData[year]) {
                if (tx.type === 'income') {
                    yearlyData[year].income += tx.amount;
                } else {
                    yearlyData[year].expense += tx.amount;
                }
            }
        });
        
        const incomeData = years.map(year => yearlyData[year].income);
        const expenseData = years.map(year => yearlyData[year].expense);
        
        this.overviewChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: '#198754'
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        backgroundColor: '#dc3545'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Yearly Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    renderPieCharts() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Income Pie Chart
        const incomeData = {};
        this.transactions.forEach(tx => {
            if (tx.type === 'income' && tx.date.startsWith(currentMonth)) {
                incomeData[tx.category] = (incomeData[tx.category] || 0) + tx.amount;
            }
        });
        
        const incomeCtx = document.getElementById('incomePieChart');
        const incomePlaceholder = document.getElementById('incomePiePlaceholder');
        
        if (this.incomePieChart) this.incomePieChart.destroy();
        
        if (Object.keys(incomeData).length === 0) {
            if (incomePlaceholder) incomePlaceholder.style.display = 'flex';
        } else {
            if (incomePlaceholder) incomePlaceholder.style.display = 'none';
            this.incomePieChart = new Chart(incomeCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(incomeData),
                    datasets: [{
                        data: Object.values(incomeData),
                        backgroundColor: ['#198754', '#20c997', '#0dcaf0', '#6f42c1', '#fd7e14']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Expense Pie Chart
        const expenseData = {};
        this.transactions.forEach(tx => {
            if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
                expenseData[tx.category] = (expenseData[tx.category] || 0) + tx.amount;
            }
        });
        
        const expenseCtx = document.getElementById('expensePieChart');
        const expensePlaceholder = document.getElementById('expensePiePlaceholder');
        
        if (this.expensePieChart) this.expensePieChart.destroy();
        
        if (Object.keys(expenseData).length === 0) {
            if (expensePlaceholder) expensePlaceholder.style.display = 'flex';
        } else {
            if (expensePlaceholder) expensePlaceholder.style.display = 'none';
            this.expensePieChart = new Chart(expenseCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(expenseData),
                    datasets: [{
                        data: Object.values(expenseData),
                        backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#6f42c1', '#20c997']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    renderRiskAlerts() {
        const container = document.getElementById('riskAlerts');
        const placeholder = document.getElementById('noRiskAlerts');
        
        if (!container) return;
        
        const riskAlerts = this.aiInsights.filter(insight => insight.type === 'warning');
        
        container.innerHTML = '';
        
        if (riskAlerts.length === 0) {
            if (placeholder) placeholder.classList.remove('d-none');
            container.classList.add('d-none');
            return;
        }
        
        if (placeholder) placeholder.classList.add('d-none');
        container.classList.remove('d-none');
        
        riskAlerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `risk-alert risk-${alert.type}`;
            alertElement.innerHTML = `
                <div class="risk-alert-icon">
                    <i class="bi ${alert.icon}"></i>
                </div>
                <div class="risk-alert-content">
                    <div class="risk-alert-message">${alert.message}</div>
                </div>
            `;
            container.appendChild(alertElement);
        });
    }

    renderTrendsTab() {
        this.renderHealthTrendChart();
        this.renderHeatMap();
        this.renderCategoryTrendChart();
    }

    renderHealthTrendChart() {
        const ctx = document.getElementById('healthTrendChart');
        if (!ctx) return;
        
        const canvasCtx = ctx.getContext('2d');
        const placeholder = document.getElementById('healthTrendPlaceholder');
        
        if (this.healthTrendChart) {
            this.healthTrendChart.destroy();
        }
        
        // Calculate health scores for last 6 months
        const now = new Date();
        const healthScores = [];
        const labels = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            // Filter transactions for this month
            const monthTransactions = this.transactions.filter(tx => 
                this.getMonthKeyFromDate(tx.date) === monthKey
            );
            
            const score = this.calculateHealthScoreForMonth(monthTransactions);
            healthScores.push(score);
            labels.push(date.toLocaleDateString('en', { month: 'short' }));
        }
        
        if (healthScores.filter(score => score > 0).length < 2) {
            if (placeholder) placeholder.classList.remove('d-none');
            return;
        }
        
        if (placeholder) placeholder.classList.add('d-none');
        
        this.healthTrendChart = new Chart(canvasCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Financial Health Score',
                    data: healthScores,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Financial Health Trend'
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '/100'
                        }
                    }
                }
            }
        });
    }

    calculateHealthScoreForMonth(monthTransactions) {
        if (monthTransactions.length === 0) return 50;
        
        const totalIncome = monthTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = monthTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpenses) / totalIncome) : 0;
        const savingsScore = Math.min(100, savingsRate * 200);
        
        return Math.round(savingsScore * 0.6 + 40); // Simplified calculation
    }

    renderHeatMap() {
        const container = document.getElementById('heatMapContainer');
        const placeholder = document.getElementById('heatMapPlaceholder');
        
        if (!container) return;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        const heatMapData = this.generateHeatMap(currentYear, currentMonth);
        
        container.innerHTML = '';
        
        if (heatMapData.filter(day => day.amount > 0).length === 0) {
            if (placeholder) placeholder.classList.remove('d-none');
            container.classList.add('d-none');
            return;
        }
        
        if (placeholder) placeholder.classList.add('d-none');
        container.classList.remove('d-none');
        
        // Find max amount for color scaling
        const maxAmount = Math.max(...heatMapData.map(day => day.amount));
        
        const heatMapHTML = heatMapData.map(day => {
            const intensity = maxAmount > 0 ? (day.amount / maxAmount) : 0;
            const colorIntensity = Math.floor(intensity * 100);
            
            return `
                <div class="heat-map-day" style="background-color: rgba(220, 53, 69, ${0.3 + intensity * 0.7})" 
                     title="${day.date}: ${this.formatCurrency(day.amount)}">
                    ${day.day}
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="heat-map-grid">${heatMapHTML}</div>`;
    }

    generateHeatMap(year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const heatMap = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTransactions = this.transactions.filter(tx => tx.date === dateStr && tx.type === 'expense');
            const total = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            
            heatMap.push({
                day: day,
                date: dateStr,
                amount: total,
                transactions: dayTransactions.length
            });
        }
        
        return heatMap;
    }

    renderCategoryTrendChart() {
        const ctx = document.getElementById('categoryTrendChart');
        if (!ctx) return;
        
        const canvasCtx = ctx.getContext('2d');
        const placeholder = document.getElementById('categoryTrendPlaceholder');
        
        if (this.categoryTrendChart) {
            this.categoryTrendChart.destroy();
        }
        
        const trends = this.analyzeCategoryTrends();
        
        if (trends.length === 0) {
            if (placeholder) placeholder.classList.remove('d-none');
            return;
        }
        
        if (placeholder) placeholder.classList.add('d-none');
        
        const topTrends = trends.slice(0, 5);
        
        this.categoryTrendChart = new Chart(canvasCtx, {
            type: 'bar',
            data: {
                labels: topTrends.map(t => t.category),
                datasets: [{
                    label: 'Trend (%)',
                    data: topTrends.map(t => t.trend * 100),
                    backgroundColor: topTrends.map(t => t.trend > 0 ? '#dc3545' : '#198754')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Category Spending Trends (This vs Last Month)'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => value.toFixed(1) + '%'
                        }
                    }
                }
            }
        });
    }

    analyzeCategoryTrends() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        
        const currentMonthExpenses = {};
        const lastMonthExpenses = {};
        
        this.transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7);
                if (month === currentMonth) {
                    currentMonthExpenses[tx.category] = (currentMonthExpenses[tx.category] || 0) + tx.amount;
                } else if (month === lastMonthKey) {
                    lastMonthExpenses[tx.category] = (lastMonthExpenses[tx.category] || 0) + tx.amount;
                }
            }
        });
        
        const trends = [];
        Object.keys(currentMonthExpenses).forEach(category => {
            const current = currentMonthExpenses[category];
            const last = lastMonthExpenses[category] || current * 0.5;
            const trend = last > 0 ? (current - last) / last : 0;
            
            trends.push({
                category: category,
                current: current,
                last: last,
                trend: trend,
                change: current - last
            });
        });
        
        return trends.sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend));
    }

    renderComparisonTab() {
        this.populateComparisonFilters();
        this.renderComparisonChart();
        this.renderChangeAnalysis();
    }

    populateComparisonFilters() {
        const typeSelect = document.getElementById('comparisonType');
        const period1Select = document.getElementById('comparisonPeriod1');
        const period2Select = document.getElementById('comparisonPeriod2');
        
        if (!typeSelect || !period1Select || !period2Select) return;
        
        // Get available months and years from transactions
        const months = Array.from(new Set(this.transactions.map(tx => tx.date.substring(0, 7)))).sort();
        const years = Array.from(new Set(this.transactions.map(tx => tx.date.substring(0, 4)))).sort();
        
        // Populate period selects based on comparison type
        typeSelect.addEventListener('change', () => {
            period1Select.innerHTML = '';
            period2Select.innerHTML = '';
            
            const now = new Date();
            
            switch (typeSelect.value) {
                case 'month':
                    // Populate with available months
                    months.forEach(month => {
                        const option = document.createElement('option');
                        option.value = month;
                        option.textContent = new Date(month + '-01').toLocaleDateString('en', { year: 'numeric', month: 'long' });
                        period1Select.appendChild(option.cloneNode(true));
                        period2Select.appendChild(option);
                    });
                    break;
                    
                case 'year':
                    // Populate with available years
                    years.forEach(year => {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = year;
                        period1Select.appendChild(option.cloneNode(true));
                        period2Select.appendChild(option);
                    });
                    break;
                    
                case 'average':
                    // For 3-month average comparison
                    for (let i = 0; i < 6; i++) {
                        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        const option = document.createElement('option');
                        option.value = monthKey;
                        option.textContent = date.toLocaleDateString('en', { year: 'numeric', month: 'long' });
                        period1Select.appendChild(option.cloneNode(true));
                        period2Select.appendChild(option);
                    }
                    break;
            }
            
            // Set default values (current and previous period)
            if (period1Select.options.length > 1) {
                period1Select.selectedIndex = 1;
                period2Select.selectedIndex = 0;
            }
            
            this.renderComparisonChart();
            this.renderChangeAnalysis();
        });
        
        // Trigger initial population
        typeSelect.dispatchEvent(new Event('change'));
    }

    renderComparisonChart() {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) return;
        
        const canvasCtx = ctx.getContext('2d');
        const placeholder = document.getElementById('comparisonPlaceholder');
        
        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }
        
        const type = document.getElementById('comparisonType').value;
        const period1 = document.getElementById('comparisonPeriod1').value;
        const period2 = document.getElementById('comparisonPeriod2').value;
        
        if (!period1 || !period2) {
            if (placeholder) placeholder.classList.remove('d-none');
            return;
        }
        
        if (placeholder) placeholder.classList.add('d-none');
        
        const comparison = this.comparePeriods(period1, period2, type);
        
        const categories = Object.keys(comparison).filter(cat => 
            comparison[cat].period1 > 0 || comparison[cat].period2 > 0
        );
        
        const period1Data = categories.map(cat => comparison[cat].period1);
        const period2Data = categories.map(cat => comparison[cat].period2);
        
        this.comparisonChart = new Chart(canvasCtx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    {
                        label: period1,
                        data: period1Data,
                        backgroundColor: '#6c757d'
                    },
                    {
                        label: period2,
                        data: period2Data,
                        backgroundColor: '#0d6efd'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Spending Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    comparePeriods(period1, period2, type) {
        const data1 = this.getPeriodData(period1, type);
        const data2 = this.getPeriodData(period2, type);
        
        const comparison = {};
        const allCategories = [...new Set([...Object.keys(data1), ...Object.keys(data2)])];
        
        allCategories.forEach(category => {
            const amount1 = data1[category] || 0;
            const amount2 = data2[category] || 0;
            const change = amount2 - amount1;
            const percentChange = amount1 > 0 ? (change / amount1) * 100 : (amount2 > 0 ? 100 : 0);
            
            comparison[category] = {
                period1: amount1,
                period2: amount2,
                change: change,
                percentChange: percentChange
            };
        });
        
        return comparison;
    }

    getPeriodData(period, type) {
        const data = {};
        
        this.transactions.forEach(tx => {
            if (tx.type === 'expense') {
                let include = false;
                
                if (type === 'month') {
                    const txMonth = tx.date.substring(0, 7);
                    include = txMonth === period;
                } else if (type === 'year') {
                    const txYear = tx.date.substring(0, 4);
                    include = txYear === period;
                }
                
                if (include) {
                    data[tx.category] = (data[tx.category] || 0) + tx.amount;
                }
            }
        });
        
        return data;
    }

    renderChangeAnalysis() {
        const container = document.getElementById('changeAnalysis');
        const placeholder = document.getElementById('noChangeAnalysis');
        
        if (!container) return;
        
        const type = document.getElementById('comparisonType').value;
        const period1 = document.getElementById('comparisonPeriod1').value;
        const period2 = document.getElementById('comparisonPeriod2').value;
        
        if (!period1 || !period2) {
            if (placeholder) placeholder.classList.remove('d-none');
            container.classList.add('d-none');
            return;
        }
        
        const comparison = this.comparePeriods(period1, period2, type);
        
        container.innerHTML = '';
        
        const significantChanges = Object.entries(comparison)
            .filter(([cat, data]) => Math.abs(data.percentChange) > 5 && (data.period1 > 0 || data.period2 > 0))
            .sort((a, b) => Math.abs(b[1].percentChange) - Math.abs(a[1].percentChange))
            .slice(0, 5);
        
        if (significantChanges.length === 0) {
            if (placeholder) placeholder.classList.remove('d-none');
            container.classList.add('d-none');
            return;
        }
        
        if (placeholder) placeholder.classList.add('d-none');
        container.classList.remove('d-none');
        
        significantChanges.forEach(([category, data]) => {
            const changeElement = document.createElement('div');
            changeElement.className = 'change-item';
            changeElement.innerHTML = `
                <div class="change-category">${category}</div>
                <div class="change-details">
                    <span class="change-amount ${data.percentChange >= 0 ? 'text-danger' : 'text-success'}">
                        <i class="bi ${data.percentChange >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}"></i>
                        ${Math.abs(data.percentChange).toFixed(1)}%
                    </span>
                    <small class="text-muted">
                        ${this.formatCurrency(data.period1)} → ${this.formatCurrency(data.period2)}
                    </small>
                </div>
            `;
            container.appendChild(changeElement);
        });
    }

    // NEW MISSING METHODS

    showFullAIAnalysis() {
        const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
        const content = document.getElementById('aiInsightsContent');
        
        if (!content) return;
        
        let insightsHTML = `
            <div class="ai-analysis-header text-center mb-4">
                <h4><i class="bi bi-robot"></i> Complete Financial Analysis</h4>
                <p class="text-muted">Based on your transaction patterns and financial behavior</p>
            </div>
        `;
        
        // Health Score Breakdown
        const healthScore = this.calculateHealthScore();
        const savingsRate = this.calculateSavingsRate();
        const expenseStability = this.calculateExpenseStability();
        const debtRatio = this.calculateDebtRatio();
        const emergencyFundScore = this.calculateEmergencyFundScore();
        
        insightsHTML += `
            <div class="health-breakdown mb-4">
                <h5><i class="bi bi-heart-pulse"></i> Health Score Breakdown: ${healthScore}/100</h5>
                <div class="progress mb-2" style="height: 20px;">
                    <div class="progress-bar" role="progressbar" style="width: ${healthScore}%"></div>
                </div>
                <div class="row text-center">
                    <div class="col-3">
                        <small>Savings Rate</small>
                        <div class="fw-bold ${savingsRate >= 0.2 ? 'text-success' : savingsRate >= 0.1 ? 'text-warning' : 'text-danger'}">
                            ${(savingsRate * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div class="col-3">
                        <small>Expense Stability</small>
                        <div class="fw-bold ${expenseStability >= 0.8 ? 'text-success' : expenseStability >= 0.6 ? 'text-warning' : 'text-danger'}">
                            ${(expenseStability * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div class="col-3">
                        <small>Debt Ratio</small>
                        <div class="fw-bold ${debtRatio <= 0.3 ? 'text-success' : debtRatio <= 0.5 ? 'text-warning' : 'text-danger'}">
                            ${(debtRatio * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div class="col-3">
                        <small>Emergency Fund</small>
                        <div class="fw-bold ${emergencyFundScore >= 0.75 ? 'text-success' : emergencyFundScore >= 0.5 ? 'text-warning' : 'text-danger'}">
                            ${(emergencyFundScore * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // All AI Insights
        insightsHTML += `
            <div class="all-insights mb-4">
                <h5><i class="bi bi-lightbulb"></i> Recommendations & Insights</h5>
                <div class="insights-list">
        `;
        
        this.aiInsights.forEach(insight => {
            insightsHTML += `
                <div class="ai-insight ${insight.type} mb-2">
                    <i class="bi ${insight.icon} me-2"></i>
                    ${insight.message}
                </div>
            `;
        });
        
        insightsHTML += `
                </div>
            </div>
        `;
        
        // Spending Patterns
        const patterns = this.analyzeSpendingPattern();
        const predictions = this.predictNextMonthSpending();
        
        insightsHTML += `
            <div class="spending-patterns">
                <h5><i class="bi bi-graph-up"></i> Spending Patterns</h5>
                <div class="pattern-item">
                    <strong>Trending Category:</strong> ${patterns.category || 'None'} 
                    ${patterns.trend ? `(${(patterns.trend * 100).toFixed(1)}% increase)` : ''}
                </div>
        `;
        
        if (predictions) {
            insightsHTML += `
                <div class="pattern-item">
                    <strong>Next Month Prediction:</strong> ~${this.formatCurrency(predictions.amount)}
                    (${(predictions.confidence * 100).toFixed(0)}% confidence)
                </div>
            `;
        }
        
        insightsHTML += `</div>`;
        
        content.innerHTML = insightsHTML;
        modal.show();
    }

    applyAISuggestions() {
        // Apply AI categorization suggestions
        const patterns = this.findCategorizationPatterns();
        let appliedCount = 0;
        
        patterns.forEach(pattern => {
            this.transactions.forEach(transaction => {
                if (transaction.type === 'expense' && 
                    pattern.sample.toLowerCase().includes(transaction.description.toLowerCase()) &&
                    transaction.category !== pattern.category) {
                    transaction.category = pattern.category;
                    appliedCount++;
                }
            });
        });
        
        if (appliedCount > 0) {
            this.saveData('transactions', this.transactions);
            this.updateDashboard();
            this.showToast(`Applied ${appliedCount} categorization improvements`, 'success');
        } else {
            this.showToast('No categorization improvements to apply', 'info');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal'));
        if (modal) {
            modal.hide();
        }
    }

    // Utility Methods - UPDATED to remove decimal points
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: this.settings.currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
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
            
        // Get starting balance for this month
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const startingBalance = this.monthlyBudgets[monthKey]?.startingBalance || 0;
            
        return {
            income,
            expenses,
            balance: income - expenses + startingBalance
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

    // Event Handlers and Setup - UPDATED FAB functions
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
            currencySelect.value = this.settings.currency;
            currencySelect.addEventListener('change', (e) => {
                this.settings.currency = e.target.value;
                this.saveData('settings', this.settings);
                this.updateDashboard();
                this.showToast(`Currency updated to ${e.target.value}`, 'success');
            });
        }

        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = this.settings.theme === 'dark';
            darkModeToggle.addEventListener('change', (e) => {
                document.body.classList.toggle('dark-mode', e.target.checked);
                this.settings.theme = e.target.checked ? 'dark' : 'light';
                this.saveData('settings', this.settings);
                this.showToast(`${e.target.checked ? 'Dark' : 'Light'} mode activated`, 'success');
            });
        }

        // Rollover settings
        const autoRolloverToggle = document.getElementById('autoRolloverToggle');
        if (autoRolloverToggle) {
            autoRolloverToggle.checked = this.settings.autoRollover;
            autoRolloverToggle.addEventListener('change', (e) => {
                this.settings.autoRollover = e.target.checked;
                this.saveData('settings', this.settings);
                this.calculateMonthlyRollover();
                this.updateDashboard();
            });
        }

        const allowNegativeRollover = document.getElementById('allowNegativeRollover');
        if (allowNegativeRollover) {
            allowNegativeRollover.checked = this.settings.allowNegativeRollover;
            allowNegativeRollover.addEventListener('change', (e) => {
                this.settings.allowNegativeRollover = e.target.checked;
                this.saveData('settings', this.settings);
                this.calculateMonthlyRollover();
                this.updateDashboard();
            });
        }

        // Category settings collapse
        const toggleCategorySettings = document.getElementById('toggleCategorySettings');
        if (toggleCategorySettings) {
            toggleCategorySettings.addEventListener('click', () => {
                const icon = document.getElementById('catCollapseIcon');
                if (icon) {
                    icon.innerHTML = icon.innerHTML.includes('chevron-right') ? 
                        '<i class="bi bi-chevron-down"></i>' : 
                        '<i class="bi bi-chevron-right"></i>';
                }
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

        // Analytics chart type change
        const overviewChartType = document.getElementById('overviewChartType');
        if (overviewChartType) {
            overviewChartType.addEventListener('change', () => this.renderOverviewChart());
        }

        // Initialize summary filters
        this.populateSummaryFilters();

        // Tab state persistence
        this.initTabState();

        // Manual sync button
        const manualSyncBtn = document.getElementById('manualSyncSettings');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', () => this.manualSync());
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
        
        // Update URL and storage
        this.updateUrlHash(tabName);
        localStorage.setItem('lastActiveTab', tabName);
    }

    updateUrlHash(tab) {
        if (window.location.hash !== `#${tab}`) {
            window.location.hash = tab;
        }
    }

    initTabState() {
        const hash = window.location.hash.replace('#', '');
        const validTabs = ['dashboard', 'transactions', 'planner', 'debt', 'analytics', 'settings'];
        const savedTab = localStorage.getItem('lastActiveTab');
        
        let initialTab = 'dashboard';
        
        if (validTabs.includes(hash)) {
            initialTab = hash;
        } else if (validTabs.includes(savedTab)) {
            initialTab = savedTab;
        }
        
        this.showTab(initialTab);
    }

    initializeTab(tabName) {
        switch (tabName) {
            case 'transactions':
                this.renderTransactionsTable();
                this.adjustTransactionsTable();
                break;
            case 'analytics':
                this.renderEnhancedAnalytics();
                this.populateChartFilters();
                break;
            case 'planner':
                this.renderPlannerProjections();
                break;
            case 'debt':
                this.renderDebtManagement();
                break;
            case 'settings':
                // Initialize settings values
                this.initializeSettingsValues();
                break;
        }
    }

    initializeSettingsValues() {
        // Set current values in settings form
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.value = this.settings.currency;
        }
        
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = this.settings.theme === 'dark';
            document.body.classList.toggle('dark-mode', darkModeToggle.checked);
        }
        
        const autoRolloverToggle = document.getElementById('autoRolloverToggle');
        if (autoRolloverToggle) {
            autoRolloverToggle.checked = this.settings.autoRollover;
        }
        
        const allowNegativeRollover = document.getElementById('allowNegativeRollover');
        if (allowNegativeRollover) {
            allowNegativeRollover.checked = this.settings.allowNegativeRollover;
        }
    }

    toggleFABMenu() {
        const fabMenu = document.querySelector('.fab-menu');
        if (fabMenu) {
            fabMenu.classList.toggle('active');
        }
    }

    // UPDATED: FAB now opens modal instead of using prompts
    quickAddTransaction(type) {
        document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
        document.getElementById('submitButtonText').textContent = 'Add';
        document.getElementById('editTransactionIndex').value = '-1';
        document.getElementById('transactionForm').reset();
        
        // Pre-fill type and current date
        document.getElementById('typeInput').value = type;
        this.updateCategorySelect();
        
        // Set default category based on type
        const defaultCategory = this.categories.find(cat => cat.type === type);
        if (defaultCategory) {
            document.getElementById('categoryInput').value = defaultCategory.name;
        }
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateInput').value = today;
        
        // Focus on amount field for quick entry
        setTimeout(() => {
            document.getElementById('amountInput').focus();
        }, 300);
        
        const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
        addTxModal.show();
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
        const alertBox = document.getElementById('formAlert');
        
        if (alertBox) {
            alertBox.classList.add('d-none');
        }

        if (!date || !desc || !type || !cat || isNaN(amount)) {
            if (alertBox) {
                alertBox.textContent = "Please fill out all fields correctly.";
                alertBox.classList.remove('d-none');
            }
            return;
        }
        
        if (desc.length < 2) {
            if (alertBox) {
                alertBox.textContent = "Description must be at least 2 characters.";
                alertBox.classList.remove('d-none');
            }
            return;
        }
        
        if (amount <= 0) {
            if (alertBox) {
                alertBox.textContent = "Amount must be greater than 0.";
                alertBox.classList.remove('d-none');
            }
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
            
            // Format date as "DD-MMM" (e.g., "26-Sep")
            const transactionDate = new Date(tx.date);
            const formattedDate = isNaN(transactionDate) ? tx.date : 
                `${transactionDate.getDate()}-${transactionDate.toLocaleString('default', { month: 'short' })}`;
            
            const descCell = tx.description.length > 30 ? 
                `<td class="description-cell" data-fulltext="${tx.description}">${tx.description.substring(0, 30)}...</td>` :
                `<td>${tx.description}</td>`;
            
            return `
                <tr class="clickable-row" onclick="editTransaction(${originalIndex})">
                    <td>${formattedDate}</td>
                    ${descCell}
                    <td class="fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">${tx.type}</td>
                    <td>${tx.category}</td>
                    <td class="fw-bold">${this.formatCurrency(tx.amount)}</td>
                    <td>
                        <button class="btn-action btn-delete" title="Delete" onclick="event.stopPropagation(); removeTransaction(${originalIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    adjustTransactionsTable() {
        const tableContainer = document.querySelector('#tab-transactions .table-container');
        const table = document.getElementById('transactionsTable');
        
        if (tableContainer && table) {
            tableContainer.style.height = '';
            table.style.width = '';
            
            setTimeout(() => {
                const availableHeight = window.innerHeight - tableContainer.getBoundingClientRect().top - 100;
                tableContainer.style.height = Math.max(availableHeight, 300) + 'px';
            }, 100);
        }
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
            
            const transactionDate = new Date(tx.date);
            const formattedDate = isNaN(transactionDate) ? tx.date : 
                `${transactionDate.getDate()}-${transactionDate.toLocaleString('default', { month: 'short' })}`;
            
            const descCell = tx.description.length > 30 ? 
                `<td class="description-cell" data-fulltext="${tx.description}">${tx.description.substring(0, 30)}...</td>` :
                `<td>${tx.description}</td>`;
            
            return `
                <tr class="clickable-row" onclick="editTransaction(${originalIndex})">
                    <td>${formattedDate}</td>
                    ${descCell}
                    <td class="fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">${tx.type}</td>
                    <td>${tx.category}</td>
                    <td class="fw-bold">${this.formatCurrency(tx.amount)}</td>
                    <td>
                        <button class="btn-action btn-delete" title="Delete" onclick="event.stopPropagation(); removeTransaction(${originalIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    populateChartFilters() {
        const chartMonth = document.getElementById('chartMonth');
        const chartYear = document.getElementById('chartYear');
        
        if (!chartMonth || !chartYear) return;
        
        chartMonth.innerHTML = '<option value="all">All Months</option>';
        chartYear.innerHTML = '<option value="all">All Years</option>';
        
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"];
        
        monthNames.forEach((monthName, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = monthName;
            chartMonth.appendChild(option);
        });
        
        const years = Array.from(new Set(this.transactions.map(tx => {
            const year = new Date(tx.date).getFullYear();
            return isNaN(year) ? null : year;
        }).filter(year => year !== null)))
        .sort((a, b) => b - a);
        
        const currentYear = new Date().getFullYear();
        if (!years.includes(currentYear)) {
            years.unshift(currentYear);
        }
        
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            chartYear.appendChild(option);
        });
        
        const now = new Date();
        chartMonth.value = now.getMonth() + 1;
        chartYear.value = now.getFullYear();
        
        chartMonth.addEventListener('change', () => this.renderEnhancedAnalytics());
        chartYear.addEventListener('change', () => this.renderEnhancedAnalytics());
    }

    // Manual Sync
    manualSync() {
        if (!this.googleUser) {
            this.showGoogleSignIn();
            return;
        }
        
        this.triggerSync();
    }

    // Import/Export functions
    exportData() {
        const data = {
            transactions: this.transactions,
            categories: this.categories,
            currency: this.settings.currency,
            monthlyBudgets: this.monthlyBudgets,
            futureTransactions: this.futureTransactions,
            loans: this.loans,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}));
        const a = document.createElement("a");
        a.href = url;
        a.download = "finance-flow-backup.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.showToast('Data exported successfully', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                
                // Validate imported data
                if (!data.transactions || !Array.isArray(data.transactions)) {
                    throw new Error('Invalid file format: transactions missing');
                }
                
                if (confirm('This will replace all your current data. Are you sure?')) {
                    if (Array.isArray(data.transactions)) this.transactions = data.transactions;
                    if (Array.isArray(data.categories)) this.categories = data.categories;
                    if (typeof data.currency === "string") this.settings.currency = data.currency;
                    if (data.monthlyBudgets) this.monthlyBudgets = data.monthlyBudgets;
                    if (data.futureTransactions) this.futureTransactions = data.futureTransactions;
                    if (data.loans) this.loans = data.loans;
                    
                    this.saveData('transactions', this.transactions);
                    this.saveData('categories', this.categories);
                    this.saveData('settings', this.settings);
                    this.saveData('monthlyBudgets', this.monthlyBudgets);
                    this.saveData('futureTransactions', this.futureTransactions);
                    this.saveData('loans', this.loans);
                    
                    this.renderCategoryList();
                    this.populateSummaryFilters();
                    this.updateDashboard();
                    this.renderPlannerProjections();
                    this.renderDebtManagement();
                    this.showToast("Import successful!", "success");
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showToast("Import failed: " + error.message, "danger");
            }
        };
        reader.readAsText(file);
    }

    // Planner Engine
    renderPlannerProjections() {
        const currentBalance = this.getCurrentBalance();
        const projections = this.calculateProjections(currentBalance);
        
        this.updatePlannerSummary(projections.summary);
        this.renderPlannerTimeline(projections.months);
        this.renderFutureIncomeList();
        this.renderFutureExpensesList();
    }

    calculateProjections(currentBalance) {
        const projections = {
            months: [],
            summary: {
                totalIncome: 0,
                totalExpenses: 0,
                netWealth: currentBalance,
                endingBalance: currentBalance
            }
        };
        
        const now = new Date();
        const months = this.plannerTimeframe === '1year' ? 12 : this.plannerTimeframe === '2years' ? 24 : 36;
        
        let runningBalance = currentBalance;
        
        for (let i = 0; i < months; i++) {
            const currentDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
            
            let monthIncome = 0;
            let monthExpenses = 0;
            
            // Calculate income for this month
            this.futureTransactions.income.forEach(income => {
                if (this.shouldIncludeInMonth(income, currentDate)) {
                    monthIncome += income.amount;
                }
            });
            
            // Calculate expenses for this month
            this.futureTransactions.expenses.forEach(expense => {
                if (this.shouldIncludeInMonth(expense, currentDate)) {
                    monthExpenses += expense.amount;
                }
            });
            
            runningBalance += monthIncome - monthExpenses;
            
            projections.months.push({
                month: monthKey,
                name: monthName,
                income: monthIncome,
                expenses: monthExpenses,
                net: monthIncome - monthExpenses,
                balance: runningBalance
            });
            
            projections.summary.totalIncome += monthIncome;
            projections.summary.totalExpenses += monthExpenses;
        }
        
        projections.summary.netWealth = projections.summary.totalIncome - projections.summary.totalExpenses;
        projections.summary.endingBalance = runningBalance;
        
        return projections;
    }

    shouldIncludeInMonth(transaction, targetDate) {
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        
        const startDate = new Date(transaction.startDate);
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        
        // If transaction starts after target month, exclude
        if (startYear > targetYear || (startYear === targetYear && startMonth > targetMonth)) {
            return false;
        }
        
        // Check end date if exists
        if (transaction.endDate) {
            const endDate = new Date(transaction.endDate);
            const endMonth = endDate.getMonth();
            const endYear = endDate.getFullYear();
            
            if (endYear < targetYear || (endYear === targetYear && endMonth < targetMonth)) {
                return false;
            }
        }
        
        // Check frequency
        if (transaction.frequency === 'one-time') {
            return startMonth === targetMonth && startYear === targetYear;
        } else if (transaction.frequency === 'monthly') {
            return true;
        } else if (transaction.frequency === 'quarterly') {
            const monthsDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
            return monthsDiff % 3 === 0;
        }
        
        return false;
    }

    updatePlannerSummary(summary) {
        const netWealthElement = document.getElementById('plannerNetWealth');
        const totalIncomeElement = document.getElementById('plannerTotalIncome');
        const totalExpensesElement = document.getElementById('plannerTotalExpenses');
        const endingBalanceElement = document.getElementById('plannerEndingBalance');
        
        if (netWealthElement) netWealthElement.textContent = this.formatCurrency(summary.netWealth);
        if (totalIncomeElement) totalIncomeElement.textContent = this.formatCurrency(summary.totalIncome);
        if (totalExpensesElement) totalExpensesElement.textContent = this.formatCurrency(summary.totalExpenses);
        if (endingBalanceElement) endingBalanceElement.textContent = this.formatCurrency(summary.endingBalance);
    }

    renderPlannerTimeline(months) {
        const container = document.getElementById('plannerTimeline');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (months.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No projection data available</div>';
            return;
        }
        
        months.forEach(month => {
            const monthElement = document.createElement('div');
            monthElement.className = 'planner-month-item clickable';
            monthElement.onclick = () => this.showMonthDetails(month);
            
            // Add visual indicator for positive/negative months
            const balanceClass = month.balance >= 0 ? 'text-success' : 'text-danger';
            const netClass = month.net >= 0 ? 'text-success' : 'text-danger';
            
            monthElement.innerHTML = `
                <div class="planner-month-header">
                    <strong>${month.name}</strong>
                    <span class="planner-month-balance ${balanceClass}">
                        ${this.formatCurrency(month.balance)}
                    </span>
                </div>
                <div class="planner-month-details">
                    <div class="planner-income">
                        <small class="text-success">+${this.formatCurrency(month.income)}</small>
                    </div>
                    <div class="planner-expense">
                        <small class="text-danger">-${this.formatCurrency(month.expenses)}</small>
                    </div>
                    <div class="planner-net">
                        <small class="${netClass}">
                            Net: ${month.net >= 0 ? '+' : ''}${this.formatCurrency(month.net)}
                        </small>
                    </div>
                </div>
                <div class="text-center mt-2">
                    <small class="text-muted">
                        <i class="bi bi-info-circle"></i> Click for details
                    </small>
                </div>
            `;
            container.appendChild(monthElement);
        });
    }

    renderFutureIncomeList() {
        const container = document.getElementById('futureIncomeList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.futureTransactions.income.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No future income planned</div>';
            return;
        }
        
        this.futureTransactions.income.forEach((income, index) => {
            const item = document.createElement('div');
            item.className = 'planner-item';
            item.innerHTML = `
                <div class="planner-item-info">
                    <div class="fw-bold">${income.description}</div>
                    <small class="text-muted">
                        ${income.type} • ${income.frequency} • 
                        ${this.formatCurrency(income.amount)}
                    </small>
                    <div>
                        <small class="text-muted">
                            ${income.startDate} ${income.endDate ? ' to ' + income.endDate : ''}
                        </small>
                    </div>
                </div>
                <div class="planner-item-actions">
                    <button class="btn-action btn-edit" onclick="editFutureIncome(${index})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="removeFutureIncome(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderFutureExpensesList() {
        const container = document.getElementById('futureExpensesList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.futureTransactions.expenses.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No future expenses planned</div>';
            return;
        }
        
        this.futureTransactions.expenses.forEach((expense, index) => {
            const item = document.createElement('div');
            item.className = 'planner-item';
            item.innerHTML = `
                <div class="planner-item-info">
                    <div class="fw-bold">${expense.description}</div>
                    <small class="text-muted">
                        ${expense.type} • ${expense.frequency} • 
                        ${this.formatCurrency(expense.amount)}
                    </small>
                    <div>
                        <small class="text-muted">
                            ${expense.startDate} ${expense.endDate ? ' to ' + expense.endDate : ''}
                        </small>
                    </div>
                </div>
                <div class="planner-item-actions">
                    <button class="btn-action btn-edit" onclick="editFutureExpense(${index})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="removeFutureExpense(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    changePlannerTimeframe(timeframe) {
        this.plannerTimeframe = timeframe;
        document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        this.renderPlannerProjections();
    }

    // Debt Management
    renderDebtManagement() {
        const summary = this.calculateDebtSummary();
        this.updateDebtSummary(summary);
        this.renderLoansGivenList();
        this.renderLoansTakenList();
        this.renderUpcomingRepayments(summary.upcomingRepayments);
    }

    calculateDebtSummary() {
        const totalGiven = this.loans.given.reduce((sum, loan) => sum + (loan.amount - this.getPaidAmount(loan)), 0);
        const totalTaken = this.loans.taken.reduce((sum, loan) => sum + (loan.amount - this.getPaidAmount(loan)), 0);
        
        const upcomingRepayments = [...this.loans.given, ...this.loans.taken]
            .filter(loan => loan.status !== 'completed')
            .sort((a, b) => new Date(a.expectedReturn || a.dueDate) - new Date(b.expectedReturn || b.dueDate))
            .slice(0, 5);
        
        // Update upcoming count
        const upcomingCountElement = document.getElementById('upcomingCount');
        if (upcomingCountElement) {
            upcomingCountElement.textContent = upcomingRepayments.length;
        }
        
        return {
            totalGiven,
            totalTaken,
            netPosition: totalGiven - totalTaken,
            upcomingRepayments
        };
    }

    getPaidAmount(loan) {
        return loan.payments ? loan.payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;
    }

    getLoanStatus(loan) {
        const paid = this.getPaidAmount(loan);
        const dueDate = new Date(loan.expectedReturn || loan.dueDate);
        const today = new Date();
        
        if (paid >= loan.amount) return 'completed';
        if (dueDate < today) return 'overdue';
        if (paid > 0) return 'partially_paid';
        return 'pending';
    }

    addPayment(loan, amount, date) {
        if (!loan.payments) loan.payments = [];
        loan.payments.push({
            date: date || new Date().toISOString().split('T')[0],
            amount: amount
        });
        
        // Update status
        loan.status = this.getLoanStatus(loan);
    }

    updateDebtSummary(summary) {
        const totalGivenElement = document.getElementById('totalLoansGiven');
        const totalTakenElement = document.getElementById('totalLoansTaken');
        const netPositionElement = document.getElementById('netDebtPosition');
        
        if (totalGivenElement) totalGivenElement.textContent = this.formatCurrency(summary.totalGiven);
        if (totalTakenElement) totalTakenElement.textContent = this.formatCurrency(summary.totalTaken);
        
        if (netPositionElement) {
            netPositionElement.textContent = this.formatCurrency(summary.netPosition);
            
            // Remove existing classes
            netPositionElement.classList.remove('text-success', 'text-danger');
            
            // Add appropriate color class
            if (summary.netPosition >= 0) {
                netPositionElement.classList.add('text-success');
            } else {
                netPositionElement.classList.add('text-danger');
            }
        }
    }

    renderLoansGivenList() {
        const container = document.getElementById('loansGivenList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.loans.given.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No loans given</div>';
            return;
        }
        
        this.loans.given.forEach((loan, index) => {
            const paid = this.getPaidAmount(loan);
            const remaining = loan.amount - paid;
            const status = this.getLoanStatus(loan);
            
            const item = document.createElement('div');
            item.className = `debt-item debt-status-${status}`;
            item.innerHTML = `
                <div class="debt-item-info">
                    <div class="fw-bold">${loan.borrower}</div>
                    <small class="text-muted">
                        ${this.formatCurrency(loan.amount)} • 
                        Given: ${loan.dateGiven} • 
                        Expected: ${loan.expectedReturn}
                    </small>
                    <div class="debt-progress">
                        <div class="progress" style="height: 5px;">
                            <div class="progress-bar" style="width: ${(paid / loan.amount) * 100}%"></div>
                        </div>
                        <small class="text-muted">
                            Paid: ${this.formatCurrency(paid)} • 
                            Remaining: ${this.formatCurrency(remaining)}
                        </small>
                    </div>
                </div>
                <div class="debt-item-actions">
                    <button class="btn-action btn-payment" onclick="addLoanPayment('given', ${index})" title="Add Payment">
                        <i class="bi bi-cash-coin"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editLoan('given', ${index})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="removeLoan('given', ${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderLoansTakenList() {
        const container = document.getElementById('loansTakenList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.loans.taken.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No loans taken</div>';
            return;
        }
        
        this.loans.taken.forEach((loan, index) => {
            const paid = this.getPaidAmount(loan);
            const remaining = loan.amount - paid;
            const status = this.getLoanStatus(loan);
            
            const item = document.createElement('div');
            item.className = `debt-item debt-status-${status}`;
            item.innerHTML = `
                <div class="debt-item-info">
                    <div class="fw-bold">${loan.lender}</div>
                    <small class="text-muted">
                        ${this.formatCurrency(loan.amount)} • 
                        Taken: ${loan.dateTaken} • 
                        Due: ${loan.dueDate}
                    </small>
                    <div class="debt-progress">
                        <div class="progress" style="height: 5px;">
                            <div class="progress-bar" style="width: ${(paid / loan.amount) * 100}%"></div>
                        </div>
                        <small class="text-muted">
                            Paid: ${this.formatCurrency(paid)} • 
                            Remaining: ${this.formatCurrency(remaining)}
                        </small>
                    </div>
                </div>
                <div class="debt-item-actions">
                    <button class="btn-action btn-payment" onclick="addLoanPayment('taken', ${index})" title="Add Payment">
                        <i class="bi bi-cash-coin"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editLoan('taken', ${index})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="removeLoan('taken', ${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderUpcomingRepayments(repayments) {
        const container = document.getElementById('upcomingRepayments');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (repayments.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No upcoming repayments</div>';
            return;
        }
        
        repayments.forEach(loan => {
            const isGiven = this.loans.given.includes(loan);
            const paid = this.getPaidAmount(loan);
            const remaining = loan.amount - paid;
            const dueDate = new Date(loan.expectedReturn || loan.dueDate);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            const item = document.createElement('div');
            item.className = 'repayment-item';
            item.innerHTML = `
                <div class="repayment-info">
                    <div class="fw-bold">${isGiven ? loan.borrower : loan.lender}</div>
                    <small class="text-muted">
                        ${this.formatCurrency(remaining)} • 
                        Due in ${daysUntilDue} days
                    </small>
                </div>
                <div class="repayment-amount">
                    <small class="${daysUntilDue <= 7 ? 'text-danger' : 'text-warning'}">
                        ${dueDate.toLocaleDateString()}
                    </small>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // Month Details Modal
    showMonthDetails(monthData) {
        const modal = new bootstrap.Modal(document.getElementById('monthDetailsModal'));
        
        // Update modal title
        document.getElementById('monthDetailsModalLabel').innerHTML = 
            `<i class="bi bi-calendar-month"></i> ${monthData.name} Details`;
        
        // Update summary
        document.getElementById('monthDetailsIncome').textContent = 
            this.formatCurrency(monthData.income);
        document.getElementById('monthDetailsExpenses').textContent = 
            this.formatCurrency(monthData.expenses);
        document.getElementById('monthDetailsBalance').textContent = 
            this.formatCurrency(monthData.balance);
        
        // Calculate and display income breakdown
        const incomeBreakdown = this.calculateMonthBreakdown(monthData, 'income');
        this.renderMonthBreakdown('monthDetailsIncomeList', incomeBreakdown, 'income');
        
        // Calculate and display expense breakdown
        const expenseBreakdown = this.calculateMonthBreakdown(monthData, 'expenses');
        this.renderMonthBreakdown('monthDetailsExpensesList', expenseBreakdown, 'expenses');
        
        // Show transaction calculations
        this.renderTransactionCalculations(monthData);
        
        modal.show();
    }

    calculateMonthBreakdown(monthData, type) {
        const breakdown = {};
        const transactions = type === 'income' ? this.futureTransactions.income : this.futureTransactions.expenses;
        
        transactions.forEach(transaction => {
            if (this.shouldIncludeTransactionInMonth(transaction, monthData.month)) {
                const category = transaction.type;
                if (!breakdown[category]) {
                    breakdown[category] = {
                        amount: 0,
                        transactions: []
                    };
                }
                breakdown[category].amount += transaction.amount;
                breakdown[category].transactions.push(transaction);
            }
        });
        
        return breakdown;
    }

    shouldIncludeTransactionInMonth(transaction, targetMonth) {
        const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
        const startDate = new Date(transaction.startDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        
        // Check if transaction starts after target month
        if (startYear > targetYear || (startYear === targetYear && startMonth > targetMonthNum)) {
            return false;
        }
        
        // Check end date if exists
        if (transaction.endDate) {
            const endDate = new Date(transaction.endDate);
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1;
            
            if (endYear < targetYear || (endYear === targetYear && endMonth < targetMonthNum)) {
                return false;
            }
        }
        
        // Check frequency
        if (transaction.frequency === 'one-time') {
            return startYear === targetYear && startMonth === targetMonthNum;
        } else if (transaction.frequency === 'monthly') {
            return true;
        } else if (transaction.frequency === 'quarterly') {
            const monthsDiff = (targetYear - startYear) * 12 + (targetMonthNum - startMonth);
            return monthsDiff % 3 === 0;
        }
        
        return false;
    }

    renderMonthBreakdown(containerId, breakdown, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (Object.keys(breakdown).length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-3">
                    <i class="bi bi-${type === 'income' ? 'currency-dollar' : 'cart'} fs-4"></i>
                    <p class="mt-2">No ${type} for this month</p>
                </div>
            `;
            return;
        }
        
        Object.entries(breakdown).forEach(([category, data]) => {
            const item = document.createElement('div');
            item.className = type === 'income' ? 'month-details-income-item' : 'month-details-expense-item';
            
            const categoryName = this.getCategoryDisplayName(category, type);
            
            item.innerHTML = `
                <div>
                    <div class="fw-bold">${categoryName}</div>
                    <small class="text-muted">${data.transactions.length} transaction(s)</small>
                </div>
                <div class="fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}">
                    ${this.formatCurrency(data.amount)}
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    getCategoryDisplayName(categoryKey, type) {
        const categoryNames = {
            income: {
                paycheck: 'Salary/Paycheck',
                loan: 'Loan Income',
                sale: 'Asset Sale',
                committee: 'Committee Payout'
            },
            expenses: {
                grocery: 'Grocery',
                bike_fuel: 'Bike/Fuel',
                expenses: 'General Expenses',
                loan_returned: 'Loan Repayment',
                committee: 'Committee'
            }
        };
        
        return categoryNames[type][categoryKey] || categoryKey;
    }

    renderTransactionCalculations(monthData) {
        const container = document.getElementById('monthDetailsTransactions');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Show calculation breakdown
        const calculationHTML = `
            <div class="alert alert-info">
                <h6><i class="bi bi-calculator"></i> Balance Calculation</h6>
                <div class="small">
                    <div class="d-flex justify-content-between">
                        <span>Starting Balance:</span>
                        <span>${this.formatCurrency(monthData.balance - monthData.net)}</span>
                    </div>
                    <div class="d-flex justify-content-between text-success">
                        <span>+ Total Income:</span>
                        <span>+${this.formatCurrency(monthData.income)}</span>
                    </div>
                    <div class="d-flex justify-content-between text-danger">
                        <span>- Total Expenses:</span>
                        <span>-${this.formatCurrency(monthData.expenses)}</span>
                    </div>
                    <hr class="my-1">
                    <div class="d-flex justify-content-between fw-bold">
                        <span>Ending Balance:</span>
                        <span class="${monthData.balance >= 0 ? 'text-success' : 'text-danger'}">
                            ${this.formatCurrency(monthData.balance)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="alert alert-light">
                <h6><i class="bi bi-lightbulb"></i> Financial Health</h6>
                <div class="small">
                    <div class="d-flex justify-content-between">
                        <span>Savings Rate:</span>
                        <span class="${monthData.income > 0 ? (monthData.net / monthData.income) >= 0.2 ? 'text-success' : 'text-warning' : 'text-danger'}">
                            ${monthData.income > 0 ? ((monthData.net / monthData.income) * 100).toFixed(1) : '0'}%
                        </span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span>Net Cash Flow:</span>
                        <span class="${monthData.net >= 0 ? 'text-success' : 'text-danger'}">
                            ${monthData.net >= 0 ? '+' : ''}${this.formatCurrency(monthData.net)}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = calculationHTML;
    }
}

// Global functions for HTML event handlers
let financeFlow;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    financeFlow = new FinanceFlow();
    
    // Setup form event listeners
    const futureIncomeForm = document.getElementById('futureIncomeForm');
    if (futureIncomeForm) {
        futureIncomeForm.addEventListener('submit', handleFutureIncomeSubmit);
    }
    
    const futureExpenseForm = document.getElementById('futureExpenseForm');
    if (futureExpenseForm) {
        futureExpenseForm.addEventListener('submit', handleFutureExpenseSubmit);
    }
    
    const loanForm = document.getElementById('loanForm');
    if (loanForm) {
        loanForm.addEventListener('submit', handleLoanSubmit);
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    console.log('Finance Flow initialized successfully');
});

// Handle page visibility changes for sync
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && financeFlow && financeFlow.googleUser) {
        financeFlow.triggerSync();
    }
});

// Global functions
function showGoogleSignIn() {
    financeFlow.showGoogleSignIn();
}

function googleSignOut() {
    financeFlow.googleSignOut();
}

function manualSync() {
    financeFlow.manualSync();
}

function showTab(tabName) {
    financeFlow.showTab(tabName);
}

function quickAddTransaction(type) {
    financeFlow.quickAddTransaction(type);
}

function quickAddTransfer() {
    financeFlow.quickAddTransfer();
}

function editTransaction(index) {
    financeFlow.editTransaction(index);
}

function removeTransaction(index) {
    financeFlow.removeTransaction(index);
}

function editCategory(index) {
    financeFlow.editCategory(index);
}

function removeCategory(index) {
    financeFlow.removeCategory(index);
}

function setCategoryFilter(filter) {
    financeFlow.currentCategoryFilter = filter;
    financeFlow.renderCategoryList();
}

function toggleRolloverSettings() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    if (!monthSel || !yearSel || monthSel.value === 'all' || yearSel.value === 'all') {
        financeFlow.showToast('Please select a specific month to adjust rollover settings', 'warning');
        return;
    }
    
    const monthKey = `${yearSel.value}-${String(monthSel.value).padStart(2, '0')}`;
    const monthData = financeFlow.monthlyBudgets[monthKey];
    
    if (monthData) {
        const newBalance = prompt('Adjust starting balance:', monthData.startingBalance);
        if (newBalance !== null && !isNaN(parseFloat(newBalance))) {
            monthData.startingBalance = parseFloat(newBalance);
            financeFlow.saveData('monthlyBudgets', financeFlow.monthlyBudgets);
            financeFlow.calculateMonthlyRollover();
            financeFlow.updateDashboard();
            financeFlow.showToast('Starting balance updated', 'success');
        }
    }
}

function openAddFutureIncome() {
    document.getElementById('futureIncomeModalLabel').textContent = 'Add Future Income';
    document.getElementById('futureIncomeForm').reset();
    document.getElementById('futureIncomeIndex').value = '-1';
    document.getElementById('futureIncomeType').value = 'paycheck';
    document.getElementById('futureIncomeFrequency').value = 'monthly';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('futureIncomeStartDate').value = today;
    
    const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
    modal.show();
}

function openAddFutureExpense() {
    document.getElementById('futureExpenseModalLabel').textContent = 'Add Future Expense';
    document.getElementById('futureExpenseForm').reset();
    document.getElementById('futureExpenseIndex').value = '-1';
    document.getElementById('futureExpenseType').value = 'grocery';
    document.getElementById('futureExpenseFrequency').value = 'monthly';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('futureExpenseStartDate').value = today;
    
    const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
    modal.show();
}

function editFutureIncome(index) {
    const income = financeFlow.futureTransactions.income[index];
    if (!income) return;
    
    document.getElementById('futureIncomeModalLabel').textContent = 'Edit Future Income';
    document.getElementById('futureIncomeDescription').value = income.description;
    document.getElementById('futureIncomeType').value = income.type;
    document.getElementById('futureIncomeAmount').value = income.amount;
    document.getElementById('futureIncomeFrequency').value = income.frequency;
    document.getElementById('futureIncomeStartDate').value = income.startDate;
    document.getElementById('futureIncomeEndDate').value = income.endDate || '';
    document.getElementById('futureIncomeIndex').value = index;
    
    const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
    modal.show();
}

function editFutureExpense(index) {
    const expense = financeFlow.futureTransactions.expenses[index];
    if (!expense) return;
    
    document.getElementById('futureExpenseModalLabel').textContent = 'Edit Future Expense';
    document.getElementById('futureExpenseDescription').value = expense.description;
    document.getElementById('futureExpenseType').value = expense.type;
    document.getElementById('futureExpenseAmount').value = expense.amount;
    document.getElementById('futureExpenseFrequency').value = expense.frequency;
    document.getElementById('futureExpenseStartDate').value = expense.startDate;
    document.getElementById('futureExpenseEndDate').value = expense.endDate || '';
    document.getElementById('futureExpenseIndex').value = index;
    
    const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
    modal.show();
}

function removeFutureIncome(index) {
    if (confirm('Are you sure you want to remove this future income?')) {
        financeFlow.futureTransactions.income.splice(index, 1);
        financeFlow.saveData('futureTransactions', financeFlow.futureTransactions);
        financeFlow.renderPlannerProjections();
        financeFlow.showToast('Future income removed', 'success');
    }
}

function removeFutureExpense(index) {
    if (confirm('Are you sure you want to remove this future expense?')) {
        financeFlow.futureTransactions.expenses.splice(index, 1);
        financeFlow.saveData('futureTransactions', financeFlow.futureTransactions);
        financeFlow.renderPlannerProjections();
        financeFlow.showToast('Future expense removed', 'success');
    }
}

function handleFutureIncomeSubmit(e) {
    e.preventDefault();
    
    const description = document.getElementById('futureIncomeDescription').value.trim();
    const type = document.getElementById('futureIncomeType').value;
    const amount = parseFloat(document.getElementById('futureIncomeAmount').value);
    const frequency = document.getElementById('futureIncomeFrequency').value;
    const startDate = document.getElementById('futureIncomeStartDate').value;
    const endDate = document.getElementById('futureIncomeEndDate').value || null;
    const index = parseInt(document.getElementById('futureIncomeIndex').value);
    
    if (!description || isNaN(amount) || amount <= 0 || !startDate) {
        financeFlow.showToast('Please fill all required fields correctly', 'danger');
        return;
    }
    
    const incomeData = {
        description,
        type,
        amount,
        frequency,
        startDate,
        endDate
    };
    
    if (index >= 0) {
        financeFlow.futureTransactions.income[index] = incomeData;
        financeFlow.showToast('Future income updated', 'success');
    } else {
        financeFlow.futureTransactions.income.push(incomeData);
        financeFlow.showToast('Future income added', 'success');
    }
    
    financeFlow.saveData('futureTransactions', financeFlow.futureTransactions);
    financeFlow.renderPlannerProjections();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal'));
    modal.hide();
}

function handleFutureExpenseSubmit(e) {
    e.preventDefault();
    
    const description = document.getElementById('futureExpenseDescription').value.trim();
    const type = document.getElementById('futureExpenseType').value;
    const amount = parseFloat(document.getElementById('futureExpenseAmount').value);
    const frequency = document.getElementById('futureExpenseFrequency').value;
    const startDate = document.getElementById('futureExpenseStartDate').value;
    const endDate = document.getElementById('futureExpenseEndDate').value || null;
    const index = parseInt(document.getElementById('futureExpenseIndex').value);
    
    if (!description || isNaN(amount) || amount <= 0 || !startDate) {
        financeFlow.showToast('Please fill all required fields correctly', 'danger');
        return;
    }
    
    const expenseData = {
        description,
        type,
        amount,
        frequency,
        startDate,
        endDate
    };
    
    if (index >= 0) {
        financeFlow.futureTransactions.expenses[index] = expenseData;
        financeFlow.showToast('Future expense updated', 'success');
    } else {
        financeFlow.futureTransactions.expenses.push(expenseData);
        financeFlow.showToast('Future expense added', 'success');
    }
    
    financeFlow.saveData('futureTransactions', financeFlow.futureTransactions);
    financeFlow.renderPlannerProjections();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal'));
    modal.hide();
}

function openAddLoan(type) {
    document.getElementById('loanModalLabel').textContent = `Add Loan ${type === 'given' ? 'Given' : 'Taken'}`;
    document.getElementById('loanForm').reset();
    document.getElementById('loanType').value = type;
    document.getElementById('loanIndex').value = '-1';
    
    const today = new Date().toISOString().split('T')[0];
    if (type === 'given') {
        document.getElementById('loanDateGiven').value = today;
        document.getElementById('loanExpectedReturn').value = '';
        document.getElementById('loanGivenFields').classList.remove('d-none');
        document.getElementById('loanTakenFields').classList.add('d-none');
    } else {
        document.getElementById('loanDateTaken').value = today;
        document.getElementById('loanDueDate').value = '';
        document.getElementById('loanTakenFields').classList.remove('d-none');
        document.getElementById('loanGivenFields').classList.add('d-none');
    }
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

function editLoan(type, index) {
    const loans = type === 'given' ? financeFlow.loans.given : financeFlow.loans.taken;
    const loan = loans[index];
    if (!loan) return;
    
    document.getElementById('loanModalLabel').textContent = `Edit Loan ${type === 'given' ? 'Given' : 'Taken'}`;
    document.getElementById('loanType').value = type;
    document.getElementById('loanIndex').value = index;
    
    if (type === 'given') {
        document.getElementById('loanBorrower').value = loan.borrower;
        document.getElementById('loanAmount').value = loan.amount;
        document.getElementById('loanDateGiven').value = loan.dateGiven;
        document.getElementById('loanExpectedReturn').value = loan.expectedReturn || '';
        document.getElementById('loanGivenFields').classList.remove('d-none');
        document.getElementById('loanTakenFields').classList.add('d-none');
    } else {
        document.getElementById('loanLender').value = loan.lender;
        document.getElementById('loanAmount').value = loan.amount;
        document.getElementById('loanDateTaken').value = loan.dateTaken;
        document.getElementById('loanDueDate').value = loan.dueDate || '';
        document.getElementById('loanTakenFields').classList.remove('d-none');
        document.getElementById('loanGivenFields').classList.add('d-none');
    }
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

function removeLoan(type, index) {
    const loans = type === 'given' ? financeFlow.loans.given : financeFlow.loans.taken;
    const loan = loans[index];
    
    if (confirm(`Are you sure you want to remove this loan ${type === 'given' ? 'given' : 'taken'}?`)) {
        loans.splice(index, 1);
        financeFlow.saveData('loans', financeFlow.loans);
        financeFlow.renderDebtManagement();
        financeFlow.showToast(`Loan ${type === 'given' ? 'given' : 'taken'} removed`, 'success');
    }
}

function addLoanPayment(type, index) {
    const loans = type === 'given' ? financeFlow.loans.given : financeFlow.loans.taken;
    const loan = loans[index];
    
    const amount = prompt(`Enter payment amount (Remaining: ${financeFlow.formatCurrency(loan.amount - financeFlow.getPaidAmount(loan))}):`);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        financeFlow.addPayment(loan, parseFloat(amount));
        financeFlow.saveData('loans', financeFlow.loans);
        financeFlow.renderDebtManagement();
        financeFlow.showToast('Payment recorded', 'success');
    }
}

function handleLoanSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('loanType').value;
    const index = parseInt(document.getElementById('loanIndex').value);
    
    if (type === 'given') {
        const borrower = document.getElementById('loanBorrower').value.trim();
        const amount = parseFloat(document.getElementById('loanAmount').value);
        const dateGiven = document.getElementById('loanDateGiven').value;
        const expectedReturn = document.getElementById('loanExpectedReturn').value || null;
        
        if (!borrower || isNaN(amount) || amount <= 0 || !dateGiven) {
            financeFlow.showToast('Please fill all required fields correctly', 'danger');
            return;
        }
        
        const loanData = {
            borrower,
            amount,
            dateGiven,
            expectedReturn,
            payments: [],
            status: 'pending'
        };
        
        if (index >= 0) {
            // Keep existing payments when editing
            loanData.payments = financeFlow.loans.given[index].payments || [];
            loanData.status = financeFlow.getLoanStatus(loanData);
            financeFlow.loans.given[index] = loanData;
            financeFlow.showToast('Loan given updated', 'success');
        } else {
            financeFlow.loans.given.push(loanData);
            financeFlow.showToast('Loan given added', 'success');
        }
    } else {
        const lender = document.getElementById('loanLender').value.trim();
        const amount = parseFloat(document.getElementById('loanAmount').value);
        const dateTaken = document.getElementById('loanDateTaken').value;
        const dueDate = document.getElementById('loanDueDate').value || null;
        
        if (!lender || isNaN(amount) || amount <= 0 || !dateTaken) {
            financeFlow.showToast('Please fill all required fields correctly', 'danger');
            return;
        }
        
        const loanData = {
            lender,
            amount,
            dateTaken,
            dueDate,
            payments: [],
            status: 'pending'
        };
        
        if (index >= 0) {
            // Keep existing payments when editing
            loanData.payments = financeFlow.loans.taken[index].payments || [];
            loanData.status = financeFlow.getLoanStatus(loanData);
            financeFlow.loans.taken[index] = loanData;
            financeFlow.showToast('Loan taken updated', 'success');
        } else {
            financeFlow.loans.taken.push(loanData);
            financeFlow.showToast('Loan taken added', 'success');
        }
    }
    
    financeFlow.saveData('loans', financeFlow.loans);
    financeFlow.renderDebtManagement();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('loanModal'));
    modal.hide();
}

function changePlannerTimeframe(timeframe) {
    financeFlow.changePlannerTimeframe(timeframe);
}

function showCategoryTransactions(type, categoryName) {
    financeFlow.showCategoryTransactions(type, categoryName);
}

function editTransactionFromCategory(index) {
    financeFlow.editTransactionFromCategory(index);
}

function removeTransactionFromCategory(index) {
    financeFlow.removeTransactionFromCategory(index);
}

function addTransactionForCategory() {
    financeFlow.addTransactionForCategory();
}

function exportData() {
    financeFlow.exportData();
}

function importData(event) {
    const file = event.target.files[0];
    if (file) {
        financeFlow.importData(file);
    }
    event.target.value = '';
}

function resetAppData() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
        localStorage.clear();
        location.reload();
    }
}

function showFullAIAnalysis() {
    financeFlow.showFullAIAnalysis();
}

function applyAISuggestions() {
    financeFlow.applyAISuggestions();
}
