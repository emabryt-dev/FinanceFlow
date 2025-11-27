// Stores the application state at runtime
export const state = {
    transactions: [],
    categories: [],
    monthlyBudgets: {},
    futureTransactions: {
        income: [],
        expenses: []
    },
    loans: {
        given: [],
        taken: []
    },
    currency: "PKR",
    user: null, // Google User
    isOnline: navigator.onLine,
    
    // UI State
    currentCategoryFilter: 'all',
    plannerTimeframe: '1year',
    
    // Default categories if none exist
    defaultCategories: [
        { name: "Salary", type: "income" },
        { name: "Food", type: "expense" },
        { name: "Shopping", type: "expense" },
        { name: "Utilities", type: "expense" }
    ]
};
