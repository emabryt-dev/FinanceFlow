// Wealth Command: Complete with Google Drive Sync, Monthly Rollover, and AI Analytics

// Initialize variables first
let transactions = loadTransactions();
let categories = loadCategories();
let currency = loadCurrency() || "PKR";
let currentCategoryFilter = 'all';
let mainChart = null;
let incomePieChart = null;
let expensePieChart = null;
let currentChartType = 'category';

// Analytics Charts
let overviewChart = null;
let healthTrendChart = null;
let categoryTrendChart = null;
let comparisonChart = null;

// Planner Data
let futureTransactions = loadFutureTransactions();
let plannerTimeframe = '1year';

// Debt Management Data
let loans = loadLoans();

// Enhanced Google Drive Sync with Two-Tier Backup System
const GOOGLE_DRIVE_FILE_NAME = 'wealth_command_data.json';
const GOOGLE_CLIENT_ID = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';
let googleUser = null;
let googleAuth = null;
let isOnline = navigator.onLine;
let syncInProgress = false;
let pendingSync = false;
let lastBackupMonth = null;
let lastSyncTime = null;

// AI Analytics Engine
const AnalyticsEngine = {
    // Calculate financial health score (0-100)
    calculateHealthScore: function(transactions, monthlyBudgets) {
        if (transactions.length === 0) return 50; // Neutral score for no data
        
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        // Get recent transactions (last 3 months)
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= threeMonthsAgo;
        });
        
        if (recentTransactions.length === 0) return 50;
        
        const totalIncome = recentTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = recentTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // Component scores
        const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpenses) / totalIncome) : 0;
        const savingsScore = Math.min(100, savingsRate * 200); // 50% savings rate = 100 points
        
        const expenseStability = this.calculateExpenseStability(recentTransactions);
        const stabilityScore = Math.min(100, expenseStability * 100);
        
        const incomeDiversity = this.calculateIncomeDiversity(recentTransactions);
        const diversityScore = Math.min(100, incomeDiversity * 100);
        
        const emergencyFundScore = this.calculateEmergencyFundScore(totalExpenses, monthlyBudgets);
        
        // Weighted final score
        const finalScore = 
            (savingsScore * 0.4) + 
            (stabilityScore * 0.3) + 
            (diversityScore * 0.2) + 
            (emergencyFundScore * 0.1);
        
        return Math.round(finalScore);
    },
    
    calculateExpenseStability: function(transactions) {
        const monthlyExpenses = {};
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7); // YYYY-MM
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
            }
        });
        
        const amounts = Object.values(monthlyExpenses);
        if (amounts.length < 2) return 0.7; // Default stability
        
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
        const stability = 1 - (Math.sqrt(variance) / avg);
        
        return Math.max(0, Math.min(1, stability));
    },
    
    calculateIncomeDiversity: function(transactions) {
        const incomeByCategory = {};
        const incomeTransactions = transactions.filter(tx => tx.type === 'income');
        
        if (incomeTransactions.length === 0) return 0;
        
        incomeTransactions.forEach(tx => {
            incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        });
        
        const totalIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0);
        const shares = Object.values(incomeByCategory).map(amount => amount / totalIncome);
        const diversity = 1 - shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
        
        return diversity;
    },
    
    calculateEmergencyFundScore: function(monthlyExpenses, monthlyBudgets) {
        const avgMonthlyExpense = monthlyExpenses / 3; // Based on last 3 months
        const currentMonth = getCurrentMonthKey();
        const currentBalance = monthlyBudgets[currentMonth]?.endingBalance || 0;
        
        if (avgMonthlyExpense === 0) return 50;
        
        const monthsCovered = currentBalance / avgMonthlyExpense;
        if (monthsCovered >= 6) return 100;
        if (monthsCovered >= 3) return 75;
        if (monthsCovered >= 1) return 50;
        return 25;
    },
    
    // Predict next month's spending
    predictNextMonthSpending: function(transactions) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= sixMonthsAgo;
        });
        
        if (recentTransactions.length < 10) return null; // Insufficient data
        
        const monthlyExpenses = {};
        recentTransactions.forEach(tx => {
            if (tx.type === 'expense') {
                const month = tx.date.substring(0, 7);
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.amount;
            }
        });
        
        const amounts = Object.values(monthlyExpenses);
        const avgExpense = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        
        // Simple trend calculation
        let trend = 0;
        if (amounts.length >= 2) {
            const lastTwo = amounts.slice(-2);
            trend = (lastTwo[1] - lastTwo[0]) / lastTwo[0];
        }
        
        const prediction = avgExpense * (1 + trend * 0.5); // Conservative trend application
        const confidence = Math.min(0.9, amounts.length / 10); // More data = more confidence
        
        return {
            amount: Math.round(prediction),
            confidence: confidence,
            trend: trend
        };
    },
    
    // Generate AI insights
    generateInsights: function(transactions, monthlyBudgets) {
        const insights = [];
        const healthScore = this.calculateHealthScore(transactions, monthlyBudgets);
        const prediction = this.predictNextMonthSpending(transactions);
        
        // Health score insights
        if (healthScore >= 80) {
            insights.push({
                type: 'positive',
                message: 'Excellent financial health! Your spending habits are very sustainable.',
                icon: 'bi-emoji-smile'
            });
        } else if (healthScore >= 60) {
            insights.push({
                type: 'info',
                message: 'Good financial health. Small improvements could make it excellent.',
                icon: 'bi-emoji-neutral'
            });
        } else {
            insights.push({
                type: 'warning',
                message: 'Your financial health needs attention. Consider reviewing your spending patterns.',
                icon: 'bi-emoji-frown'
            });
        }
        
        // Savings rate insights
        const savingsRate = this.calculateSavingsRate(transactions);
        if (savingsRate >= 0.2) {
            insights.push({
                type: 'positive',
                message: `Great savings rate of ${(savingsRate * 100).toFixed(0)}%! You're building wealth effectively.`,
                icon: 'bi-piggy-bank'
            });
        } else if (savingsRate >= 0.1) {
            insights.push({
                type: 'info',
                message: `Decent savings rate of ${(savingsRate * 100).toFixed(0)}%. Aim for 20% for optimal wealth building.`,
                icon: 'bi-piggy-bank'
            });
        } else if (savingsRate < 0) {
            insights.push({
                type: 'warning',
                message: 'You\'re spending more than you earn. Consider reducing expenses or increasing income.',
                icon: 'bi-exclamation-triangle'
            });
        }
        
        // Spending pattern insights
        const categoryTrends = this.analyzeCategoryTrends(transactions);
        categoryTrends.forEach(trend => {
            if (trend.trend > 0.1) { // More than 10% increase
                insights.push({
                    type: 'warning',
                    message: `${trend.category} spending is trending up significantly.`,
                    icon: 'bi-graph-up-arrow'
                });
            } else if (trend.trend < -0.1) { // More than 10% decrease
                insights.push({
                    type: 'positive',
                    message: `Great job reducing ${trend.category} spending!`,
                    icon: 'bi-graph-down-arrow'
                });
            }
        });
        
        // Prediction insights
        if (prediction && prediction.confidence > 0.6) {
            insights.push({
                type: 'info',
                message: `Next month's predicted spending: ${prediction.amount.toLocaleString()} ${currency}`,
                icon: 'bi-magic'
            });
        }
        
        return insights.slice(0, 5); // Return top 5 insights
    },
    
    calculateSavingsRate: function(transactions) {
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= threeMonthsAgo;
        });
        
        const totalIncome = recentTransactions.filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = recentTransactions.filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        return totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
    },
    
    analyzeCategoryTrends: function(transactions) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        
        const currentMonthExpenses = {};
        const lastMonthExpenses = {};
        
        transactions.forEach(tx => {
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
            const last = lastMonthExpenses[category] || current * 0.5; // Default if no last month data
            const trend = last > 0 ? (current - last) / last : 0;
            
            trends.push({
                category: category,
                current: current,
                last: last,
                trend: trend,
                change: current - last
            });
        });
        
        return trends.sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend)); // Sort by magnitude of change
    },
    
    // Generate heat map data
    generateHeatMap: function(transactions, year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const heatMap = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTransactions = transactions.filter(tx => tx.date === dateStr && tx.type === 'expense');
            const total = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            
            heatMap.push({
                day: day,
                date: dateStr,
                amount: total,
                transactions: dayTransactions.length
            });
        }
        
        return heatMap;
    },
    
    // Compare periods
    comparePeriods: function(transactions, period1, period2, type) {
        const data1 = this.getPeriodData(transactions, period1, type);
        const data2 = this.getPeriodData(transactions, period2, type);
        
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
    },
    
    getPeriodData: function(transactions, period, type) {
        const data = {};
        
        transactions.forEach(tx => {
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
};

// Planner Engine
const PlannerEngine = {
    calculateProjections: function(futureTransactions, timeframe, currentBalance) {
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
        const months = timeframe === '1year' ? 12 : timeframe === '2years' ? 24 : 36;
        
        let runningBalance = currentBalance;
        
        // Start from next month instead of current month
        for (let i = 1; i <= months; i++) {
            const currentDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
            
            let monthIncome = 0;
            let monthExpenses = 0;
            
            // Calculate income for this month
            futureTransactions.income.forEach(income => {
                if (this.shouldIncludeInMonth(income, currentDate)) {
                    monthIncome += income.amount;
                }
            });
            
            // Calculate expenses for this month
            futureTransactions.expenses.forEach(expense => {
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
    },
    
    shouldIncludeInMonth: function(transaction, targetDate) {
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
            return true; // Include every month
        } else if (transaction.frequency === 'quarterly') {
            const monthsDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
            return monthsDiff % 3 === 0;
        }
        
        return false;
    }
};

// Debt Management Engine
const DebtEngine = {
    calculateDebtSummary: function(loans) {
        const totalGiven = loans.given.reduce((sum, loan) => sum + (loan.amount - this.getPaidAmount(loan)), 0);
        const totalTaken = loans.taken.reduce((sum, loan) => sum + (loan.amount - this.getPaidAmount(loan)), 0);
        
        const upcomingRepayments = [...loans.given, ...loans.taken]
            .filter(loan => loan.status !== 'completed')
            .sort((a, b) => new Date(a.expectedReturn || a.dueDate) - new Date(b.expectedReturn || b.dueDate))
            .slice(0, 5);
        
        return {
            totalGiven,
            totalTaken,
            netPosition: totalGiven - totalTaken,
            upcomingRepayments
        };
    },
    
    getPaidAmount: function(loan) {
        return loan.payments ? loan.payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;
    },
    
    getLoanStatus: function(loan) {
        const paid = this.getPaidAmount(loan);
        const dueDate = new Date(loan.expectedReturn || loan.dueDate);
        const today = new Date();
        
        if (paid >= loan.amount) return 'completed';
        if (dueDate < today) return 'overdue';
        if (paid > 0) return 'partially_paid';
        return 'pending';
    },
    
    addPayment: function(loan, amount, date) {
        if (!loan.payments) loan.payments = [];
        loan.payments.push({
            date: date || new Date().toISOString().split('T')[0],
            amount: amount
        });
        
        // Update status
        loan.status = this.getLoanStatus(loan);
    }
};

// Helper function to get monthly backup filename
function getMonthlyBackupFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `wealth_command_backup_${year}-${month}.json`;
}

// Enhanced Monthly Rollover System
function loadMonthlyBudgets() {
    try {
        const budgets = JSON.parse(localStorage.getItem('monthlyBudgets')) || {};
        ensureAllMonthsHaveBudgets(budgets);
        return budgets;
    } catch {
        const budgets = {};
        ensureAllMonthsHaveBudgets(budgets);
        localStorage.setItem('monthlyBudgets', JSON.stringify(budgets));
        return budgets;
    }
}

function ensureAllMonthsHaveBudgets(budgets) {
    // Get all unique months from transactions
    const transactionMonths = [...new Set(transactions.map(tx => getMonthKeyFromDate(tx.date)))];
    
    // Add current month if no transactions exist
    const currentMonth = getCurrentMonthKey();
    if (!transactionMonths.includes(currentMonth)) {
        transactionMonths.push(currentMonth);
    }
    
    // Ensure each month has a budget entry
    transactionMonths.forEach(month => {
        if (!budgets[month]) {
            budgets[month] = {
                startingBalance: 0,
                income: 0,
                expenses: 0,
                endingBalance: 0,
                autoRollover: true,
                allowNegative: false
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

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

let monthlyBudgets = loadMonthlyBudgets();

function saveMonthlyBudgets(budgets) {
    monthlyBudgets = ensureAllMonthsHaveBudgets(budgets);
    localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
    autoSyncToDrive();
}

function getMonthKeyFromDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return getCurrentMonthKey();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
        return getCurrentMonthKey();
    }
}

function calculateMonthlyRollover() {
    console.log('Calculating monthly rollover...');
    
    // Ensure all months have budget entries
    monthlyBudgets = ensureAllMonthsHaveBudgets(monthlyBudgets);
    
    const months = Object.keys(monthlyBudgets).sort();
    console.log('Processing months:', months);
    
    // First pass: Calculate income and expenses for each month
    months.forEach(month => {
        const monthData = monthlyBudgets[month];
        const monthTransactions = transactions.filter(tx => 
            getMonthKeyFromDate(tx.date) === month
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
        const monthData = monthlyBudgets[currentMonth];
        
        monthData.endingBalance = monthData.startingBalance + monthData.income - monthData.expenses;
        
        // Roll over to next month if auto-rollover is enabled
        if (monthData.autoRollover && i < months.length - 1) {
            const nextMonth = months[i + 1];
            if (monthData.endingBalance >= 0 || monthData.allowNegative) {
                monthlyBudgets[nextMonth].startingBalance = monthData.endingBalance;
            } else {
                monthlyBudgets[nextMonth].startingBalance = 0;
            }
            console.log(`Rollover from ${currentMonth} to ${nextMonth}: ${monthlyBudgets[nextMonth].startingBalance}`);
        }
    }
    
    saveMonthlyBudgets(monthlyBudgets);
    console.log('Rollover calculation completed');
}

function updateRolloverDisplay() {
    const rolloverElement = document.getElementById('rolloverBalance');
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    const selectedMonth = monthSel.value;
    const selectedYear = yearSel.value;
    
    if (selectedMonth === 'all' || selectedYear === 'all') {
        rolloverElement.classList.add('d-none');
        return;
    }
    
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const monthData = monthlyBudgets[monthKey];
    
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
    } else {
        rolloverElement.classList.remove('rollover-positive', 'rollover-negative');
    }
    
    document.getElementById('rolloverAmount').textContent = 
        `${monthData.startingBalance >= 0 ? '+' : ''}${monthData.startingBalance.toLocaleString()} ${currency}`;
    
    const prevMonth = getPreviousMonth(monthKey);
    document.getElementById('rolloverDescription').textContent = 
        `Carried over from ${prevMonth}`;
}

function getPreviousMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

function toggleRolloverSettings() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    if (monthSel.value === 'all' || yearSel.value === 'all') {
        showToast('Please select a specific month to adjust rollover settings', 'warning');
        return;
    }
    
    const monthKey = `${yearSel.value}-${String(monthSel.value).padStart(2, '0')}`;
    const monthData = monthlyBudgets[monthKey];
    
    if (monthData) {
        const newBalance = prompt('Adjust starting balance:', monthData.startingBalance);
        if (newBalance !== null && !isNaN(parseFloat(newBalance))) {
            monthData.startingBalance = parseFloat(newBalance);
            saveMonthlyBudgets(monthlyBudgets);
            calculateMonthlyRollover();
            updateUI();
            showToast('Starting balance updated', 'success');
        }
    }
}

// Enhanced Toast System for important messages only
function showToast(message, type = 'info', duration = 4000) {
    // Only show critical toasts, use status icons for sync messages
    if (type === 'info' && message.includes('sync') || message.includes('Sync')) {
        updateSyncStatus(type, message);
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

// Sync Status Icon System
function updateSyncStatus(status, message = '') {
    const syncIcon = document.getElementById('syncStatusIcon');
    const syncTooltip = document.getElementById('syncStatusTooltip');
    
    if (!syncIcon) return;
    
    // Remove all existing classes
    syncIcon.className = 'bi';
    
    switch (status) {
        case 'success':
            syncIcon.classList.add('bi-cloud-check', 'text-success');
            syncTooltip.textContent = message || `Synced ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'just now'}`;
            break;
        case 'info':
        case 'syncing':
            syncIcon.classList.add('bi-cloud-arrow-up', 'text-info', 'pulse');
            syncTooltip.textContent = message || 'Syncing...';
            break;
        case 'warning':
            syncIcon.classList.add('bi-cloud-slash', 'text-warning');
            syncTooltip.textContent = message || 'Offline - changes will sync when online';
            break;
        case 'danger':
        case 'error':
            syncIcon.classList.add('bi-cloud-x', 'text-danger');
            syncTooltip.textContent = message || 'Sync failed';
            break;
        case 'offline':
            syncIcon.classList.add('bi-cloud-slash', 'text-muted');
            syncTooltip.textContent = message || 'Offline';
            break;
        default:
            syncIcon.classList.add('bi-cloud', 'text-muted');
            syncTooltip.textContent = message || 'Not signed in';
    }
}

function showSyncStatus(message, type) {
    updateSyncStatus(type, message);
    // Only show toast for errors
    if (type === 'danger' || type === 'warning') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer.querySelector('.toast')) {
            showToast(message, type, 5000);
        }
    }
}

// Enhanced Google Auth initialization with better token handling
function initGoogleAuth() {
    if (!window.google) {
        console.error('Google API not loaded');
        showSyncStatus('error', 'Google authentication not available');
        return false;
    }
    
    if (!google.accounts || !google.accounts.oauth2) {
        console.error('Google OAuth2 not available');
        showSyncStatus('error', 'Google authentication not available');
        return false;
    }
    
    try {
        googleAuth = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
callback: async (tokenResponse) => {
    if (tokenResponse && tokenResponse.access_token) {
        googleUser = {
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
            acquired_at: Date.now(),
            scope: tokenResponse.scope
        };
        
        localStorage.setItem('googleUser', JSON.stringify(googleUser));
        showSyncStatus('success', 'Google Drive connected!');
        updateProfileUI();
        
        // Setup auto-refresh for the token
        if (typeof setupTokenAutoRefresh === 'function') {
            setupTokenAutoRefresh();
        }
        
        // Load data from Drive WITH conflict resolution
        const success = await loadDataFromDrive();
        if (!success) {
            // If load fails, sync local data to Drive
            await syncDataToDrive();
        }
    }
},
            error_callback: (error) => {
                console.error('Google Auth error:', error);
                if (error.type === 'user_logged_out') {
                    googleUser = null;
                    localStorage.removeItem('googleUser');
                    updateProfileUI();
                    showSyncStatus('offline', 'Signed out from Google Drive');
                } else {
                    showSyncStatus('error', 'Google Sign-In failed');
                }
            }
        });
        return true;
    } catch (error) {
        console.error('Error initializing Google Auth:', error);
        showSyncStatus('error', 'Failed to initialize Google authentication');
        return false;
    }
}

// Profile Picture and Google Sign-In Functions
function showGoogleSignIn() {
    if (googleAuth) {
        googleAuth.requestAccessToken();
    } else {
        initGoogleAuth();
        setTimeout(() => {
            if (googleAuth) {
                googleAuth.requestAccessToken();
            }
        }, 500);
    }
}

function updateProfileUI() {
    const profilePicture = document.getElementById('profilePicture');
    const signedInUser = document.getElementById('signedInUser');
    const userEmail = document.getElementById('userEmail');
    const signInOption = document.getElementById('signInOption');
    const signOutOption = document.getElementById('signOutOption');
    const syncStatusText = document.getElementById('syncStatusText');
    
    if (googleUser && googleUser.access_token) {
        profilePicture.innerHTML = `<i class="bi bi-cloud-check-fill profile-icon"></i>`;
        signedInUser.classList.remove('d-none');
        userEmail.textContent = 'Connected to Google Drive';
        signInOption.classList.add('d-none');
        signOutOption.classList.remove('d-none');
        
        if (syncStatusText) {
            syncStatusText.textContent = 'Synced with Google Drive';
        }
        showSyncStatus('success', 'Connected to Google Drive');
    } else {
        profilePicture.innerHTML = `<i class="bi bi-person-circle profile-icon"></i>`;
        signedInUser.classList.add('d-none');
        signInOption.classList.remove('d-none');
        signOutOption.classList.add('d-none');
        
        if (syncStatusText) {
            syncStatusText.textContent = 'Sign in to sync with Google Drive';
        }
        showSyncStatus('offline', 'Sign in to sync with Google Drive');
    }
}

// Enhanced data loading from Google Drive
async function loadDataFromDrive() {
    if (!googleUser || !googleUser.access_token) {
        showSyncStatus('offline', 'Not authenticated with Google Drive');
        return false;
    }
    
    if (!isOnline) {
        showSyncStatus('warning', 'Cannot load: You are offline');
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('warning', 'Session expired. Please sign in again.');
        googleSignOut();
        return false;
    }
    
    try {
        showSyncStatus('syncing', 'Loading data from Google Drive...');
        
        // Search for the main sync file
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
            {
                headers: {
                    'Authorization': `Bearer ${googleUser.access_token}`
                }
            }
        );
        
        if (searchResponse.status === 401) {
            showSyncStatus('warning', 'Authentication expired. Please sign in again.');
            googleSignOut();
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
                        'Authorization': `Bearer ${googleUser.access_token}`
                    }
                }
            );
            
            if (!fileResponse.ok) {
                throw new Error(`File download error: ${fileResponse.status}`);
            }
            
            const driveData = await fileResponse.json();
            
            // CONFLICT RESOLUTION: Check if we have local changes that should be preserved
            const hasLocalChanges = await detectLocalChanges(driveData);
            
            if (hasLocalChanges) {
                // Show conflict resolution dialog
                const userChoice = await showConflictResolutionDialog();
                
                if (userChoice === 'local') {
                    // User wants to keep local data - sync local to drive instead
                    showSyncStatus('info', 'Keeping local changes, syncing to Drive...');
                    await syncDataToDrive();
                    return true;
                } else if (userChoice === 'merge') {
                    // Merge data intelligently
                    await mergeData(driveData);
                    showSyncStatus('success', 'Data merged successfully!');
                } else {
                    // User chose 'drive' - proceed with drive data (default behavior)
                    loadDriveData(driveData);
                    showSyncStatus('success', 'Data loaded from Google Drive!');
                }
            } else {
                // No conflicts, just load drive data
                loadDriveData(driveData);
                showSyncStatus('success', 'Data loaded from Google Drive!');
            }
            
            return true;
        } else {
            showSyncStatus('info', 'No existing data found. Creating new backup...');
            // No file found, create one with current data
            await syncDataToDrive();
            return true;
        }
    } catch (error) {
        console.error('Error loading from Drive:', error);
        showSyncStatus('error', 'Error loading from Google Drive');
        return false;
    }
}

// Detect if local data has changes that would be lost
async function detectLocalChanges(driveData) {
    // Check transactions
    const localTxCount = transactions.length;
    const driveTxCount = driveData.transactions ? driveData.transactions.length : 0;
    
    if (localTxCount > driveTxCount) {
        return true; // We have more transactions locally
    }
    
    // Check if any local transactions are newer than what's in drive
    if (driveData.transactions && localTxCount > 0) {
        const localLatest = getLatestTransactionDate(transactions);
        const driveLatest = getLatestTransactionDate(driveData.transactions);
        
        if (localLatest > driveLatest) {
            return true;
        }
    }
    
    // Check other data types for changes
    const checks = [
        { local: categories, drive: driveData.categories, name: 'categories' },
        { local: monthlyBudgets, drive: driveData.monthlyBudgets, name: 'monthlyBudgets' },
        { local: futureTransactions, drive: driveData.futureTransactions, name: 'futureTransactions' },
        { local: loans, drive: driveData.loans, name: 'loans' }
    ];
    
    for (let check of checks) {
        if (hasDataChanges(check.local, check.drive)) {
            return true;
        }
    }
    
    return false;
}

// Get the latest transaction date
function getLatestTransactionDate(transactionArray) {
    if (!transactionArray || transactionArray.length === 0) return new Date(0);
    
    return new Date(Math.max(...transactionArray.map(tx => new Date(tx.date))));
}

// Check if data has meaningful changes
function hasDataChanges(localData, driveData) {
    if (!localData && !driveData) return false;
    if (!localData && driveData) return false; // No local data, use drive
    if (localData && !driveData) return true; // We have local data, drive doesn't
    
    return JSON.stringify(localData) !== JSON.stringify(driveData);
}

// Load drive data into app
function loadDriveData(driveData) {
    // Validate and load data
    if (driveData.transactions && Array.isArray(driveData.transactions)) {
        transactions = driveData.transactions;
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
    
    if (driveData.categories && Array.isArray(driveData.categories)) {
        categories = driveData.categories;
        localStorage.setItem('categories', JSON.stringify(categories));
    }
    
    if (driveData.currency) {
        currency = driveData.currency;
        localStorage.setItem('currency', currency);
    }
    
    if (driveData.monthlyBudgets) {
        monthlyBudgets = driveData.monthlyBudgets;
        localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
    }
    
    if (driveData.futureTransactions) {
        futureTransactions = driveData.futureTransactions;
        localStorage.setItem('futureTransactions', JSON.stringify(futureTransactions));
    }
    
    if (driveData.loans) {
        loans = driveData.loans;
        localStorage.setItem('loans', JSON.stringify(loans));
    }
    
    // Update last backup month from loaded data
    if (driveData.lastBackupMonth) {
        lastBackupMonth = driveData.lastBackupMonth;
    }
    
    if (driveData.lastSync) {
        lastSyncTime = driveData.lastSync;
    }
    
    // Update UI with loaded data
    updateUI();
    populateSummaryFilters();
    renderCategoryList();
    renderPlannerProjections();
    renderDebtManagement();
}

// Show conflict resolution dialog
function showConflictResolutionDialog() {
    return new Promise((resolve) => {
        // Create a custom modal for conflict resolution
        const modalHTML = `
            <div class="modal fade" id="conflictResolutionModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-exclamation-triangle text-warning"></i> Data Sync Conflict</h5>
                        </div>
                        <div class="modal-body">
                            <p>We found local changes that haven't been synced to Google Drive yet.</p>
                            <p><strong>What would you like to do?</strong></p>
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="radio" name="syncOption" id="useLocal" checked>
                                <label class="form-check-label" for="useLocal">
                                    <strong>Keep my local changes</strong><br>
                                    <small class="text-muted">Upload my current data to Google Drive (recommended)</small>
                                </label>
                            </div>
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="radio" name="syncOption" id="useDrive">
                                <label class="form-check-label" for="useDrive">
                                    <strong>Use Google Drive data</strong><br>
                                    <small class="text-muted">Replace my local data with older cloud data</small>
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="syncOption" id="mergeData">
                                <label class="form-check-label" for="mergeData">
                                    <strong>Try to merge both</strong><br>
                                    <small class="text-muted">Combine local and cloud data (experimental)</small>
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="confirmSyncChoice">Continue</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalElement = document.getElementById('conflictResolutionModal');
        const modal = new bootstrap.Modal(modalElement);
        
        // Set up event listener
        document.getElementById('confirmSyncChoice').onclick = function() {
            const selectedOption = document.querySelector('input[name="syncOption"]:checked').id;
            modal.hide();
            
            // Clean up modal
            setTimeout(() => {
                modalElement.remove();
            }, 500);
            
            // Resolve with user's choice
            switch(selectedOption) {
                case 'useLocal': resolve('local'); break;
                case 'useDrive': resolve('drive'); break;
                case 'mergeData': resolve('merge'); break;
                default: resolve('local');
            }
        };
        
        // Show modal
        modal.show();
        
        // Auto-close and use local data if modal is dismissed
        modalElement.addEventListener('hidden.bs.modal', () => {
            if (!document.querySelector('input[name="syncOption"]:checked')) {
                resolve('local'); // Default to local if dismissed
            }
            modalElement.remove();
        });
    });
}

// Merge local and drive data intelligently
async function mergeData(driveData) {
    console.log('Merging local and drive data...');
    
    // Merge transactions (by date and description to avoid duplicates)
    if (driveData.transactions) {
        const mergedTransactions = [...driveData.transactions];
        
        transactions.forEach(localTx => {
            const isDuplicate = mergedTransactions.some(driveTx => 
                driveTx.date === localTx.date && 
                driveTx.desc === localTx.desc && 
                driveTx.amount === localTx.amount
            );
            
            if (!isDuplicate) {
                mergedTransactions.push(localTx);
            }
        });
        
        transactions = mergedTransactions;
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
    
    // Merge categories (unique by name)
    if (driveData.categories) {
        const mergedCategories = [...driveData.categories];
        
        categories.forEach(localCat => {
            const exists = mergedCategories.some(driveCat => 
                driveCat.name === localCat.name
            );
            
            if (!exists) {
                mergedCategories.push(localCat);
            }
        });
        
        categories = mergedCategories;
        localStorage.setItem('categories', JSON.stringify(categories));
    }
    
    // For other data types, prefer local if it exists, otherwise use drive
    if (!currency && driveData.currency) {
        currency = driveData.currency;
        localStorage.setItem('currency', currency);
    }
    
    if (Object.keys(monthlyBudgets).length === 0 && driveData.monthlyBudgets) {
        monthlyBudgets = driveData.monthlyBudgets;
        localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
    }
    
    if ((!futureTransactions.income.length && !futureTransactions.expenses.length) && driveData.futureTransactions) {
        futureTransactions = driveData.futureTransactions;
        localStorage.setItem('futureTransactions', JSON.stringify(futureTransactions));
    }
    
    if ((!loans.given.length && !loans.taken.length) && driveData.loans) {
        loans = driveData.loans;
        localStorage.setItem('loans', JSON.stringify(loans));
    }
    
    // Update UI
    updateUI();
    populateSummaryFilters();
    renderCategoryList();
    renderPlannerProjections();
    renderDebtManagement();
    
    // Sync merged data back to drive
    await syncDataToDrive();
}

// Helper function to sync a single file
async function syncSingleFile(fileName, fileData, overwrite = true) {
    // Search for existing file
    const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id)`,
        {
            headers: {
                'Authorization': `Bearer ${googleUser.access_token}`
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
                    'Authorization': `Bearer ${googleUser.access_token}`,
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
                    'Authorization': `Bearer ${googleUser.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: fileName,
                    mimeType: 'application/json',
                    description: `Wealth Command ${fileName.includes('backup') ? 'Monthly Backup' : 'Main Sync File'}`
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
                    'Authorization': `Bearer ${googleUser.access_token}`,
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

// Enhanced sync function with monthly backups
async function syncDataToDrive() {
    if (syncInProgress) {
        pendingSync = true;
        return false;
    }
    
    if (!googleUser || !googleUser.access_token) {
        console.log('Not authenticated, skipping sync');
        return false;
    }
    
    if (!isOnline) {
        console.log('Offline, skipping sync');
        pendingSync = true;
        showSyncStatus('warning', 'Offline - changes queued for sync');
        return false;
    }
    
    // Check if token is expired
    if (isTokenExpired(googleUser)) {
        showSyncStatus('warning', 'Session expired. Please sign in again.');
        googleSignOut();
        return false;
    }
    
    syncInProgress = true;
    showSyncStatus('syncing', 'Syncing to Google Drive...');
    
    try {
        const currentMonth = getCurrentMonthKey();
        const shouldCreateMonthlyBackup = lastBackupMonth !== currentMonth;
        
        const fileData = {
            transactions,
            categories,
            currency,
            monthlyBudgets,
            futureTransactions,
            loans,
            lastSync: new Date().toISOString(),
            lastBackupMonth: currentMonth,
            version: '1.3',
            app: 'Wealth Command'
        };
        
        // Step 1: Sync main file (always)
        console.log('Syncing main file...');
        const mainFileSuccess = await syncSingleFile(GOOGLE_DRIVE_FILE_NAME, fileData);
        
        if (!mainFileSuccess) {
            throw new Error('Failed to sync main file');
        }
        
        // Step 2: Create monthly backup if needed
        if (shouldCreateMonthlyBackup) {
            console.log('Creating monthly backup...');
            const monthlyFileName = getMonthlyBackupFileName();
            const monthlyBackupData = {
                ...fileData,
                isMonthlyBackup: true,
                backupMonth: currentMonth,
                created: new Date().toISOString()
            };
            
            await syncSingleFile(monthlyFileName, monthlyBackupData, false); // Don't overwrite existing monthly backups
            
            // Update last backup month
            lastBackupMonth = currentMonth;
            fileData.lastBackupMonth = currentMonth;
            
            // Update main file with new backup month info
            await syncSingleFile(GOOGLE_DRIVE_FILE_NAME, fileData);
            
            showSyncStatus('success', 'Data synced + monthly backup created!');
        } else {
            showSyncStatus('success', 'Data synced to Google Drive!');
        }
        
        lastSyncTime = new Date().toISOString();
        console.log('Sync completed successfully');
        return true;
    } catch (error) {
        console.error('Error syncing to Drive:', error);
        
        if (error.message.includes('Authentication expired') || error.message.includes('401')) {
            showSyncStatus('warning', 'Authentication expired. Please sign in again.');
            googleSignOut();
        } else {
            showSyncStatus('error', 'Sync failed: ' + error.message);
        }
        return false;
    } finally {
        syncInProgress = false;
        
        // Process pending sync if any
        if (pendingSync) {
            pendingSync = false;
            setTimeout(syncDataToDrive, 1000);
        }
    }
}

// Check if token is expired
function isTokenExpired(user) {
    if (!user || !user.acquired_at || !user.expires_in) return true;
    
    const elapsed = Date.now() - user.acquired_at;
    const expiresIn = user.expires_in * 1000; // Convert to milliseconds
    const buffer = 2 * 60 * 1000; // 2 minutes buffer
    
    return elapsed > (expiresIn - buffer);
}

// Auto-refresh token before expiry
function setupTokenAutoRefresh() {
    if (googleUser && googleUser.expires_in) {
        const refreshTime = (googleUser.expires_in - 300) * 1000; // Refresh 5 minutes before expiry
        if (refreshTime > 0) {
            setTimeout(() => {
                if (googleUser && isOnline) {
                    console.log('Refreshing Google token before expiry');
                    showGoogleSignIn();
                }
            }, refreshTime);
        }
    }
}

// Enhanced manual sync with offline support
async function manualSync() {
    if (!googleUser) {
        showGoogleSignIn();
        return;
    }
    
    if (!isOnline) {
        showSyncStatus('warning', 'Cannot sync: You are offline');
        return;
    }
    
    try {
        const success = await syncDataToDrive();
        if (success) {
            showSyncStatus('success', 'Manual sync completed!');
        }
    } catch (error) {
        showSyncStatus('error', 'Sync failed - working offline');
    }
}

// Enhanced sign-out function
function googleSignOut() {
    if (googleUser && googleUser.access_token) {
        if (window.google && google.accounts.oauth2) {
            google.accounts.oauth2.revoke(googleUser.access_token, () => {
                console.log('Token revoked');
            });
        }
    }
    
    googleUser = null;
    localStorage.removeItem('googleUser');
    updateProfileUI();
    showSyncStatus('offline', 'Signed out from Google Drive');
}

// Enhanced online/offline handling
window.addEventListener('online', () => {
    isOnline = true;
    showSyncStatus('info', 'Back online. Syncing data...');
    
    if (googleUser) {
        // Sync when coming back online
        setTimeout(() => {
            syncDataToDrive().catch(error => {
                console.log('Sync after reconnect failed:', error);
                showSyncStatus('warning', 'Working offline - Sync failed');
            });
        }, 2000);
    }
});

window.addEventListener('offline', () => {
    isOnline = false;
    showSyncStatus('warning', 'You are offline. Changes saved locally.');
});

window.addEventListener('offline', () => {
    isOnline = false;
    showSyncStatus('warning', 'You are offline. Changes will sync when back online.');
});

// Enhanced auto-sync function - don't block if offline
function autoSyncToDrive() {
    if (googleUser && isOnline) {
        // Debounce sync to avoid too many requests
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => {
            syncDataToDrive().catch(error => {
                console.log('Sync failed, continuing offline:', error);
            });
        }, 2000);
    }
    // If no Google user or offline, just continue - data is saved locally
}

// Modify all save functions to work offline first
function saveTransactions(arr) {
    transactions = arr;
    localStorage.setItem('transactions', JSON.stringify(arr));
    calculateMonthlyRollover();
    autoSyncToDrive(); // Try to sync, but don't depend on it
}

function saveCategories(arr) {
    categories = arr;
    localStorage.setItem('categories', JSON.stringify(arr));
    autoSyncToDrive();
}

function saveCurrency(val) {
    currency = val;
    localStorage.setItem("currency", val);
    autoSyncToDrive();
}

function saveMonthlyBudgets(budgets) {
    monthlyBudgets = ensureAllMonthsHaveBudgets(budgets);
    localStorage.setItem('monthlyBudgets', JSON.stringify(monthlyBudgets));
    autoSyncToDrive();
}

function saveFutureTransactions(data) {
    futureTransactions = data;
    localStorage.setItem('futureTransactions', JSON.stringify(data));
    autoSyncToDrive();
}

function saveLoans(data) {
    loans = data;
    localStorage.setItem('loans', JSON.stringify(data));
    autoSyncToDrive();
}

// Periodic sync (every 5 minutes when online and authenticated)
function startPeriodicSync() {
    setInterval(() => {
        if (googleUser && isOnline && !syncInProgress) {
            console.log('Periodic sync check...');
            syncDataToDrive();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

//Populate Chart Tab
function populateChartFilters() {
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
    
    const years = Array.from(new Set(transactions.map(tx => {
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
    
    chartMonth.addEventListener('change', renderEnhancedAnalytics);
    chartYear.addEventListener('change', renderEnhancedAnalytics);
}

// Tab Persistence System
function initTabState() {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'transactions', 'planner', 'debt', 'analytics', 'settings'];
    const savedTab = localStorage.getItem('lastActiveTab');
    
    let initialTab = 'dashboard';
    
    if (validTabs.includes(hash)) {
        initialTab = hash;
    } else if (validTabs.includes(savedTab)) {
        initialTab = savedTab;
    }
    
    showTab(initialTab);
}

function updateUrlHash(tab) {
    if (window.location.hash !== `#${tab}`) {
        window.location.hash = tab;
    }
}

// Page navigation logic with persistence
const tabs = ["dashboard", "transactions", "planner", "debt", "analytics", "settings"];
function showTab(tab) {
    if (!tabs.includes(tab)) {
        tab = 'dashboard';
    }
    
    // Update URL and storage
    updateUrlHash(tab);
    localStorage.setItem('lastActiveTab', tab);
    
    // Update UI
    tabs.forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle("d-none", t !== tab);
        const btn = document.querySelector(`[data-tab='${t}']`);
        if (btn) {
            btn.classList.toggle("active", t === tab);
        }
    });
    
    setTimeout(() => {
        if (tab === "transactions") {
            adjustTransactionsTable();
        }
    }, 50);
    
    if (tab === "analytics") {
        renderEnhancedAnalytics();
        populateChartFilters();
    }
    
    if (tab === "planner") {
        renderPlannerProjections();
    }
    
    if (tab === "debt") {
        renderDebtManagement();
    }
    
    console.log(`Switched to tab: ${tab}`);
}
// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (tabs.includes(hash)) {
        showTab(hash);
    }
});

function adjustTransactionsTable() {
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

window.addEventListener('resize', function() {
    if (!document.getElementById('tab-transactions').classList.contains('d-none')) {
        adjustTransactionsTable();
    }
});

// Enhanced tab switching with animations
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        showTab(this.dataset.tab);
    });
});

// Fixed Category Transactions Modal
let currentCategoryView = null;
let currentCategoryTransactions = [];

function showCategoryTransactions(type, categoryName) {
    currentCategoryView = { type, categoryName };
    const modal = new bootstrap.Modal(document.getElementById('categoryTransactionsModal'));
    const title = document.getElementById('categoryTransactionsTitle');
    const info = document.getElementById('categoryTransactionsInfo');
    const totalAmount = document.getElementById('categoryTotalAmount');
    const transactionsList = document.getElementById('categoryTransactionsList');
    const noTransactions = document.getElementById('noCategoryTransactions');
    
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    let filteredTx = transactions.filter(tx => tx.type === type);
    
    if (categoryName !== 'all') {
        filteredTx = filteredTx.filter(tx => tx.category === categoryName);
    }
    
    if (monthSel.value !== "all" || yearSel.value !== "all") {
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
    currentCategoryTransactions = filteredTx.map(tx => {
        const originalIndex = transactions.findIndex(t => 
            t.date === tx.date && t.desc === tx.desc && t.amount === tx.amount && t.type === tx.type && t.category === tx.category
        );
        return { ...tx, originalIndex };
    }).filter(item => item.originalIndex !== -1);
    
    if (categoryName === 'all') {
        title.innerHTML = `<i class="bi bi-list-ul"></i> All ${type.charAt(0).toUpperCase() + type.slice(1)} Transactions`;
        info.textContent = `Showing ${currentCategoryTransactions.length} transactions`;
    } else {
        title.innerHTML = `<i class="bi bi-tag"></i> ${categoryName} Transactions`;
        info.textContent = `Showing ${currentCategoryTransactions.length} ${type} transactions`;
    }
    
    const total = currentCategoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    totalAmount.textContent = `${total.toLocaleString()} ${currency}`;
    totalAmount.className = `fw-bold fs-5 ${type === 'income' ? 'text-success' : 'text-danger'}`;
    
    transactionsList.innerHTML = '';
    
    if (currentCategoryTransactions.length === 0) {
        noTransactions.classList.remove('d-none');
        transactionsList.classList.add('d-none');
    } else {
        noTransactions.classList.add('d-none');
        transactionsList.classList.remove('d-none');
        
        currentCategoryTransactions.slice().reverse().forEach((tx, idx) => {
            const item = document.createElement('div');
            item.className = 'category-transaction-item';
            item.innerHTML = `
                <div class="category-transaction-info">
                    <div class="fw-bold">${tx.desc}</div>
                    <small class="text-muted">${tx.date} • ${tx.category}</small>
                </div>
                <div class="category-transaction-actions">
                    <span class="fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}">
                        ${tx.amount.toLocaleString()} ${currency}
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
    
    modal.show();
}

function editTransactionFromCategory(idx) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
    if (modal) {
        modal.hide();
    }
    setTimeout(() => editTransaction(idx), 300);
}

function removeTransactionFromCategory(idx) {
    const transaction = transactions[idx];
    if (!transaction) {
        showToast('Transaction not found', 'danger');
        return;
    }

    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    
    document.getElementById('confirmationTitle').textContent = 'Delete Transaction?';
    document.getElementById('confirmationMessage').innerHTML = `
        Are you sure you want to delete this transaction?<br>
        <strong>${transaction.desc}</strong> - ${transaction.amount} ${currency}<br>
        <small class="text-muted">${transaction.date} • ${transaction.category}</small>
    `;
    
    document.getElementById('confirmActionBtn').onclick = function() {
        transactions.splice(idx, 1);
        saveTransactions(transactions);
        updateUI();
        populateSummaryFilters();
        confirmationModal.hide();
        
        // Refresh the category modal
        setTimeout(() => {
            if (currentCategoryView) {
                showCategoryTransactions(currentCategoryView.type, currentCategoryView.categoryName);
            }
        }, 500);
        
        showToast('Transaction deleted successfully', 'success');
    };
    
    confirmationModal.show();
}

function addTransactionForCategory() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('categoryTransactionsModal'));
    if (modal) {
        modal.hide();
    }
    
    setTimeout(() => {
        if (currentCategoryView && currentCategoryView.categoryName !== 'all') {
            document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
            document.getElementById('submitButtonText').textContent = 'Add';
            document.getElementById('editTransactionIndex').value = '-1';
            document.getElementById('transactionForm').reset();
            
            document.getElementById('typeInput').value = currentCategoryView.type;
            updateCategorySelect();
            document.getElementById('categoryInput').value = currentCategoryView.categoryName;
            
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('dateInput').value = today;
            
            const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            addTxModal.show();
        } else {
            document.getElementById('openAddTransactionModal').click();
        }
    }, 300);
}

// Settings: Currency selection
document.getElementById("currencySelect").value = currency;
document.getElementById("currencySelect").addEventListener("change", function() {
    currency = this.value;
    saveCurrency(currency);
    document.getElementById("currencyLabel").textContent = currency;
    updateUI();
});

// Enhanced Category Management
const catPanel = document.getElementById('categorySettingsPanel');
document.getElementById('toggleCategorySettings').onclick = function() {
    catPanel.classList.toggle('collapse');
    document.getElementById('catCollapseIcon').innerHTML =
        catPanel.classList.contains('collapse')
            ? '<i class="bi bi-chevron-right"></i>'
            : '<i class="bi bi-chevron-down"></i>';
};

function renderCategoryList() {
    const ul = document.getElementById('categoryList');
    ul.innerHTML = '';
    
    const filterButtons = `
        <div class="category-filter-buttons mb-2">
            <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setCategoryFilter('all')">All</button>
            <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'income' ? 'btn-success' : 'btn-outline-success'}" onclick="setCategoryFilter('income')">Income</button>
            <button class="btn btn-sm category-filter-btn ${currentCategoryFilter === 'expense' ? 'btn-danger' : 'btn-outline-danger'}" onclick="setCategoryFilter('expense')">Expense</button>
        </div>
    `;
    ul.innerHTML = filterButtons;
    
    const filteredCategories = categories.filter(cat => {
        if (currentCategoryFilter === 'all') return true;
        return cat.type === currentCategoryFilter;
    });
    
    if (filteredCategories.length === 0) {
        const li = document.createElement('li');
        li.className = "list-group-item text-center text-muted";
        li.textContent = "No categories found";
        ul.appendChild(li);
        return;
    }
    
    filteredCategories.forEach((cat, idx) => {
        const originalIndex = categories.findIndex(c => c.name === cat.name);
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
                <button class="btn btn-sm btn-outline-secondary me-1" title="Edit" onclick="editCategory(${originalIndex})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="removeCategory(${originalIndex})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        ul.appendChild(li);
    });
    
    updateCategorySelect();
}

window.setCategoryFilter = function(filter) {
    currentCategoryFilter = filter;
    renderCategoryList();
};

document.getElementById('addCategoryBtn').onclick = function() {
    const name = document.getElementById('newCategoryInput').value.trim();
    const type = document.getElementById('newCategoryType').value;
    
    if (!name) {
        showCategoryAlert("Please enter a category name", "danger");
        return;
    }
    
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        showCategoryAlert("Category already exists", "danger");
        return;
    }
    
    categories.push({ name, type });
    saveCategories(categories);
    renderCategoryList();
    document.getElementById('newCategoryInput').value = '';
    showCategoryAlert("Category added successfully", "success");
};

window.editCategory = function(idx) {
    const cat = categories[idx];
    const newName = prompt("Edit category name:", cat.name);
    if (newName && newName.trim() && !categories.some((c, i) => i !== idx && c.name.toLowerCase() === newName.toLowerCase())) {
        categories[idx].name = newName.trim();
        saveCategories(categories);
        renderCategoryList();
        updateUI();
    }
};

window.removeCategory = function(idx) {
    const isUsed = transactions.some(tx => tx.category === categories[idx].name);
    
    if (isUsed) {
        if (!confirm(`This category is used in ${transactions.filter(tx => tx.category === categories[idx].name).length} transaction(s). Are you sure you want to delete it?`)) {
            return;
        }
    } else {
        if (!confirm("Are you sure you want to delete this category?")) {
            return;
        }
    }
    
    categories.splice(idx, 1);
    saveCategories(categories);
    renderCategoryList();
    updateUI();
};

function showCategoryAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.getElementById('categorySettingsPanel').appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

function updateCategorySelect() {
    const typeSelect = document.getElementById('typeInput');
    const categorySelect = document.getElementById('categoryInput');
    const currentType = typeSelect.value;
    
    const filteredCategories = categories.filter(cat => cat.type === currentType);
    
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

document.getElementById('typeInput').addEventListener('change', updateCategorySelect);

// Always open with current month filter
function populateSummaryFilters() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
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
    
    const yearsArr = Array.from(new Set(transactions.map(tx => {
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
    monthSel.addEventListener('change', updateUI);
    yearSel.addEventListener('change', updateUI);
}

// Add Transaction Modal
const addTxModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
document.getElementById('openAddTransactionModal').onclick = () => {
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-plus-circle"></i> Add Transaction';
    document.getElementById('submitButtonText').textContent = 'Add';
    document.getElementById('editTransactionIndex').value = '-1';
    document.getElementById('transactionForm').reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
    
    addTxModal.show();
};

// Edit Transaction Function
window.editTransaction = function(idx) {
    const transaction = transactions[idx];
    document.getElementById('addTransactionModalLabel').innerHTML = '<i class="bi bi-pencil"></i> Edit Transaction';
    document.getElementById('submitButtonText').textContent = 'Update';
    document.getElementById('editTransactionIndex').value = idx;
    
    document.getElementById('dateInput').value = transaction.date;
    document.getElementById('descInput').value = transaction.desc;
    document.getElementById('typeInput').value = transaction.type;
    document.getElementById('amountInput').value = transaction.amount;
    
    updateCategorySelect();
    document.getElementById('categoryInput').value = transaction.category;
    
    addTxModal.show();
};

// Enhanced Delete Confirmation
window.removeTransaction = function(idx) {
    const transaction = transactions[idx];
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    
    document.getElementById('confirmationTitle').textContent = 'Delete Transaction?';
    document.getElementById('confirmationMessage').innerHTML = `
        Are you sure you want to delete this transaction?<br>
        <strong>${transaction.desc}</strong> - ${transaction.amount} ${currency}<br>
        <small class="text-muted">${transaction.date} • ${transaction.category}</small>
    `;
    
    document.getElementById('confirmActionBtn').onclick = function() {
        transactions.splice(idx, 1);
        saveTransactions(transactions);
        updateUI();
        populateSummaryFilters();
        confirmationModal.hide();
        showToast('Transaction deleted successfully', 'success');
    };
    
    confirmationModal.show();
};

// Add/Edit Transaction Form
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const date = document.getElementById('dateInput').value;
    const desc = document.getElementById('descInput').value.trim();
    const type = document.getElementById('typeInput').value;
    const cat = document.getElementById('categoryInput').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    const editIndex = parseInt(document.getElementById('editTransactionIndex').value);
    const alertBox = document.getElementById('formAlert');
    alertBox.classList.add('d-none');

    if (!date || !desc || !type || !cat || isNaN(amount)) {
        alertBox.textContent = "Please fill out all fields correctly.";
        alertBox.classList.remove('d-none');
        return;
    }
    if (desc.length < 2) {
        alertBox.textContent = "Description must be at least 2 characters.";
        alertBox.classList.remove('d-none');
        return;
    }
    
    if (editIndex >= 0) {
        transactions[editIndex] = { date, desc, type, category: cat, amount };
        showToast('Transaction updated successfully', 'success');
    } else {
        transactions.push({ date, desc, type, category: cat, amount });
        showToast('Transaction added successfully', 'success');
    }
    
    saveTransactions(transactions);
    calculateMonthlyRollover();
    updateUI();
    addTxModal.hide();
    this.reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
});

// Update UI: Dashboard, Breakdown, Transactions
function updateUI() {
    document.getElementById("currencyLabel").textContent = currency;
    
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    let filteredTx = transactions;
    
    if (monthSel && yearSel && (monthSel.value !== "all" || yearSel.value !== "all")) {
        filteredTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            if (isNaN(d)) return false;
            let valid = true;
            if (monthSel.value !== "all") valid = valid && (d.getMonth()+1) == monthSel.value;
            if (yearSel.value !== "all") valid = valid && d.getFullYear() == yearSel.value;
            return valid;
        });
    }
    
    let totalIncome = filteredTx.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
    let totalExpense = filteredTx.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    let netWealth = totalIncome - totalExpense;
    
    if (monthSel.value !== "all" && yearSel.value !== "all") {
        const monthKey = `${yearSel.value}-${String(monthSel.value).padStart(2, '0')}`;
        const monthData = monthlyBudgets[monthKey];
        if (monthData) {
            netWealth += monthData.startingBalance;
        }
    }
    
    document.getElementById("totalIncome").textContent = totalIncome.toLocaleString() + " " + currency;
    document.getElementById("totalExpense").textContent = totalExpense.toLocaleString() + " " + currency;
    document.getElementById("netWealth").textContent = netWealth.toLocaleString() + " " + currency;

    updateRolloverDisplay();

    // Income Breakdown - Only show categories with amount > 0
    const incomeBreakdown = document.getElementById("incomeBreakdown");
    const noIncomeMsg = document.getElementById("noIncomeCategories");
    incomeBreakdown.innerHTML = "";
    
    const incomeCategories = categories.filter(cat => cat.type === "income");
    let hasIncomeData = false;
    
    if (incomeCategories.length === 0) {
        noIncomeMsg.style.display = 'block';
    } else {
        noIncomeMsg.style.display = 'none';
        
        incomeCategories.forEach(cat => {
            const catAmount = filteredTx.filter(tx => tx.category === cat.name && tx.type === "income")
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            if (catAmount > 0) {
                hasIncomeData = true;
                
                const item = document.createElement("div");
                item.className = "breakdown-item";
                item.onclick = (e) => {
                    e.stopPropagation();
                    showCategoryTransactions('income', cat.name);
                };
                item.innerHTML = `
                    <span class="breakdown-category">${cat.name}</span>
                    <span class="breakdown-amount">${catAmount.toLocaleString()} ${currency}</span>
                `;
                incomeBreakdown.appendChild(item);
            }
        });
        
        if (!hasIncomeData) {
            noIncomeMsg.style.display = 'block';
        } else {
            noIncomeMsg.style.display = 'none';
        }
    }

    // Expense Breakdown - Only show categories with amount > 0
    const expenseBreakdown = document.getElementById("expenseBreakdown");
    const noExpenseMsg = document.getElementById("noExpenseCategories");
    expenseBreakdown.innerHTML = "";
    
    const expenseCategories = categories.filter(cat => cat.type === "expense");
    let hasExpenseData = false;
    
    if (expenseCategories.length === 0) {
        noExpenseMsg.style.display = 'block';
    } else {
        noExpenseMsg.style.display = 'none';
        
        expenseCategories.forEach(cat => {
            const catAmount = filteredTx.filter(tx => tx.category === cat.name && tx.type === "expense")
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            if (catAmount > 0) {
                hasExpenseData = true;
                
                const item = document.createElement("div");
                item.className = "breakdown-item";
                item.onclick = (e) => {
                    e.stopPropagation();
                    showCategoryTransactions('expense', cat.name);
                };
                item.innerHTML = `
                    <span class="breakdown-category">${cat.name}</span>
                    <span class="breakdown-amount">${catAmount.toLocaleString()} ${currency}</span>
                `;
                expenseBreakdown.appendChild(item);
            }
        });
        
        if (!hasExpenseData) {
            noExpenseMsg.style.display = 'block';
        } else {
            noExpenseMsg.style.display = 'none';
        }
    }

    // Transactions Table with enhanced description column and horizontal scrolling
    const tbody = document.getElementById('transactionsBody');
    tbody.innerHTML = "";
    if (transactions.length === 0) {
        document.getElementById('noTransactions').style.display = 'block';
    } else {
        document.getElementById('noTransactions').style.display = 'none';
        transactions.slice().reverse().forEach((tx, idx) => {
            const originalIndex = transactions.length - 1 - idx;
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.onclick = () => editTransaction(originalIndex);
            
            // Format date as "DD-MMM" (e.g., "26-Sep")
            const transactionDate = new Date(tx.date);
            const formattedDate = isNaN(transactionDate) ? tx.date : 
                `${transactionDate.getDate()}-${transactionDate.toLocaleString('default', { month: 'short' })}`;
            
            const descCell = tx.desc.length > 30 ? 
                `<td class="description-cell" data-fulltext="${tx.desc}">${tx.desc.substring(0, 30)}...</td>` :
                `<td>${tx.desc}</td>`;
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                ${descCell}
                <td class="fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">${tx.type}</td>
                <td>${tx.category}</td>
                <td class="fw-bold">${tx.amount.toLocaleString()} ${currency}</td>
                <td>
                    <button class="btn-action btn-delete" title="Delete" onclick="event.stopPropagation(); removeTransaction(${originalIndex})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Enhanced Analytics Functions
function renderEnhancedAnalytics() {
    updateAnalyticsOverview();
    renderTrendsTab();
    renderComparisonTab();
    updateAIInsights();
}

function updateAnalyticsOverview() {
    // Update health score
    const healthScore = AnalyticsEngine.calculateHealthScore(transactions, monthlyBudgets);
    const healthScoreElement = document.getElementById('healthScoreValue');
    const healthLabelElement = document.getElementById('healthScoreLabel');
    
    if (healthScoreElement) {
        healthScoreElement.textContent = healthScore;
        healthScoreElement.className = 'health-score-value';
        
        if (healthScore >= 80) {
            healthScoreElement.classList.add('excellent');
            healthLabelElement.textContent = 'Excellent';
        } else if (healthScore >= 60) {
            healthScoreElement.classList.add('good');
            healthLabelElement.textContent = 'Good';
        } else if (healthScore >= 40) {
            healthScoreElement.classList.add('fair');
            healthLabelElement.textContent = 'Fair';
        } else {
            healthScoreElement.classList.add('poor');
            healthLabelElement.textContent = 'Needs Attention';
        }
    }
    
    // Update savings rate
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    const savingsRateElement = document.getElementById('savingsRateValue');
    const savingsProgressElement = document.getElementById('savingsRateProgress');
    
    if (savingsRateElement) {
        const percentage = (savingsRate * 100).toFixed(1);
        savingsRateElement.textContent = `${percentage}%`;
        
        if (savingsProgressElement) {
            const progressWidth = Math.min(100, Math.max(0, savingsRate * 200)); // 50% savings = 100% progress
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
    
    // Render overview chart
    renderOverviewChart();
    
    // Render pie charts
    renderPieCharts();
    
    // Render risk alerts in overview
    renderRiskAlerts();
}

function renderOverviewChart() {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('overviewChartPlaceholder');
    
    if (overviewChart) {
        overviewChart.destroy();
    }
    
    if (transactions.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const chartType = document.getElementById('overviewChartType')?.value || 'category';
    
    switch (chartType) {
        case 'category':
            renderCategoryOverviewChart(canvasCtx);
            break;
        case 'monthly':
            renderMonthlyOverviewChart(canvasCtx);
            break;
        case 'yearly':
            renderYearlyOverviewChart(canvasCtx);
            break;
    }
}

function renderCategoryOverviewChart(ctx) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const categoryData = {};
    categories.forEach(cat => {
        if (cat.type === 'expense') {
            categoryData[cat.name] = 0;
        }
    });
    
    transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
            categoryData[tx.category] = (categoryData[tx.category] || 0) + tx.amount;
        }
    });
    
    const labels = Object.keys(categoryData).filter(cat => categoryData[cat] > 0);
    const data = labels.map(cat => categoryData[cat]);
    
    overviewChart = new Chart(ctx, {
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
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const category = labels[index];
                    showCategoryTransactions('expense', category);
                }
            }
        }
    });
}

function renderMonthlyOverviewChart(ctx) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyData = Array(12).fill().map(() => ({ income: 0, expense: 0 }));
    
    transactions.forEach(tx => {
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
    
    overviewChart = new Chart(ctx, {
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
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}

function renderYearlyOverviewChart(ctx) {
    const years = Array.from(new Set(transactions.map(tx => new Date(tx.date).getFullYear())))
        .filter(year => !isNaN(year))
        .sort((a, b) => a - b);
    
    const yearlyData = {};
    years.forEach(year => {
        yearlyData[year] = { income: 0, expense: 0 };
    });
    
    transactions.forEach(tx => {
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
    
    overviewChart = new Chart(ctx, {
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
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}

function renderPieCharts() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Income Pie Chart
    const incomeData = {};
    transactions.forEach(tx => {
        if (tx.type === 'income' && tx.date.startsWith(currentMonth)) {
            incomeData[tx.category] = (incomeData[tx.category] || 0) + tx.amount;
        }
    });
    
    const incomeCtx = document.getElementById('incomePieChart');
    const incomePlaceholder = document.getElementById('incomePiePlaceholder');
    
    if (incomePieChart) incomePieChart.destroy();
    
    if (Object.keys(incomeData).length === 0) {
        incomePlaceholder.style.display = 'flex';
    } else {
        incomePlaceholder.style.display = 'none';
        incomePieChart = new Chart(incomeCtx, {
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
    transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
            expenseData[tx.category] = (expenseData[tx.category] || 0) + tx.amount;
        }
    });
    
    const expenseCtx = document.getElementById('expensePieChart');
    const expensePlaceholder = document.getElementById('expensePiePlaceholder');
    
    if (expensePieChart) expensePieChart.destroy();
    
    if (Object.keys(expenseData).length === 0) {
        expensePlaceholder.style.display = 'flex';
    } else {
        expensePlaceholder.style.display = 'none';
        expensePieChart = new Chart(expenseCtx, {
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

function renderRiskAlerts() {
    const container = document.getElementById('riskAlerts');
    const placeholder = document.getElementById('noRiskAlerts');
    
    if (!container) return;
    
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    const riskAlerts = insights.filter(insight => insight.type === 'warning');
    
    container.innerHTML = '';
    
    if (riskAlerts.length === 0) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
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

function renderTrendsTab() {
    renderHealthTrendChart();
    renderHeatMap();
    renderCategoryTrendChart();
}

function renderHealthTrendChart() {
    const ctx = document.getElementById('healthTrendChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('healthTrendPlaceholder');
    
    if (healthTrendChart) {
        healthTrendChart.destroy();
    }
    
    // Calculate health scores for last 6 months
    const now = new Date();
    const healthScores = [];
    const labels = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Filter transactions for this month
        const monthTransactions = transactions.filter(tx => 
            getMonthKeyFromDate(tx.date) === monthKey
        );
        
        const score = AnalyticsEngine.calculateHealthScore(monthTransactions, monthlyBudgets);
        healthScores.push(score);
        labels.push(date.toLocaleDateString('en', { month: 'short' }));
    }
    
    if (healthScores.filter(score => score > 0).length < 2) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    healthTrendChart = new Chart(canvasCtx, {
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
                        callback: function(value) {
                            return value + '/100';
                        }
                    }
                }
            }
        }
    });
}

function renderHeatMap() {
    const container = document.getElementById('heatMapContainer');
    const placeholder = document.getElementById('heatMapPlaceholder');
    
    if (!container) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const heatMapData = AnalyticsEngine.generateHeatMap(transactions, currentYear, currentMonth);
    
    container.innerHTML = '';
    
    if (heatMapData.filter(day => day.amount > 0).length === 0) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    container.classList.remove('d-none');
    
    // Find max amount for color scaling
    const maxAmount = Math.max(...heatMapData.map(day => day.amount));
    
    const heatMapHTML = heatMapData.map(day => {
        const intensity = maxAmount > 0 ? (day.amount / maxAmount) : 0;
        const colorIntensity = Math.floor(intensity * 100);
        
        return `
            <div class="heat-map-day" style="background-color: rgba(220, 53, 69, ${0.3 + intensity * 0.7})" 
                 title="${day.date}: ${day.amount.toLocaleString()} ${currency}">
                ${day.day}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="heat-map-grid">${heatMapHTML}</div>`;
}

function renderCategoryTrendChart() {
    const ctx = document.getElementById('categoryTrendChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('categoryTrendPlaceholder');
    
    if (categoryTrendChart) {
        categoryTrendChart.destroy();
    }
    
    const trends = AnalyticsEngine.analyzeCategoryTrends(transactions);
    
    if (trends.length === 0) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const topTrends = trends.slice(0, 5); // Show top 5 trends
    
    categoryTrendChart = new Chart(canvasCtx, {
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
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

function renderComparisonTab() {
    populateComparisonFilters();
    renderComparisonChart();
    renderChangeAnalysis();
}

function populateComparisonFilters() {
    const typeSelect = document.getElementById('comparisonType');
    const period1Select = document.getElementById('comparisonPeriod1');
    const period2Select = document.getElementById('comparisonPeriod2');
    
    if (!typeSelect || !period1Select || !period2Select) return;
    
    // Get available months and years from transactions
    const months = Array.from(new Set(transactions.map(tx => tx.date.substring(0, 7)))).sort();
    const years = Array.from(new Set(transactions.map(tx => tx.date.substring(0, 4)))).sort();
    
    // Populate period selects based on comparison type
    typeSelect.addEventListener('change', function() {
        period1Select.innerHTML = '';
        period2Select.innerHTML = '';
        
        const now = new Date();
        
        switch (this.value) {
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
        
        renderComparisonChart();
        renderChangeAnalysis();
    });
    
    // Trigger initial population
    typeSelect.dispatchEvent(new Event('change'));
}

function renderComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const placeholder = document.getElementById('comparisonPlaceholder');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const type = document.getElementById('comparisonType').value;
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) {
        placeholder.classList.remove('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, type);
    
    const categories = Object.keys(comparison).filter(cat => 
        comparison[cat].period1 > 0 || comparison[cat].period2 > 0
    );
    
    const period1Data = categories.map(cat => comparison[cat].period1);
    const period2Data = categories.map(cat => comparison[cat].period2);
    
    comparisonChart = new Chart(canvasCtx, {
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
                        callback: function(value) {
                            return value.toLocaleString() + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}

function renderChangeAnalysis() {
    const container = document.getElementById('changeAnalysis');
    const placeholder = document.getElementById('noChangeAnalysis');
    
    if (!container) return;
    
    const type = document.getElementById('comparisonType').value;
    const period1 = document.getElementById('comparisonPeriod1').value;
    const period2 = document.getElementById('comparisonPeriod2').value;
    
    if (!period1 || !period2) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    const comparison = AnalyticsEngine.comparePeriods(transactions, period1, period2, type);
    
    container.innerHTML = '';
    
    const significantChanges = Object.entries(comparison)
        .filter(([cat, data]) => Math.abs(data.percentChange) > 5 && (data.period1 > 0 || data.period2 > 0))
        .sort((a, b) => Math.abs(b[1].percentChange) - Math.abs(a[1].percentChange))
        .slice(0, 5);
    
    if (significantChanges.length === 0) {
        placeholder.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }
    
    placeholder.classList.add('d-none');
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
                    ${data.period1.toLocaleString()} → ${data.period2.toLocaleString()} ${currency}
                </small>
            </div>
        `;
        container.appendChild(changeElement);
    });
}

function updateAIInsights() {
    const container = document.getElementById('aiQuickInsights');
    if (!container) return;
    
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    
    container.innerHTML = '';
    
    if (insights.length === 0) {
        container.innerHTML = '<div class="text-center text-muted"><small>Add more transactions for personalized insights</small></div>';
        return;
    }
    
    // Show top 2 insights in quick view
    const topInsights = insights.slice(0, 2);
    
    topInsights.forEach(insight => {
        const insightElement = document.createElement('div');
        insightElement.className = `ai-insight ai-${insight.type}`;
        insightElement.innerHTML = `
            <i class="bi ${insight.icon} me-2"></i>
            <small>${insight.message}</small>
        `;
        container.appendChild(insightElement);
    });
}

function showFullAIAnalysis() {
    const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
    const container = document.getElementById('aiInsightsContent');
    
    const insights = AnalyticsEngine.generateInsights(transactions, monthlyBudgets);
    const healthScore = AnalyticsEngine.calculateHealthScore(transactions, monthlyBudgets);
    const savingsRate = AnalyticsEngine.calculateSavingsRate(transactions);
    const prediction = AnalyticsEngine.predictNextMonthSpending(transactions);
    
    let html = `
        <div class="ai-analysis-header">
            <div class="row text-center">
                <div class="col-4">
                    <div class="ai-metric">
                        <div class="ai-metric-value">${healthScore}/100</div>
                        <div class="ai-metric-label">Health Score</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="ai-metric">
                        <div class="ai-metric-value">${(savingsRate * 100).toFixed(1)}%</div>
                        <div class="ai-metric-label">Savings Rate</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="ai-metric">
                        <div class="ai-metric-value">${prediction ? Math.round(prediction.confidence * 100) : '--'}%</div>
                        <div class="ai-metric-label">Prediction Confidence</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="ai-recommendations">
            <h6><i class="bi bi-lightbulb"></i> AI Recommendations</h6>
    `;
    
    if (insights.length === 0) {
        html += `<div class="text-center text-muted p-3">Add more transaction data for personalized recommendations</div>`;
    } else {
        insights.forEach(insight => {
            html += `
                <div class="ai-recommendation ai-${insight.type}">
                    <i class="bi ${insight.icon}"></i>
                    <span>${insight.message}</span>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
    // Add prediction if available
    if (prediction && prediction.confidence > 0.6) {
        html += `
            <div class="ai-prediction mt-3">
                <h6><i class="bi bi-magic"></i> Spending Forecast</h6>
                <div class="prediction-card">
                    <div class="prediction-amount">${prediction.amount.toLocaleString()} ${currency}</div>
                    <div class="prediction-label">Expected next month spending</div>
                    <div class="prediction-note">
                        <small class="text-muted">Based on ${Math.round(prediction.confidence * 100)}% confidence from your spending patterns</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    modal.show();
}

function applyAISuggestions() {
    // This would implement the AI suggestions
    // For now, just show a toast
    showToast('AI suggestions applied to your financial plan', 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('aiInsightsModal'));
    if (modal) {
        modal.hide();
    }
}

// Planner Functions
function loadFutureTransactions() {
    try {
        const data = JSON.parse(localStorage.getItem('futureTransactions'));
        if (data && data.income && data.expenses) {
            return data;
        }
    } catch (error) {
        console.error('Error loading future transactions:', error);
    }
    
    // Return default structure
    return {
        income: [],
        expenses: []
    };
}

function saveFutureTransactions(data) {
    futureTransactions = data;
    localStorage.setItem('futureTransactions', JSON.stringify(data));
    
    // Force immediate sync instead of waiting for auto-sync
    if (googleUser && isOnline) {
        console.log('Future transactions changed, forcing immediate sync...');
        autoSyncToDrive();
    } else {
        console.log('Future transactions saved locally, will sync when online');
    }
}

function renderPlannerProjections() {
    const currentBalance = getCurrentBalance();
    const projections = PlannerEngine.calculateProjections(futureTransactions, plannerTimeframe, currentBalance);
    
    updatePlannerSummary(projections.summary);
    renderPlannerTimeline(projections.months);
    renderFutureIncomeList();
    renderFutureExpensesList();
}

function getCurrentBalance() {
    const monthSel = document.getElementById('summaryMonth');
    const yearSel = document.getElementById('summaryYear');
    
    if (monthSel.value !== "all" && yearSel.value !== "all") {
        const monthKey = `${yearSel.value}-${String(monthSel.value).padStart(2, '0')}`;
        const monthData = monthlyBudgets[monthKey];
        if (monthData) {
            return monthData.endingBalance;
        }
    }
    
    // Calculate from all transactions if no specific month selected
    const totalIncome = transactions.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    return totalIncome - totalExpense;
}

function updatePlannerSummary(summary) {
    document.getElementById('plannerNetWealth').textContent = summary.netWealth.toLocaleString() + ' ' + currency;
    document.getElementById('plannerTotalIncome').textContent = summary.totalIncome.toLocaleString() + ' ' + currency;
    document.getElementById('plannerTotalExpenses').textContent = summary.totalExpenses.toLocaleString() + ' ' + currency;
    document.getElementById('plannerEndingBalance').textContent = summary.endingBalance.toLocaleString() + ' ' + currency;
}

function renderPlannerTimeline(months) {
    const container = document.getElementById('plannerTimeline');
    container.innerHTML = '';
    
    if (months.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">No projection data available</div>';
        return;
    }
    
    months.forEach(month => {
        const monthElement = document.createElement('div');
        monthElement.className = 'planner-month-item clickable';
        monthElement.onclick = () => showMonthDetails(month);
        
        // Add visual indicator for positive/negative months
        const balanceClass = month.balance >= 0 ? 'text-success' : 'text-danger';
        const netClass = month.net >= 0 ? 'text-success' : 'text-danger';
        
        monthElement.innerHTML = `
            <div class="planner-month-header">
                <strong>${month.name}</strong>
                <span class="planner-month-balance ${balanceClass}">
                    ${month.balance.toLocaleString()} ${currency}
                </span>
            </div>
            <div class="planner-month-details">
                <div class="planner-income">
                    <small class="text-success">+${month.income.toLocaleString()} ${currency}</small>
                </div>
                <div class="planner-expense">
                    <small class="text-danger">-${month.expenses.toLocaleString()} ${currency}</small>
                </div>
                <div class="planner-net">
                    <small class="${netClass}">
                        Net: ${month.net >= 0 ? '+' : ''}${month.net.toLocaleString()} ${currency}
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

function renderFutureIncomeList() {
    const container = document.getElementById('futureIncomeList');
    container.innerHTML = '';
    
    if (futureTransactions.income.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">No future income planned</div>';
        return;
    }
    
    futureTransactions.income.forEach((income, index) => {
        const item = document.createElement('div');
        item.className = 'planner-item';
        item.innerHTML = `
            <div class="planner-item-info">
                <div class="fw-bold">${income.description}</div>
                <small class="text-muted">
                    ${income.type} • ${income.frequency} • 
                    ${income.amount.toLocaleString()} ${currency}
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

function renderFutureExpensesList() {
    const container = document.getElementById('futureExpensesList');
    container.innerHTML = '';
    
    if (futureTransactions.expenses.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">No future expenses planned</div>';
        return;
    }
    
    futureTransactions.expenses.forEach((expense, index) => {
        const item = document.createElement('div');
        item.className = 'planner-item';
        item.innerHTML = `
            <div class="planner-item-info">
                <div class="fw-bold">${expense.description}</div>
                <small class="text-muted">
                    ${expense.type} • ${expense.frequency} • 
                    ${expense.amount.toLocaleString()} ${currency}
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

function changePlannerTimeframe(timeframe) {
    plannerTimeframe = timeframe;
    document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    renderPlannerProjections();
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

function saveFutureIncome(event) {
    event.preventDefault();
    
    const form = document.getElementById('futureIncomeForm');
    const index = parseInt(document.getElementById('futureIncomeIndex').value);
    const incomeData = {
        description: document.getElementById('futureIncomeDescription').value,
        type: document.getElementById('futureIncomeType').value,
        amount: parseFloat(document.getElementById('futureIncomeAmount').value),
        frequency: document.getElementById('futureIncomeFrequency').value,
        startDate: document.getElementById('futureIncomeStartDate').value,
        endDate: document.getElementById('futureIncomeEndDate').value || null
    };
    
    if (index >= 0) {
        futureTransactions.income[index] = incomeData;
        showToast('Future income updated successfully', 'success');
    } else {
        futureTransactions.income.push(incomeData);
        showToast('Future income added successfully', 'success');
    }
    
    saveFutureTransactions(futureTransactions);
    renderPlannerProjections();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureIncomeModal'));
    modal.hide();
}

function saveFutureExpense(event) {
    event.preventDefault();
    
    const form = document.getElementById('futureExpenseForm');
    const index = parseInt(document.getElementById('futureExpenseIndex').value);
    const expenseData = {
        description: document.getElementById('futureExpenseDescription').value,
        type: document.getElementById('futureExpenseType').value,
        amount: parseFloat(document.getElementById('futureExpenseAmount').value),
        frequency: document.getElementById('futureExpenseFrequency').value,
        startDate: document.getElementById('futureExpenseStartDate').value,
        endDate: document.getElementById('futureExpenseEndDate').value || null
    };
    
    if (index >= 0) {
        futureTransactions.expenses[index] = expenseData;
        showToast('Future expense updated successfully', 'success');
    } else {
        futureTransactions.expenses.push(expenseData);
        showToast('Future expense added successfully', 'success');
    }
    
    saveFutureTransactions(futureTransactions);
    renderPlannerProjections();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('futureExpenseModal'));
    modal.hide();
}

function editFutureIncome(index) {
    const income = futureTransactions.income[index];
    document.getElementById('futureIncomeModalLabel').textContent = 'Edit Future Income';
    document.getElementById('futureIncomeIndex').value = index;
    document.getElementById('futureIncomeDescription').value = income.description;
    document.getElementById('futureIncomeType').value = income.type;
    document.getElementById('futureIncomeAmount').value = income.amount;
    document.getElementById('futureIncomeFrequency').value = income.frequency;
    document.getElementById('futureIncomeStartDate').value = income.startDate;
    document.getElementById('futureIncomeEndDate').value = income.endDate || '';
    
    const modal = new bootstrap.Modal(document.getElementById('futureIncomeModal'));
    modal.show();
}

function editFutureExpense(index) {
    const expense = futureTransactions.expenses[index];
    document.getElementById('futureExpenseModalLabel').textContent = 'Edit Future Expense';
    document.getElementById('futureExpenseIndex').value = index;
    document.getElementById('futureExpenseDescription').value = expense.description;
    document.getElementById('futureExpenseType').value = expense.type;
    document.getElementById('futureExpenseAmount').value = expense.amount;
    document.getElementById('futureExpenseFrequency').value = expense.frequency;
    document.getElementById('futureExpenseStartDate').value = expense.startDate;
    document.getElementById('futureExpenseEndDate').value = expense.endDate || '';
    
    const modal = new bootstrap.Modal(document.getElementById('futureExpenseModal'));
    modal.show();
}

function removeFutureIncome(index) {
    if (confirm('Are you sure you want to remove this future income?')) {
        futureTransactions.income.splice(index, 1);
        saveFutureTransactions(futureTransactions);
        renderPlannerProjections();
        showToast('Future income removed', 'success');
    }
}

function removeFutureExpense(index) {
    if (confirm('Are you sure you want to remove this future expense?')) {
        futureTransactions.expenses.splice(index, 1);
        saveFutureTransactions(futureTransactions);
        renderPlannerProjections();
        showToast('Future expense removed', 'success');
    }
}

// Debt Management Functions
function loadLoans() {
    try {
        const data = JSON.parse(localStorage.getItem('loans'));
        if (data && data.given && data.taken) {
            // Update loan statuses
            data.given.forEach(loan => loan.status = DebtEngine.getLoanStatus(loan));
            data.taken.forEach(loan => loan.status = DebtEngine.getLoanStatus(loan));
            return data;
        }
    } catch (error) {
        console.error('Error loading loans:', error);
    }
    
    // Return default structure
    return {
        given: [],
        taken: []
    };
}

// Monthly Details Functions
function showMonthDetails(monthData) {
    const modal = new bootstrap.Modal(document.getElementById('monthDetailsModal'));
    
    // Update modal title
    document.getElementById('monthDetailsModalLabel').innerHTML = 
        `<i class="bi bi-calendar-month"></i> ${monthData.name} Details`;
    
    // Update summary
    document.getElementById('monthDetailsIncome').textContent = 
        monthData.income.toLocaleString() + ' ' + currency;
    document.getElementById('monthDetailsExpenses').textContent = 
        monthData.expenses.toLocaleString() + ' ' + currency;
    document.getElementById('monthDetailsBalance').textContent = 
        monthData.balance.toLocaleString() + ' ' + currency;
    
    // Calculate and display income breakdown
    const incomeBreakdown = calculateMonthBreakdown(monthData, 'income');
    renderMonthBreakdown('monthDetailsIncomeList', incomeBreakdown, 'income');
    
    // Calculate and display expense breakdown
    const expenseBreakdown = calculateMonthBreakdown(monthData, 'expenses');
    renderMonthBreakdown('monthDetailsExpensesList', expenseBreakdown, 'expenses');
    
    // Show transaction calculations
    renderTransactionCalculations(monthData);
    
    modal.show();
}

function formatCategoryName(category) {
    const nameMap = {
        // Income categories
        'paycheck': 'Salary',
        'loan': 'Loan',
        'sale': 'Asset Sale',
        'committee': 'Committee',
        
        // Expense categories
        'grocery': 'Grocery',
        'bike_fuel': 'Bike & Fuel',
        'expenses': 'General Expenses',
        'loan_returned': 'Loan Repayment',
        'committee': 'Committee'
    };
    
    return nameMap[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function calculateMonthBreakdown(monthData, type) {
    const breakdown = {};
    const transactions = type === 'income' ? futureTransactions.income : futureTransactions.expenses;
    
    transactions.forEach(transaction => {
        if (shouldIncludeTransactionInMonth(transaction, monthData.month)) {
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

function shouldIncludeTransactionInMonth(transaction, targetMonth) {
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

function renderMonthBreakdown(containerId, breakdown, type) {
    const container = document.getElementById(containerId);
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
        
        const categoryName = getCategoryDisplayName(category, type);
        
        item.innerHTML = `
            <div>
                <div class="fw-bold">${categoryName}</div>
                <small class="text-muted">${data.transactions.length} transaction(s)</small>
            </div>
            <div class="fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}">
                ${data.amount.toLocaleString()} ${currency}
            </div>
        `;
        
        container.appendChild(item);
    });
}

function getCategoryDisplayName(categoryKey, type) {
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

function renderTransactionCalculations(monthData) {
    const container = document.getElementById('monthDetailsTransactions');
    container.innerHTML = '';
    
    // Show calculation breakdown
    const calculationHTML = `
        <div class="alert alert-info">
            <h6><i class="bi bi-calculator"></i> Balance Calculation</h6>
            <div class="small">
                <div class="d-flex justify-content-between">
                    <span>Starting Balance:</span>
                    <span>${(monthData.balance - monthData.net).toLocaleString()} ${currency}</span>
                </div>
                <div class="d-flex justify-content-between text-success">
                    <span>+ Total Income:</span>
                    <span>+${monthData.income.toLocaleString()} ${currency}</span>
                </div>
                <div class="d-flex justify-content-between text-danger">
                    <span>- Total Expenses:</span>
                    <span>-${monthData.expenses.toLocaleString()} ${currency}</span>
                </div>
                <hr class="my-1">
                <div class="d-flex justify-content-between fw-bold">
                    <span>Ending Balance:</span>
                    <span class="${monthData.balance >= 0 ? 'text-success' : 'text-danger'}">
                        ${monthData.balance.toLocaleString()} ${currency}
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
                        ${monthData.net >= 0 ? '+' : ''}${monthData.net.toLocaleString()} ${currency}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = calculationHTML;
}

function saveLoans(data) {
    loans = data;
    localStorage.setItem('loans', JSON.stringify(data));
    
    // Force immediate sync instead of waiting for auto-sync
    if (googleUser && isOnline) {
        console.log('Loans changed, forcing immediate sync...');
        autoSyncToDrive();
    } else {
        console.log('Loans saved locally, will sync when online');
    }
}

function renderDebtManagement() {
    const summary = DebtEngine.calculateDebtSummary(loans);
    updateDebtSummary(summary);
    renderLoansGivenList();
    renderLoansTakenList();
    renderUpcomingRepayments(summary.upcomingRepayments);
}

function updateDebtSummary(summary) {
    document.getElementById('totalLoansGiven').textContent = summary.totalGiven.toLocaleString() + ' ' + currency;
    document.getElementById('totalLoansTaken').textContent = summary.totalTaken.toLocaleString() + ' ' + currency;
    
    const netPositionElement = document.getElementById('netDebtPosition');
    netPositionElement.textContent = summary.netPosition.toLocaleString() + ' ' + currency;
    
    // Remove existing classes
    netPositionElement.classList.remove('text-success', 'text-danger');
    
    // Add appropriate color class
    if (summary.netPosition >= 0) {
        netPositionElement.classList.add('text-success');
    } else {
        netPositionElement.classList.add('text-danger');
    }
}

function renderLoansGivenList() {
    const container = document.getElementById('loansGivenList');
    container.innerHTML = '';
    
    if (loans.given.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">No loans given</div>';
        return;
    }
    
    loans.given.forEach((loan, index) => {
        const paid = DebtEngine.getPaidAmount(loan);
        const remaining = loan.amount - paid;
        const status = DebtEngine.getLoanStatus(loan);
        
        const item = document.createElement('div');
        item.className = `debt-item debt-status-${status}`;
        item.innerHTML = `
            <div class="debt-item-info">
                <div class="fw-bold">${loan.borrower}</div>
                <small class="text-muted">
                    ${loan.amount.toLocaleString()} ${currency} • 
                    Given: ${loan.dateGiven} • 
                    Expected: ${loan.expectedReturn}
                </small>
                <div class="debt-progress">
                    <div class="progress" style="height: 5px;">
                        <div class="progress-bar" style="width: ${(paid / loan.amount) * 100}%"></div>
                    </div>
                    <small class="text-muted">
                        Paid: ${paid.toLocaleString()} ${currency} • 
                        Remaining: ${remaining.toLocaleString()} ${currency}
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

function renderLoansTakenList() {
    const container = document.getElementById('loansTakenList');
    container.innerHTML = '';
    
    if (loans.taken.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">No loans taken</div>';
        return;
    }
    
    loans.taken.forEach((loan, index) => {
        const paid = DebtEngine.getPaidAmount(loan);
        const remaining = loan.amount - paid;
        const status = DebtEngine.getLoanStatus(loan);
        
        const item = document.createElement('div');
        item.className = `debt-item debt-status-${status}`;
        item.innerHTML = `
            <div class="debt-item-info">
                <div class="fw-bold">${loan.lender}</div>
                <small class="text-muted">
                    ${loan.amount.toLocaleString()} ${currency} • 
                    Taken: ${loan.dateTaken} • 
                    Due: ${loan.dueDate}
                </small>
                <div class="debt-progress">
                    <div class="progress" style="height: 5px;">
                        <div class="progress-bar" style="width: ${(paid / loan.amount) * 100}%"></div>
                    </div>
                    <small class="text-muted">
                        Paid: ${paid.toLocaleString()} ${currency} • 
                        Remaining: ${remaining.toLocaleString()} ${currency}
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

function renderUpcomingRepayments(repayments) {
    const container = document.getElementById('upcomingRepayments');
    container.innerHTML = '';
    
    if (repayments.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">No upcoming repayments</div>';
        return;
    }
    
    repayments.forEach(loan => {
        const isGiven = loans.given.includes(loan);
        const paid = DebtEngine.getPaidAmount(loan);
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
                    ${remaining.toLocaleString()} ${currency} • 
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

function openAddLoan(type) {
    document.getElementById('loanModalLabel').textContent = `Add Loan ${type === 'given' ? 'Given' : 'Taken'}`;
    document.getElementById('loanForm').reset();
    document.getElementById('loanIndex').value = '-1';
    document.getElementById('loanType').value = type;
    
    const today = new Date().toISOString().split('T')[0];
    if (type === 'given') {
        document.getElementById('loanBorrowerLabel').style.display = 'block';
        document.getElementById('loanBorrower').style.display = 'block';
        document.getElementById('loanLenderLabel').style.display = 'none';
        document.getElementById('loanLender').style.display = 'none';
        document.getElementById('loanExpectedReturnLabel').style.display = 'block';
        document.getElementById('loanExpectedReturn').style.display = 'block';
        document.getElementById('loanDueDateLabel').style.display = 'none';
        document.getElementById('loanDueDate').style.display = 'none';
        document.getElementById('loanDateGivenLabel').style.display = 'block';
        document.getElementById('loanDateGiven').style.display = 'block';
        document.getElementById('loanDateTakenLabel').style.display = 'none';
        document.getElementById('loanDateTaken').style.display = 'none';
    } else {
        document.getElementById('loanBorrowerLabel').style.display = 'none';
        document.getElementById('loanBorrower').style.display = 'none';
        document.getElementById('loanLenderLabel').style.display = 'block';
        document.getElementById('loanLender').style.display = 'block';
        document.getElementById('loanExpectedReturnLabel').style.display = 'none';
        document.getElementById('loanExpectedReturn').style.display = 'none';
        document.getElementById('loanDueDateLabel').style.display = 'block';
        document.getElementById('loanDueDate').style.display = 'block';
        document.getElementById('loanDateGivenLabel').style.display = 'none';
        document.getElementById('loanDateGiven').style.display = 'none';
        document.getElementById('loanDateTakenLabel').style.display = 'block';
        document.getElementById('loanDateTaken').style.display = 'block';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

function saveLoan(event) {
    event.preventDefault();
    
    const form = document.getElementById('loanForm');
    const index = parseInt(document.getElementById('loanIndex').value);
    const type = document.getElementById('loanType').value;
    
    const loanData = {
        amount: parseFloat(document.getElementById('loanAmount').value),
        description: document.getElementById('loanDescription').value,
        status: 'pending'
    };
    
    if (type === 'given') {
        loanData.borrower = document.getElementById('loanBorrower').value;
        loanData.dateGiven = document.getElementById('loanDateGiven').value;
        loanData.expectedReturn = document.getElementById('loanExpectedReturn').value;
        loanData.payments = [];
        
        if (index >= 0) {
            loans.given[index] = { ...loans.given[index], ...loanData };
        } else {
            loans.given.push(loanData);
        }
    } else {
        loanData.lender = document.getElementById('loanLender').value;
        loanData.dateTaken = document.getElementById('loanDateTaken').value;
        loanData.dueDate = document.getElementById('loanDueDate').value;
        loanData.payments = [];
        
        if (index >= 0) {
            loans.taken[index] = { ...loans.taken[index], ...loanData };
        } else {
            loans.taken.push(loanData);
        }
    }
    
    saveLoans(loans);
    renderDebtManagement();
    showToast(`Loan ${type === 'given' ? 'given' : 'taken'} saved successfully`, 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('loanModal'));
    modal.hide();
}

function editLoan(type, index) {
    const loan = type === 'given' ? loans.given[index] : loans.taken[index];
    
    document.getElementById('loanModalLabel').textContent = `Edit Loan ${type === 'given' ? 'Given' : 'Taken'}`;
    document.getElementById('loanIndex').value = index;
    document.getElementById('loanType').value = type;
    document.getElementById('loanAmount').value = loan.amount;
    document.getElementById('loanDescription').value = loan.description || '';
    
    if (type === 'given') {
        document.getElementById('loanBorrowerLabel').style.display = 'block';
        document.getElementById('loanBorrower').style.display = 'block';
        document.getElementById('loanLenderLabel').style.display = 'none';
        document.getElementById('loanLender').style.display = 'none';
        document.getElementById('loanExpectedReturnLabel').style.display = 'block';
        document.getElementById('loanExpectedReturn').style.display = 'block';
        document.getElementById('loanDueDateLabel').style.display = 'none';
        document.getElementById('loanDueDate').style.display = 'none';
        document.getElementById('loanDateGivenLabel').style.display = 'block';
        document.getElementById('loanDateGiven').style.display = 'block';
        document.getElementById('loanDateTakenLabel').style.display = 'none';
        document.getElementById('loanDateTaken').style.display = 'none';
        
        document.getElementById('loanBorrower').value = loan.borrower;
        document.getElementById('loanDateGiven').value = loan.dateGiven;
        document.getElementById('loanExpectedReturn').value = loan.expectedReturn;
    } else {
        document.getElementById('loanBorrowerLabel').style.display = 'none';
        document.getElementById('loanBorrower').style.display = 'none';
        document.getElementById('loanLenderLabel').style.display = 'block';
        document.getElementById('loanLender').style.display = 'block';
        document.getElementById('loanExpectedReturnLabel').style.display = 'none';
        document.getElementById('loanExpectedReturn').style.display = 'none';
        document.getElementById('loanDueDateLabel').style.display = 'block';
        document.getElementById('loanDueDate').style.display = 'block';
        document.getElementById('loanDateGivenLabel').style.display = 'none';
        document.getElementById('loanDateGiven').style.display = 'none';
        document.getElementById('loanDateTakenLabel').style.display = 'block';
        document.getElementById('loanDateTaken').style.display = 'block';
        
        document.getElementById('loanLender').value = loan.lender;
        document.getElementById('loanDateTaken').value = loan.dateTaken;
        document.getElementById('loanDueDate').value = loan.dueDate;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('loanModal'));
    modal.show();
}

function removeLoan(type, index) {
    const loan = type === 'given' ? loans.given[index] : loans.taken[index];
    const name = type === 'given' ? loan.borrower : loan.lender;
    
    if (confirm(`Are you sure you want to remove the loan for ${name}?`)) {
        if (type === 'given') {
            loans.given.splice(index, 1);
        } else {
            loans.taken.splice(index, 1);
        }
        saveLoans(loans);
        renderDebtManagement();
        showToast('Loan removed', 'success');
    }
}

function addLoanPayment(type, index) {
    const loan = type === 'given' ? loans.given[index] : loans.taken[index];
    const name = type === 'given' ? loan.borrower : loan.lender;
    const paid = DebtEngine.getPaidAmount(loan);
    const remaining = loan.amount - paid;
    
    const amount = prompt(`Enter payment amount for ${name} (Remaining: ${remaining.toLocaleString()} ${currency}):`, remaining);
    
    if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
        if (parseFloat(amount) > remaining) {
            showToast('Payment amount cannot exceed remaining balance', 'warning');
            return;
        }
        
        DebtEngine.addPayment(loan, parseFloat(amount));
        saveLoans(loans);
        renderDebtManagement();
        showToast('Payment recorded successfully', 'success');
    }
}

// Add event listeners for analytics
document.addEventListener('DOMContentLoaded', function() {
    // Overview chart type change
    const overviewChartType = document.getElementById('overviewChartType');
    if (overviewChartType) {
        overviewChartType.addEventListener('change', renderOverviewChart);
    }
    
    // Comparison filters change
    const comparisonType = document.getElementById('comparisonType');
    const comparisonPeriod1 = document.getElementById('comparisonPeriod1');
    const comparisonPeriod2 = document.getElementById('comparisonPeriod2');
    
    if (comparisonType) {
        comparisonType.addEventListener('change', function() {
            setTimeout(() => {
                renderComparisonChart();
                renderChangeAnalysis();
            }, 100);
        });
    }
    
    if (comparisonPeriod1 && comparisonPeriod2) {
        comparisonPeriod1.addEventListener('change', function() {
            renderComparisonChart();
            renderChangeAnalysis();
        });
        
        comparisonPeriod2.addEventListener('change', function() {
            renderComparisonChart();
            renderChangeAnalysis();
        });
    }
    
    // Analytics tab navigation
    const analyticsTabs = document.querySelectorAll('#analyticsTabs button');
    analyticsTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function() {
            const target = this.getAttribute('data-bs-target');
            if (target === '#trends') {
                renderTrendsTab();
            } else if (target === '#comparison') {
                renderComparisonTab();
            }
        });
    });
    
    // Planner form submissions
    document.getElementById('futureIncomeForm').addEventListener('submit', saveFutureIncome);
    document.getElementById('futureExpenseForm').addEventListener('submit', saveFutureExpense);
    document.getElementById('loanForm').addEventListener('submit', saveLoan);
    
    // Planner timeframe buttons
    document.querySelectorAll('.planner-timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            changePlannerTimeframe(this.dataset.timeframe);
        });
    });
});

// Import/Export
document.getElementById('exportBtn').onclick = function() {
    const data = {
        transactions,
        categories,
        currency,
        monthlyBudgets,
        futureTransactions,
        loans
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}));
    const a = document.createElement("a");
    a.href = url;
    a.download = "wealth-command-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Data exported successfully', 'success');
};

document.getElementById('importBtn').onclick = function() {
    document.getElementById('importFile').click();
};

document.getElementById('importFile').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data.transactions)) transactions = data.transactions;
            if (Array.isArray(data.categories)) categories = data.categories;
            if (typeof data.currency === "string") currency = data.currency;
            if (data.monthlyBudgets) monthlyBudgets = data.monthlyBudgets;
            if (data.futureTransactions) futureTransactions = data.futureTransactions;
            if (data.loans) loans = data.loans;
            
            saveTransactions(transactions);
            saveCategories(categories);
            saveCurrency(currency);
            saveMonthlyBudgets(monthlyBudgets);
            saveFutureTransactions(futureTransactions);
            saveLoans(loans);
            
            renderCategoryList();
            populateSummaryFilters();
            updateUI();
            renderPlannerProjections();
            renderDebtManagement();
            showToast("Import successful!", "success");
        } catch {
            showToast("Import failed: Invalid file.", "danger");
        }
    };
    reader.readAsText(file);
};

// LocalStorage handlers with auto-sync
function loadTransactions() {
    try {
        const data = JSON.parse(localStorage.getItem('transactions'));
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveTransactions(arr) {
    transactions = arr;
    localStorage.setItem('transactions', JSON.stringify(arr));
    calculateMonthlyRollover();
    autoSyncToDrive();
}

function loadCategories() {
    try {
        const data = JSON.parse(localStorage.getItem('categories'));
        if (Array.isArray(data) && data.length > 0) {
            return data;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
    
    // Return default categories if none exist
    return [
        { name: "Salary", type: "income" },
        { name: "Food", type: "expense" },
        { name: "Shopping", type: "expense" },
        { name: "Utilities", type: "expense" }
    ];
}

function saveCategories(arr) {
    categories = arr;
    localStorage.setItem('categories', JSON.stringify(arr));
    autoSyncToDrive();
}

function loadCurrency() {
    return localStorage.getItem("currency") || "PKR";
}

function loadMonthlyBudgets() {
    try {
        const budgets = JSON.parse(localStorage.getItem('monthlyBudgets')) || {};
        return ensureAllMonthsHaveBudgets(budgets);
    } catch {
        const budgets = {};
        return ensureAllMonthsHaveBudgets(budgets);
    }
}

function loadFutureTransactions() {
    try {
        const data = JSON.parse(localStorage.getItem('futureTransactions'));
        if (data && data.income && data.expenses) {
            return data;
        }
    } catch (error) {
        console.error('Error loading future transactions:', error);
    }
    
    return {
        income: [],
        expenses: []
    };
}

function loadLoans() {
    try {
        const data = JSON.parse(localStorage.getItem('loans'));
        if (data && data.given && data.taken) {
            // Update loan statuses
            data.given.forEach(loan => loan.status = DebtEngine.getLoanStatus(loan));
            data.taken.forEach(loan => loan.status = DebtEngine.getLoanStatus(loan));
            return data;
        }
    } catch (error) {
        console.error('Error loading loans:', error);
    }
    
    return {
        given: [],
        taken: []
    };
}

function saveCurrency(val) {
    currency = val;
    localStorage.setItem("currency", val);
    autoSyncToDrive();
}

// Overview chart type change
const overviewChartType = document.getElementById('overviewChartType');
if (overviewChartType) {
    overviewChartType.addEventListener('change', renderOverviewChart);
}

// Enhanced Dark Mode Toggle
document.getElementById('darkModeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.checked = document.body.classList.contains('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Initialize dark mode from system preference or saved setting
(function () {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
        }
    }
})();

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/Wealth-Command/service-worker.js')
            .then(registration => {
                console.log('SW registered successfully: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Final Initialization
document.addEventListener('DOMContentLoaded', function() {
    function initializeApplicationData() {
        if (categories.length === 0) {
            categories = loadCategories();
            saveCategories(categories);
        }
        
        if (transactions.length === 0) {
            transactions = loadTransactions();
        }
        
        currency = loadCurrency() || "PKR";
        monthlyBudgets = loadMonthlyBudgets();
        futureTransactions = loadFutureTransactions();
        loans = loadLoans();
        
        calculateMonthlyRollover();
        
        updateUI();
        populateSummaryFilters();
        renderCategoryList();
        renderPlannerProjections();
        renderDebtManagement();
        
        const autoRolloverToggle = document.getElementById('autoRolloverToggle');
        const allowNegativeToggle = document.getElementById('allowNegativeRollover');
        
        if (autoRolloverToggle) {
            const currentMonth = getCurrentMonthKey();
            autoRolloverToggle.checked = monthlyBudgets[currentMonth]?.autoRollover !== false;
            autoRolloverToggle.addEventListener('change', function() {
                Object.keys(monthlyBudgets).forEach(month => {
                    monthlyBudgets[month].autoRollover = this.checked;
                });
                saveMonthlyBudgets(monthlyBudgets);
                calculateMonthlyRollover();
                updateUI();
            });
        }
        
        if (allowNegativeToggle) {
            const currentMonth = getCurrentMonthKey();
            allowNegativeToggle.checked = monthlyBudgets[currentMonth]?.allowNegative === true;
            allowNegativeToggle.addEventListener('change', function() {
                Object.keys(monthlyBudgets).forEach(month => {
                    monthlyBudgets[month].allowNegative = this.checked;
                });
                saveMonthlyBudgets(monthlyBudgets);
                calculateMonthlyRollover();
                updateUI();
            });
        }
    }

    initializeApplicationData();
    
    // Initialize tab state
    initTabState();
    
    // Enhanced saved user validation
// Enhanced initialization - Offline First approach
const savedUser = localStorage.getItem('googleUser');
if (savedUser) {
    try {
        googleUser = JSON.parse(savedUser);
        const tokenAge = Date.now() - googleUser.acquired_at;
        const tokenLifetime = googleUser.expires_in * 1000;
        
        // Check if token is expired (with 2 minute buffer)
        if (tokenAge > (tokenLifetime - (2 * 60 * 1000))) {
            console.log('Token expired, working offline');
            localStorage.removeItem('googleUser');
            googleUser = null;
            showSyncStatus('warning', 'Working offline - Sign in to sync');
            initializeApplicationData(); // Load from local storage
        } else {
            showSyncStatus('success', 'Google Drive connected');
            // Calculate remaining time and set up auto-refresh
            const remainingTime = tokenLifetime - tokenAge - (1 * 60 * 1000); // Refresh 1 min before expiry
            if (remainingTime > 0) {
                setTimeout(() => {
                    if (googleUser && isOnline) {
                        console.log('Auto-refreshing Google token');
                        showGoogleSignIn();
                    }
                }, remainingTime);
            }
            
            // Try to load from Drive, but fall back to local storage
            loadDataFromDrive().then(success => {
                if (!success) {
                    console.log('Failed to load from Drive, using local data');
                    initializeApplicationData();
                }
            }).catch(error => {
                console.log('Error loading from Drive, using local data', error);
                initializeApplicationData();
            });
        }
    } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('googleUser');
        googleUser = null;
        showSyncStatus('warning', 'Working offline');
        initializeApplicationData(); // Load from local storage
    }
} else {
    // No Google auth - work offline with local storage
    showSyncStatus('offline', 'Working offline - Sign in to sync');
    initializeApplicationData(); // Load from local storage
}

// Enhanced Google API initialization that waits for the library
function initializeGoogleAPI() {
    if (window.google && google.accounts && google.accounts.oauth2) {
        initGoogleAuth();
        updateProfileUI();
    } else {
        // Google API not loaded yet, try again
        console.log('Google API not loaded yet, retrying...');
        setTimeout(initializeGoogleAPI, 500);
    }
}

// Start the initialization
setTimeout(initializeGoogleAPI, 100);

setTimeout(() => {
    const manualSyncBtn = document.getElementById('manualSyncSettings');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', manualSync);
    }
}, 200);

// Auto-refresh token before expiry
function setupTokenAutoRefresh() {
    if (googleUser && googleUser.expires_in) {
        const refreshTime = (googleUser.expires_in - 300) * 1000; // Refresh 5 minutes before expiry
        if (refreshTime > 0) {
            setTimeout(() => {
                if (googleUser && isOnline) {
                    console.log('Refreshing Google token before expiry');
                    showGoogleSignIn();
                }
            }, refreshTime);
        }
    }
}
    
    // Start periodic sync
    startPeriodicSync();
    
    console.log('Wealth Command initialized successfully');
});
