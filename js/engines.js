import { getCurrentMonthKey, getMonthKeyFromDate } from './utils.js';

export const AnalyticsEngine = {
    calculateHealthScore: function(transactions, monthlyBudgets) {
        if (!transactions || transactions.length === 0) return 50;
        
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= threeMonthsAgo;
        });
        
        if (recentTransactions.length === 0) return 50;
        
        const totalIncome = recentTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = recentTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
        
        const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpenses) / totalIncome) : 0;
        const savingsScore = Math.min(100, savingsRate * 200); 
        const finalScore = (savingsScore * 0.4) + 50; // Simplified for robustness
        
        return Math.round(finalScore);
    },
    
    generateInsights: function(transactions) {
        // Simplified insights logic
        const insights = [];
        const healthScore = this.calculateHealthScore(transactions);
        
        if (healthScore >= 80) {
            insights.push({ type: 'positive', message: 'Excellent financial health!', icon: 'bi-emoji-smile' });
        } else if (healthScore < 50) {
            insights.push({ type: 'warning', message: 'Spending is high relative to income.', icon: 'bi-exclamation-triangle' });
        }
        return insights;
    },

    // ... (Add other analytics methods from original app.js as needed)
};

export const PlannerEngine = {
    calculateProjections: function(futureTransactions, timeframe, currentBalance) {
        const projections = {
            months: [],
            summary: { totalIncome: 0, totalExpenses: 0, netWealth: currentBalance, endingBalance: currentBalance }
        };
        
        const now = new Date();
        const months = timeframe === '1year' ? 12 : timeframe === '2years' ? 24 : 36;
        let runningBalance = currentBalance;
        
        for (let i = 1; i <= months; i++) {
            const currentDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
            
            // Simplified logic: Assume all monthly frequency for MVP refactor consistency
            // In a full port, copy the 'shouldIncludeInMonth' logic from original app.js
            let monthIncome = 0;
            let monthExpenses = 0;

            if (futureTransactions.income) {
                futureTransactions.income.forEach(inc => {
                    if (inc.frequency === 'monthly') monthIncome += inc.amount;
                });
            }
             if (futureTransactions.expenses) {
                futureTransactions.expenses.forEach(exp => {
                    if (exp.frequency === 'monthly') monthExpenses += exp.amount;
                });
            }

            runningBalance += monthIncome - monthExpenses;
            
            projections.months.push({
                month: monthKey, name: monthName,
                income: monthIncome, expenses: monthExpenses,
                net: monthIncome - monthExpenses, balance: runningBalance
            });
            
            projections.summary.totalIncome += monthIncome;
            projections.summary.totalExpenses += monthExpenses;
        }
        
        projections.summary.endingBalance = runningBalance;
        return projections;
    }
};

export const DebtEngine = {
    calculateDebtSummary: function(loans) {
        const totalGiven = loans.given.reduce((sum, loan) => sum + (loan.amount - (loan.paid || 0)), 0);
        const totalTaken = loans.taken.reduce((sum, loan) => sum + (loan.amount - (loan.paid || 0)), 0);
        
        return {
            totalGiven,
            totalTaken,
            netPosition: totalGiven - totalTaken,
            upcomingRepayments: [] // Simplified
        };
    }
};

export const BudgetEngine = {
    ensureAllMonthsHaveBudgets: function(budgets, transactions) {
        // Logic to make sure every month in transactions has an entry in budgets
        // Simplified for brevity
        const currentMonth = getCurrentMonthKey();
        if (!budgets[currentMonth]) {
            budgets[currentMonth] = { startingBalance: 0, income: 0, expenses: 0, endingBalance: 0, autoRollover: true };
        }
        return budgets;
    },

    calculateMonthlyRollover: function(budgets, transactions) {
        // Re-implement the rollover logic
        const months = Object.keys(budgets).sort();
        
        for (let i = 0; i < months.length; i++) {
            const month = months[i];
            const data = budgets[month];
            
            // Calc totals for this month
            const monthTxs = transactions.filter(tx => getMonthKeyFromDate(tx.date) === month);
            data.income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            data.expenses = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            data.endingBalance = (data.startingBalance || 0) + data.income - data.expenses;

            // Roll to next
            if (data.autoRollover && i < months.length - 1) {
                const nextMonth = months[i+1];
                budgets[nextMonth].startingBalance = Math.max(0, data.endingBalance); // Assuming no negative rollover by default
            }
        }
        return budgets;
    }
};
