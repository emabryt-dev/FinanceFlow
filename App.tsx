import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Transaction, Category, Loan, LoanType, FutureTransaction, AIAnalysis, TransactionType, MonthlyBudget, PlannerItemType, PlannerFrequency, SalaryCalculationDetails, LoanPayment } from './types';
import { generateAIAnalysis, suggestCategory } from './services/geminiService';
import * as GoogleDriveService from './services/googleDriveService';

// Add declaration for gapi to resolve TypeScript errors.
declare const gapi: any;

// To keep file count low, sub-components are defined within App.tsx
// In a larger app, these would be in separate files under components/

// --- UI Components ---
const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <i className={`bi bi-${name} ${className}`}></i>
);

const Card = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string; [key: string]: any; }) => (
  <div {...props} className={`bg-white/60 dark:bg-dark-card/80 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-2xl shadow-lg transition-all duration-300 ${className}`}>
    {children}
  </div>
);

// --- Restored and robust max-height animation component ---
const AnimatedHeightContainer = ({ children }: { children?: React.ReactNode }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    const hasContent = useMemo(() => React.Children.count(children) > 0, [children]);

    useLayoutEffect(() => {
        if (hasContent && contentRef.current) {
            setHeight(contentRef.current.scrollHeight);
        } else {
            setHeight(0);
        }
    }, [children, hasContent]);

    return (
        <div
            style={{ maxHeight: `${height}px` }}
            className="transition-[max-height] duration-500 ease-in-out overflow-hidden"
        >
            <div ref={contentRef}>
                {children}
            </div>
        </div>
    );
};


// --- Hooks & Animation Components ---

// New useAnimatedCounter hook that updates DOM directly to prevent re-renders.
const useAnimatedCounter = (
    ref: React.RefObject<HTMLElement>, 
    targetValue: number, 
    options: { duration?: number; currency?: string; formatting?: Intl.NumberFormatOptions } = {}
) => {
    const { duration = 500, currency = '', formatting = { maximumFractionDigits: 0 } } = options;
    const valueRef = useRef(0); // Tracks the "in-flight" animation value

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const startValue = valueRef.current;
        const diff = targetValue - startValue;
        
        let startTime: number | null = null;
        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const nextValue = startValue + diff * progress;
            
            valueRef.current = nextValue;
            
            const currencySuffix = currency ? ` <span class="text-xs font-normal">${currency}</span>` : '';
            element.innerHTML = `${nextValue.toLocaleString(undefined, formatting)}${currencySuffix}`;

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                valueRef.current = targetValue;
                 // Final precise render
                element.innerHTML = `${targetValue.toLocaleString(undefined, formatting)}${currencySuffix}`;
            }
        };
        
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
            valueRef.current = targetValue;
        };

    }, [targetValue, duration, currency, formatting, ref]);
};

// New AnimatedStat component that uses the render-silent hook.
const AnimatedStat = ({ value, label, currency, className = '' }: { value: number; label:string; currency: string; className?: string; }) => {
    const pRef = useRef<HTMLParagraphElement>(null);
    useAnimatedCounter(pRef, value, { currency, formatting: { maximumFractionDigits: 0 } });

    return (
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p ref={pRef} className={`text-lg font-bold ${className}`}>
                {/* Initial value is set here, hook takes over after mount */}
                {value.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs">{currency}</span>
            </p>
        </div>
    );
};

// New AnimatedAmount component that uses the render-silent hook.
const AnimatedAmount = ({ value, currency, className = '' }: { value: number; currency: string; className?: string; }) => {
    const spanRef = useRef<HTMLSpanElement>(null);
    useAnimatedCounter(spanRef, value, { currency, formatting: { maximumFractionDigits: 0 } });

    return (
        <span ref={spanRef} className={`font-semibold ${className}`}>
            {/* Initial value is set here, hook takes over after mount */}
            {value.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal">{currency}</span>
        </span>
    );
};


// --- App Component ---
export default function App() {
  // --- Sorting Logic ---
  const transactionSortFn = (a: Transaction, b: Transaction) => {
    const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison !== 0) {
      return dateComparison;
    }
    // For same-day transactions, newest (largest ID) comes first.
    return Number(b.id) - Number(a.id);
  };

  // --- State Management ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    JSON.parse(localStorage.getItem('transactions') || '[]').sort(transactionSortFn)
  );
  const [categories, setCategories] = useState<Category[]>(() => JSON.parse(localStorage.getItem('categories') || '[{"id":"1","name":"Salary","type":"income"},{"id":"2","name":"Food","type":"expense"},{"id":"3","name":"Transport","type":"expense"},{"id":"4","name":"Shopping","type":"expense"}]'));
  const [loans, setLoans] = useState<Loan[]>(() => JSON.parse(localStorage.getItem('loans') || '[]'));
  const [futureTransactions, setFutureTransactions] = useState<FutureTransaction[]>(() => JSON.parse(localStorage.getItem('futureTransactions') || '[]'));
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'PKR');
  
  // --- Tab Navigation State ---
  const [activeTab, _setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [tabAnimationDirection, setTabAnimationDirection] = useState<'right' | 'left' | 'none'>('none');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- Modal State (Lifted) ---
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isFutureTransactionModalOpen, setIsFutureTransactionModalOpen] = useState(false);
  const [editingFutureTransaction, setEditingFutureTransaction] = useState<FutureTransaction | null>(null);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isSelectMonthModalOpen, setIsSelectMonthModalOpen] = useState(false);
  const [isCalculationDetailModalOpen, setIsCalculationDetailModalOpen] = useState(false);
  const [viewingCalculation, setViewingCalculation] = useState<FutureTransaction | null>(null);
  const [salaryToAdd, setSalaryToAdd] = useState<{ result: any; inputs: SalaryCalculationDetails } | null>(null);
  const [editingSalaryCalculation, setEditingSalaryCalculation] = useState<SalaryCalculationDetails | null>(null);

  // --- Planner State ---
  const [activePlannerTab, setActivePlannerTab] = useState('planner');
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const [plannerDateFilter, setPlannerDateFilter] = useState({ month: nextMonthDate.getMonth() + 1, year: nextMonthDate.getFullYear() });

  // --- AI Analysis State (Lifted) ---
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // --- Google Drive State ---
  const [gapiReady, setGapiReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveSuccess, setDriveSuccess] = useState<string | null>(null);
  const gapiTokenClient = useRef<any>(null);


  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem('transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('loans', JSON.stringify(loans)); }, [loans]);
  useEffect(() => { localStorage.setItem('futureTransactions', JSON.stringify(futureTransactions)); }, [futureTransactions]);
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);
  
  // Effect to manage initial load state for animations
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // AI Analysis Effect
  useEffect(() => {
    const fetchAnalysis = async () => {
        setIsAnalysisLoading(true);
        setAnalysisError(null);
        try {
            const result = await generateAIAnalysis(transactions, currency);
            setAiAnalysis(result);
        } catch (e) {
            if (e instanceof Error) {
                setAnalysisError(e.message);
            } else {
                setAnalysisError("An unknown error occurred.");
            }
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    if (transactions.length >= 5) {
        fetchAnalysis();
    } else {
        setIsAnalysisLoading(false);
        setAiAnalysis(null);
        setAnalysisError("Add at least 5 transactions to see AI analytics.");
    }
  }, [transactions, currency]);


  // Dark Mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);
  
  // Google Drive Client Initialization
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => gapi.load('client', () => setGapiReady(true));
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (gapiReady) {
      GoogleDriveService.initGoogleClient((tokenResponse) => {
        if (tokenResponse.access_token) {
            gapi.client.setToken(tokenResponse);
            setIsSignedIn(true);
        }
      }).then(client => {
        gapiTokenClient.current = client;
      }).catch(err => {
        setDriveError("Could not initialize Google Sign-In. Please check your Client ID in the code.");
        console.error(err);
      });
    }
  }, [gapiReady]);


  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDarkMode(!isDarkMode);
  };
  
    const handleSetTab = (newTab: string) => {
        if (newTab === activeTab) return;

        const currentIdx = navItems.findIndex(item => item.id === activeTab);
        const newIdx = navItems.findIndex(item => item.id === newTab);

        if (newIdx > currentIdx) {
            setTabAnimationDirection('right');
        } else if (newIdx < currentIdx) {
            setTabAnimationDirection('left');
        } else {
            setTabAnimationDirection('none');
        }

        setPreviousTab(activeTab);
        _setActiveTab(newTab);

        setTimeout(() => {
            setPreviousTab(null);
        }, 350);
    };

  // --- Business Logic & State Updaters ---

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...tx, id: Date.now().toString() }].sort(transactionSortFn));
  };
  const updateTransaction = (tx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t).sort(transactionSortFn));
  };
  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
    
  const addFutureTransaction = (ftx: Omit<FutureTransaction, 'id'>) => {
    setFutureTransactions(prev => [...prev, { ...ftx, id: Date.now().toString() }]);
  };
  const updateFutureTransaction = (ftx: FutureTransaction) => {
    setFutureTransactions(prev => prev.map(f => f.id === ftx.id ? ftx : f));
  };
  const deleteFutureTransaction = (id: string) => {
    setFutureTransactions(prev => prev.filter(f => f.id !== id));
  };

    // --- Loan Logic ---
    const getUpdatedLoanStatus = (loan: Omit<Loan, 'status'>): Loan['status'] => {
        const paidAmount = loan.payments.reduce((sum, p) => sum + p.amount, 0);
        
        if (paidAmount >= loan.amount) {
            return 'completed';
        }

        if (loan.dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(loan.dueDate + 'T00:00:00');
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) {
                return 'overdue';
            }
        }
        
        if (paidAmount > 0) {
            return 'partially_paid';
        }

        return 'pending';
    };

    const addLoan = (loanData: Omit<Loan, 'id' | 'payments' | 'status'>) => {
        const newLoanBase = { ...loanData, id: Date.now().toString(), payments: [] };
        const newLoan: Loan = { ...newLoanBase, status: getUpdatedLoanStatus(newLoanBase) };
        setLoans(prev => [...prev, newLoan]);
    };

    const updateLoan = (loanDataFromModal: Loan) => {
        setLoans(prevLoans =>
            prevLoans.map(loan => {
                if (loan.id === loanDataFromModal.id) {
                    // Directly use the data from the modal. It contains the complete, updated information (e.g., new payment).
                    // Then, recalculate the status based on this definitive new data.
                    const updatedLoanWithNewStatus = {
                        ...loanDataFromModal,
                        status: getUpdatedLoanStatus(loanDataFromModal),
                    };
                    return updatedLoanWithNewStatus;
                }
                // For all other loans, return them unmodified.
                return loan;
            })
        );
    };

    const deleteLoan = (id: string) => {
        setLoans(prev => prev.filter(l => l.id !== id));
    };
    
    const addLoanPayment = (loanId: string, payment: Omit<LoanPayment, 'id'>) => {
        setLoans(prevLoans =>
            prevLoans.map(loan => {
                if (loan.id === loanId) {
                    const newPayments = [...loan.payments, { ...payment, id: Date.now().toString() }]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    
                    const updatedLoanBase = { ...loan, payments: newPayments };
                    return { ...updatedLoanBase, status: getUpdatedLoanStatus(updatedLoanBase) };
                }
                return loan;
            })
        );
    };
  
  // --- Modal Handlers ---
  const handleOpenAddTransaction = () => {
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
  };
  
  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  };
  
  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  };

  const handleSaveTransaction = (txData: Omit<Transaction, 'id'> | Transaction) => {
    if ('id' in txData) {
      updateTransaction(txData);
    } else {
      addTransaction(txData);
    }
    handleCloseTransactionModal();
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
    handleCloseTransactionModal();
  };
    
    // Future Transaction Modal Handlers
    const handleOpenAddFutureTransaction = () => {
        setEditingFutureTransaction(null);
        setIsFutureTransactionModalOpen(true);
    };
    const handleOpenEditFutureTransaction = (ftx: FutureTransaction) => {
        setEditingFutureTransaction(ftx);
        setIsFutureTransactionModalOpen(true);
    };
    const handleCloseFutureTransactionModal = () => {
        setIsFutureTransactionModalOpen(false);
        setEditingFutureTransaction(null);
    };
    const handleSaveFutureTransaction = (ftxData: Omit<FutureTransaction, 'id'> | FutureTransaction) => {
        if ('id' in ftxData) {
            updateFutureTransaction(ftxData);
        } else {
            addFutureTransaction(ftxData);
        }
        handleCloseFutureTransactionModal();
    };
    const handleDeleteFutureTransaction = (id: string) => {
        deleteFutureTransaction(id);
        handleCloseFutureTransactionModal();
    };

    // Loan Modal Handlers
    const handleOpenAddLoan = () => {
        setEditingLoan(null);
        setIsLoanModalOpen(true);
    };
    const handleOpenEditLoan = (loan: Loan) => {
        setEditingLoan(loan);
        setIsLoanModalOpen(true);
    };
    const handleCloseLoanModal = () => {
        setIsLoanModalOpen(false);
        setEditingLoan(null);
    };
    const handleSaveLoan = (loanData: Omit<Loan, 'id' | 'payments' | 'status'> | Loan) => {
        if ('id' in loanData) {
            updateLoan(loanData as Loan);
        } else {
            addLoan(loanData);
        }
        handleCloseLoanModal();
    };
    const handleDeleteLoan = (id: string) => {
        deleteLoan(id);
        handleCloseLoanModal();
    };


    const handleViewOrEditFutureTransaction = (ftx: FutureTransaction) => {
        if (ftx.calculationDetails) {
            setViewingCalculation(ftx);
            setIsCalculationDetailModalOpen(true);
        } else {
            handleOpenEditFutureTransaction(ftx);
        }
    };

    const addOrUpdateCalculatedSalary = (month: number, year: number) => {
        if (!salaryToAdd) return;

        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const startDate = `${monthKey}-01`;

        const existingSalary = futureTransactions.find(
            ftx => ftx.description === 'Calculated Salary' && ftx.startDate.startsWith(monthKey)
        );

        const salaryData: Omit<FutureTransaction, 'id'> = {
            description: 'Calculated Salary',
            type: 'income',
            amount: salaryToAdd.result.net,
            frequency: 'one-time',
            startDate: startDate,
            calculationDetails: salaryToAdd.inputs,
            category: 'Salary',
        };

        if (existingSalary) {
            updateFutureTransaction({ ...salaryData, id: existingSalary.id });
        } else {
            addFutureTransaction(salaryData);
        }
        
        setEditingSalaryCalculation(null); // Clear any pending edits
        setIsSelectMonthModalOpen(false);
        setSalaryToAdd(null);
    };

    const handleOpenSelectMonthModal = (result: any, inputs: SalaryCalculationDetails) => {
        setSalaryToAdd({ result, inputs });
        setIsSelectMonthModalOpen(true);
    };

    const handleEditCalculatedSalary = (ftx: FutureTransaction) => {
        if (ftx.calculationDetails) {
            setEditingSalaryCalculation(ftx.calculationDetails);
            setActivePlannerTab('calculator');
            handleSetTab('planner');
            setIsCalculationDetailModalOpen(false);
            setViewingCalculation(null);
        }
    };

    const resetDriveMessages = () => {
        setDriveError(null);
        setDriveSuccess(null);
    };

    const handleSignIn = () => {
        resetDriveMessages();
        GoogleDriveService.requestAccessToken();
    };

    const handleSignOut = () => {
        const token = gapi.client.getToken();
        if (token) {
            GoogleDriveService.revokeAccessToken(token.access_token);
            gapi.client.setToken(null);
        }
        setIsSignedIn(false);
        setDriveSuccess("You have been signed out.");
    };

    const handleBackup = async () => {
        resetDriveMessages();
        setIsDriveLoading(true);
        try {
            const dataToBackup = { transactions, categories, currency, futureTransactions, loans };
            await GoogleDriveService.backupToDrive(dataToBackup);
            setDriveSuccess("Backup successful!");
        } catch (err: any) {
            setDriveError(err.message || "Backup failed.");
        } finally {
            setIsDriveLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!window.confirm("This will overwrite your current data with the backup from Google Drive. Are you sure you want to continue?")) {
            return;
        }
        resetDriveMessages();
        setIsDriveLoading(true);
        try {
            const data = await GoogleDriveService.restoreFromDrive();
            // This is the same logic as handleImport
             if (!data.transactions || !data.categories || !data.currency) {
              throw new Error("Invalid backup file format from Google Drive.");
            }
            
            const importTimestamp = Date.now();
            const importedTransactions = (data.transactions || []).map((tx: any, index: number) => ({
                id: `${importTimestamp + index}`,
                date: tx.date,
                description: tx.description,
                type: tx.type,
                category: tx.category,
                amount: tx.amount,
            }));
            setTransactions(importedTransactions.sort(transactionSortFn));
            setCategories(data.categories || []);
            setCurrency(data.currency || 'PKR');
            setFutureTransactions(data.futureTransactions || []);
            setLoans(data.loans || []);

            setDriveSuccess("Restore successful! App will now reload.");
            setTimeout(() => window.location.reload(), 1500);

        } catch (err: any) {
            setDriveError(err.message || "Restore failed.");
        } finally {
            setIsDriveLoading(false);
        }
    };


    // --- Data Management ---
  const calculateMonthlyBudgets = useCallback((allTransactions: Transaction[]): MonthlyBudget => {
        if (allTransactions.length === 0) return {};

        const budgets: MonthlyBudget = {};
        const sortedTransactions = [...allTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const monthKeys = [...new Set(sortedTransactions.map(tx => tx.date.substring(0, 7)))].sort();

        let lastEndingBalance = 0;

        for (const monthKey of monthKeys) {
            const monthTransactions = sortedTransactions.filter(tx => tx.date.startsWith(monthKey));
            const income = monthTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
            const expenses = monthTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
            
            budgets[monthKey] = {
                startingBalance: lastEndingBalance,
                income,
                expenses,
                endingBalance: lastEndingBalance + income - expenses,
            };
            lastEndingBalance = budgets[monthKey].endingBalance;
        }
        return budgets;
  }, []);
  
  const monthlyBudgets = useMemo(() => calculateMonthlyBudgets(transactions), [transactions, calculateMonthlyBudgets]);


  const handleExport = () => {
    const dataToExport = {
      transactions,
      categories,
      currency,
      monthlyBudgets,
      futureTransactions,
      loans,
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('Data exported successfully!');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
            throw new Error("File could not be read.");
        }
        const data = JSON.parse(result);

        // Basic validation
        if (!data.transactions || !data.categories || !data.currency) {
          throw new Error("Invalid backup file format.");
        }
        
        const importTimestamp = Date.now();
        const importedTransactions = (data.transactions || []).map((tx: any, index: number) => ({
            id: `${importTimestamp + index}`, // Ensure unique, sortable ID
            date: tx.date,
            description: tx.desc || tx.description, // Handles 'desc' from backup file
            type: tx.type,
            category: tx.category,
            amount: tx.amount,
        }));
        setTransactions(importedTransactions.sort(transactionSortFn));

        setCategories(data.categories || []);
        setCurrency(data.currency || 'PKR');
        
        // Handle nested futureTransactions structure from old backup format
        if (data.futureTransactions && (data.futureTransactions.income || data.futureTransactions.expenses)) {
          const futureIncome = (data.futureTransactions.income || []).map((item: any, index: number) => ({
            ...item,
            id: `imported-ft-inc-${Date.now()}-${index}`,
            type: 'income',
          }));
          const futureExpenses = (data.futureTransactions.expenses || []).map((item: any, index: number) => ({
            ...item,
            id: `imported-ft-exp-${Date.now()}-${index}`,
            type: 'expense',
          }));
          setFutureTransactions([...futureIncome, ...futureExpenses]);
        } else if (Array.isArray(data.futureTransactions)) {
          setFutureTransactions(data.futureTransactions);
        } else {
          setFutureTransactions([]);
        }

        // Handle nested loans structure from old backup format
        if (data.loans && (data.loans.given || data.loans.taken)) {
            const loansGiven = (data.loans.given || []).map((loan: any, index: number) => ({
                ...loan,
                id: `imported-loan-given-${Date.now()}-${index}`,
                type: 'given'
            }));
            const loansTaken = (data.loans.taken || []).map((loan: any, index: number) => ({
                ...loan,
                id: `imported-loan-taken-${Date.now()}-${index}`,
                type: 'taken'
            }));
            setLoans([...loansGiven, ...loansTaken]);
        } else if (Array.isArray(data.loans)) {
          setLoans(data.loans);
        } else {
            setLoans([]);
        }
        
        alert('Data imported successfully!');
      } catch (error) {
        console.error("Import failed:", error);
        alert(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  // --- Memoized Calculations ---
  const [dateFilter, setDateFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() + 1 === dateFilter.month && txDate.getFullYear() === dateFilter.year;
    });
  }, [transactions, dateFilter]);

  const isApplicableForMonth = useCallback((ftx: FutureTransaction, year: number, month: number): boolean => {
      const targetMonthStart = new Date(year, month - 1, 1);
      const targetMonthEnd = new Date(year, month, 0);
      const ftxStartDate = new Date(ftx.startDate + 'T00:00:00');
      const ftxEndDate = ftx.endDate ? new Date(ftx.endDate + 'T00:00:00') : null;

      if (ftxStartDate > targetMonthEnd) return false;
      if (ftxEndDate && ftxEndDate < targetMonthStart) return false;

      switch (ftx.frequency) {
          case 'one-time':
              return ftxStartDate.getFullYear() === year && ftxStartDate.getMonth() === month - 1;
          case 'monthly':
              return true;
          case 'quarterly': {
              const monthDiff = (year - ftxStartDate.getFullYear()) * 12 + ((month - 1) - ftxStartDate.getMonth());
              return monthDiff >= 0 && monthDiff % 3 === 0;
          }
          case 'yearly': {
              if (year < ftxStartDate.getFullYear()) return false;
              return (month - 1) === ftxStartDate.getMonth();
          }
          default:
              return false;
      }
  }, []);

  const projectedData = useMemo(() => {
    const getProjectedTotalsForMonth = (year: number, month: number) => {
        const income = futureTransactions
            .filter(ftx => ftx.type === 'income' && isApplicableForMonth(ftx, year, month))
            .reduce((sum, ftx) => sum + ftx.amount, 0);
        const expenses = futureTransactions
            .filter(ftx => ftx.type === 'expense' && isApplicableForMonth(ftx, year, month))
            .reduce((sum, ftx) => sum + ftx.amount, 0);
        return { income, expenses, net: income - expenses };
    };

    const targetYear = plannerDateFilter.year;
    const targetMonth = plannerDateFilter.month;
    const targetDate = new Date(targetYear, targetMonth - 1, 1);

    const sortedMonthKeys = Object.keys(monthlyBudgets).sort();
    const lastActualMonthKey = sortedMonthKeys[sortedMonthKeys.length - 1];

    if (!lastActualMonthKey) {
        let runningBalance = 0;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const loopDate = new Date(currentYear, currentMonth - 1, 1);
        
        while(loopDate < targetDate) {
            const totals = getProjectedTotalsForMonth(loopDate.getFullYear(), loopDate.getMonth() + 1);
            runningBalance += totals.net;
            loopDate.setMonth(loopDate.getMonth() + 1);
        }
        const targetMonthTotals = getProjectedTotalsForMonth(targetYear, targetMonth);
        return { 
            income: targetMonthTotals.income, 
            expenses: targetMonthTotals.expenses, 
            balance: runningBalance + targetMonthTotals.net 
        };
    }
    
    const [lastActualYear, lastActualMonthNum] = lastActualMonthKey.split('-').map(Number);
    const lastActualDate = new Date(lastActualYear, lastActualMonthNum - 1, 1);
    
    if (targetDate <= lastActualDate) {
        const targetMonthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
        const actuals = monthlyBudgets[targetMonthKey];
        if (actuals) {
            return { income: actuals.income, expenses: actuals.expenses, balance: actuals.endingBalance };
        }
        
        const lastKnownBalance = monthlyBudgets[lastActualMonthKey]?.endingBalance || 0;
        return { income: 0, expenses: 0, balance: lastKnownBalance };
    }

    let runningBalance = monthlyBudgets[lastActualMonthKey].endingBalance;
    const loopDate = new Date(lastActualYear, lastActualMonthNum, 1); 

    while (loopDate < targetDate) {
        const loopYear = loopDate.getFullYear();
        const loopMonth = loopDate.getMonth() + 1;
        const { net } = getProjectedTotalsForMonth(loopYear, loopMonth);
        runningBalance += net;
        loopDate.setMonth(loopDate.getMonth() + 1);
    }
    
    const targetMonthTotals = getProjectedTotalsForMonth(targetYear, targetMonth);
    const finalBalance = runningBalance + targetMonthTotals.net;

    return {
        income: targetMonthTotals.income,
        expenses: targetMonthTotals.expenses,
        balance: finalBalance,
    };
  }, [futureTransactions, monthlyBudgets, plannerDateFilter, isApplicableForMonth]);
    
    const groupedPlannedTransactions = useMemo(() => {
        const groups: { monthKey: string; transactions: FutureTransaction[] }[] = [];
        const today = new Date();
        today.setDate(1); // Start from the beginning of the current month

        for (let i = 0; i < 12; i++) { // Project for the next 12 months
            const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            
            const applicableTransactions = futureTransactions.filter(ftx => 
                isApplicableForMonth(ftx, year, month)
            );

            if (applicableTransactions.length > 0) {
                groups.push({
                    monthKey,
                    // Sort by type (income first) then description
                    transactions: applicableTransactions.sort((a,b) => {
                        if (a.type !== b.type) return a.type.localeCompare(b.type);
                        return a.description.localeCompare(b.description);
                    })
                });
            }
        }
        return groups;
    }, [futureTransactions, isApplicableForMonth]);

  const isAnimatingTabs = previousTab !== null;
  const tabs = useMemo(() => {
    const monthKey = `${dateFilter.year}-${dateFilter.month.toString().padStart(2, '0')}`;
    const currentMonthBudget = monthlyBudgets[monthKey];

    return [
    { id: 'dashboard', Component: DashboardTab, props: { monthlyBudget: currentMonthBudget, transactions: filteredTransactions, currency, dateFilter, setDateFilter } },
    { id: 'transactions', Component: TransactionsTab, props: { transactions, currency, onEdit: handleOpenEditTransaction, onAdd: handleOpenAddTransaction } },
    { id: 'loans', Component: LoansTab, props: { loans, currency, onEdit: handleOpenEditLoan, onAdd: handleOpenAddLoan } },
    { id: 'analytics', Component: AnalyticsTab, props: { analysis: aiAnalysis, loading: isAnalysisLoading, error: analysisError, transactions, currency, isDarkMode, monthlyBudgets } },
    { id: 'planner', Component: PlannerTab, props: { groupedTransactions: groupedPlannedTransactions, currency, onAdd: handleOpenAddFutureTransaction, onViewOrEdit: handleViewOrEditFutureTransaction, activePlannerTab, setActivePlannerTab, onAddToPlanner: handleOpenSelectMonthModal, initialCalculation: editingSalaryCalculation, projectedData, plannerDateFilter, setPlannerDateFilter }},
    { id: 'settings', Component: SettingsTab, props: { 
        categories, setCategories, isDarkMode, toggleDarkMode, onExport: handleExport, onImport: handleImport,
        // Google Drive Props
        gapiReady, isSignedIn, isDriveLoading, driveError, driveSuccess,
        onSignIn: handleSignIn, onSignOut: handleSignOut, onBackup: handleBackup, onRestore: handleRestore
     } },
  ]}, [monthlyBudgets, filteredTransactions, currency, dateFilter, transactions, loans, aiAnalysis, isAnalysisLoading, analysisError, isDarkMode, categories, groupedPlannedTransactions, activePlannerTab, editingSalaryCalculation, projectedData, plannerDateFilter, gapiReady, isSignedIn, isDriveLoading, driveError, driveSuccess]);


  return (
    <div className="bg-light-bg dark:bg-dark-bg min-h-screen text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      <main className="container mx-auto max-w-4xl p-4 pb-24">
        <Header />
        <div className="relative">
            {tabs.map(({ id, Component, props }) => {
                const isCurrent = id === activeTab;
                const isPrevious = id === previousTab;

                if (!isCurrent && !isPrevious) return null;

                let animationClass = '';
                if (isAnimatingTabs) {
                    if (isCurrent) {
                        animationClass = tabAnimationDirection === 'right' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left';
                    } else if (isPrevious) {
                        animationClass = tabAnimationDirection === 'right' ? 'animate-slide-out-to-left' : 'animate-slide-out-to-right';
                    }
                } else if (isCurrent) {
                    animationClass = isInitialLoad ? 'animate-fade-in' : '';
                }

                const positionClass = isPrevious ? 'absolute top-0 left-0 w-full' : 'relative';

                return (
                    <div key={id} className={`${positionClass} ${animationClass}`}>
                        {/* @ts-ignore */}
                        <Component {...props} />
                    </div>
                );
            })}
        </div>
      </main>
      
      <button 
        onClick={handleOpenAddTransaction} 
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary-dark hover:bg-primary-light text-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 active:scale-100 transition-all duration-200 z-40"
        aria-label="Add new transaction"
      >
        <Icon name="plus-lg" className="text-2xl" />
      </button>

      <BottomNav activeTab={activeTab} setActiveTab={handleSetTab} />

      {isTransactionModalOpen && (
          <TransactionFormModal 
              isOpen={isTransactionModalOpen}
              onClose={handleCloseTransactionModal}
              onSave={handleSaveTransaction}
              onDelete={handleDeleteTransaction}
              categories={categories}
              transaction={editingTransaction}
              currency={currency}
          />
      )}
        
        {isFutureTransactionModalOpen && (
            <FutureTransactionFormModal
                isOpen={isFutureTransactionModalOpen}
                onClose={handleCloseFutureTransactionModal}
                onSave={handleSaveFutureTransaction}
                onDelete={handleDeleteFutureTransaction}
                transaction={editingFutureTransaction}
                currency={currency}
                categories={categories}
            />
        )}

        {isLoanModalOpen && (
            <LoanFormModal
                isOpen={isLoanModalOpen}
                onClose={handleCloseLoanModal}
                onSave={handleSaveLoan}
                onDelete={handleDeleteLoan}
                onAddPayment={addLoanPayment}
                loan={editingLoan}
                currency={currency}
            />
        )}

        {isSelectMonthModalOpen && (
            <SelectMonthForSalaryModal
                isOpen={isSelectMonthModalOpen}
                onClose={() => setIsSelectMonthModalOpen(false)}
                onSave={addOrUpdateCalculatedSalary}
            />
        )}

        {isCalculationDetailModalOpen && viewingCalculation && (
            <CalculationDetailModal
                isOpen={isCalculationDetailModalOpen}
                onClose={() => setIsCalculationDetailModalOpen(false)}
                onEdit={() => handleEditCalculatedSalary(viewingCalculation)}
                transaction={viewingCalculation}
                currency={currency}
            />
        )}
    </div>
  );
}

// --- Header Component ---
const Header = () => (
    <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light">Finance Flow</h1>
        <div className="flex items-center space-x-4">
            <Icon name="bell" className="text-xl text-gray-500 dark:text-gray-400 cursor-pointer"/>
            <Icon name="person-circle" className="text-2xl text-gray-500 dark:text-gray-400 cursor-pointer"/>
        </div>
    </header>
);

// --- Bottom Navigation ---
const navItems = [
  { id: 'dashboard', icon: 'house-door', label: 'Dashboard' },
  { id: 'transactions', icon: 'list-ul', label: 'Transactions' },
  { id: 'loans', icon: 'cash-stack', label: 'Loans' },
  { id: 'analytics', icon: 'bar-chart-line', label: 'Analytics' },
  { id: 'planner', icon: 'calendar-check', label: 'Planner' },
  { id: 'settings', icon: 'gear', label: 'Settings' },
];

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void; }) => {
    return (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-white/60 dark:bg-dark-card/80 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-full shadow-2xl z-50">
            <div className="flex items-center h-16">
                {navItems.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-200 transform active:scale-95 focus:outline-none ${isActive ? 'text-primary-DEFAULT dark:text-primary-light' : 'text-gray-500 dark:text-gray-400 hover:text-primary-DEFAULT dark:hover:text-primary-light'}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon name={item.icon} className={`transition-all duration-200 ${isActive ? 'text-2xl' : 'text-xl'}`} />
                            <span className={`text-xs mt-1.5 transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};


// --- Dashboard Tab ---
interface DashboardTabProps {
    monthlyBudget: MonthlyBudget[string] | undefined;
    transactions: Transaction[];
    currency: string;
    dateFilter: { month: number, year: number };
    setDateFilter: React.Dispatch<React.SetStateAction<{ month: number, year: number }>>;
}

interface CategoryBreakdownRowProps {
  category: { name: string; value: number };
  total: number;
  currency: string;
  type: TransactionType;
  isExpanded: boolean;
  onToggle: () => void;
  transactions: Transaction[];
}

const CategoryBreakdownRow: React.FC<CategoryBreakdownRowProps> = ({ 
  category, 
  total, 
  currency, 
  type, 
  isExpanded, 
  onToggle, 
  transactions 
}) => {
    const percentage = total > 0 ? (category.value / total) * 100 : 0;
    const barColor = type === 'income' ? 'bg-success' : 'bg-danger';

    const content = useMemo(() => (
        isExpanded ? (
            <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                {transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <p className="truncate pr-4">{tx.description}</p>
                        <p className="font-mono whitespace-nowrap">
                            {type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        ) : null
    ), [isExpanded, transactions, type]);


    return (
        <div className="py-1">
            <div onClick={onToggle} className="cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors duration-200">
                <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-medium">{category.name}</span>
                    <AnimatedAmount value={category.value} currency={currency} />
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
            <AnimatedHeightContainer>
                {content}
            </AnimatedHeightContainer>
        </div>
    );
};

const CategoryBreakdownCard = ({ title, categoryTotals, total, currency, type, transactions }: {
    title: string;
    categoryTotals: { name: string; value: number }[];
    total: number;
    currency: string;
    type: TransactionType;
    transactions: Transaction[];
}) => {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const handleToggleCategory = (name: string) => {
        setExpandedCategory(prev => (prev === name ? null : name));
    };
    
    const content = useMemo(() => (
        <div className="space-y-1">
            {categoryTotals.length > 0 ? (
                categoryTotals.map(cat => (
                    <CategoryBreakdownRow
                        key={`${type}-${cat.name}`}
                        category={cat}
                        total={total}
                        currency={currency}
                        type={type}
                        isExpanded={expandedCategory === cat.name}
                        onToggle={() => handleToggleCategory(cat.name)}
                        transactions={transactions.filter(t => t.type === type && t.category === cat.name)}
                    />
                ))
            ) : <p className="text-center text-gray-500 py-4">No {type} this month.</p>}
        </div>
    ), [categoryTotals, total, currency, type, transactions, expandedCategory]);

    return (
        <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
            {content}
        </Card>
    );
};


// Month/Year Picker Component
interface MonthYearPickerProps {
    currentDate: { month: number; year: number };
    onSelect: (month: number, year: number) => void;
}

const MonthYearPicker = ({ currentDate, onSelect }: MonthYearPickerProps) => {
    const [displayYear, setDisplayYear] = useState(currentDate.year);

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const handleSelectMonth = (monthIndex: number) => {
        onSelect(monthIndex + 1, displayYear);
    };

    return (
        <Card className="w-full max-w-xs p-4 animate-scale-in-center">
            <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => setDisplayYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors transform active:scale-90">
                    <Icon name="chevron-left" />
                </button>
                <span className="font-semibold text-center text-lg tabular-nums">
                    {displayYear}
                </span>
                <button type="button" onClick={() => setDisplayYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors transform active:scale-90">
                    <Icon name="chevron-right" />
                </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {months.map((month, index) => {
                    const isSelected = (index + 1) === currentDate.month && displayYear === currentDate.year;
                    return (
                        <button
                            key={month}
                            onClick={() => handleSelectMonth(index)}
                            className={`p-3 rounded-lg text-center font-semibold transition-colors duration-200 transform active:scale-95 ${
                                isSelected
                                ? 'bg-white dark:bg-dark-card text-primary-DEFAULT dark:text-primary-light shadow'
                                : 'hover:bg-primary-DEFAULT/10 dark:hover:bg-white/10'
                            }`}
                        >
                            {month}
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

const DashboardTab = ({ monthlyBudget, transactions, currency, dateFilter, setDateFilter }: DashboardTabProps) => {
    
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    const { 
        startingBalance = 0, 
        income = 0, 
        expenses = 0,
        endingBalance = 0,
    } = monthlyBudget || {};

    const { incomeCategoryTotals, expenseCategoryTotals } = useMemo(() => {
        const incomeTotals = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const expenseTotals = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        return {
            incomeCategoryTotals: Object.entries(incomeTotals)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),
            expenseCategoryTotals: Object.entries(expenseTotals)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
        };
    }, [transactions]);
    
    const handlePrevMonth = () => {
        setDateFilter(current => {
            if (current.month === 1) {
                return { month: 12, year: current.year - 1 };
            }
            return { month: current.month - 1, year: current.year };
        });
    };

    const handleNextMonth = () => {
        setDateFilter(current => {
            if (current.month === 12) {
                return { month: 1, year: current.year + 1 };
            }
            return { month: current.month + 1, year: current.year };
        });
    };

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-lg font-semibold">Monthly Summary</h2>
                    <div className="flex items-center justify-center bg-primary-DEFAULT/10 dark:bg-dark-bg rounded-full transition-colors flex-shrink-0">
                        <button
                            onClick={handlePrevMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-DEFAULT/20 dark:hover:bg-white/10 transform active:scale-90 transition-all duration-200"
                            aria-label="Previous month"
                        >
                            <Icon name="chevron-left" className="text-primary-dark dark:text-primary-light" />
                        </button>
                        <button
                            onClick={() => setIsMonthPickerOpen(true)}
                            className="py-2 w-32 text-center"
                            aria-label="Select month"
                        >
                            <span className="font-semibold text-primary-dark dark:text-primary-light tabular-nums whitespace-nowrap">
                                {new Date(dateFilter.year, dateFilter.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                        </button>
                         <button
                            onClick={handleNextMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-DEFAULT/20 dark:hover:bg-white/10 transform active:scale-90 transition-all duration-200"
                            aria-label="Next month"
                        >
                            <Icon name="chevron-right" className="text-primary-dark dark:text-primary-light" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <AnimatedStat label="Rollover" value={startingBalance} currency={currency} className={startingBalance >= 0 ? 'text-primary-light' : 'text-warning'} />
                    <AnimatedStat label="Income" value={income} currency={currency} className="text-success" />
                    <AnimatedStat label="Expense" value={expenses} currency={currency} className="text-danger" />
                    <AnimatedStat label="Balance" value={endingBalance} currency={currency} className={endingBalance >= 0 ? 'text-primary-DEFAULT' : 'text-warning'} />
                </div>
            </Card>

            <CategoryBreakdownCard
                title="Income Breakdown"
                categoryTotals={incomeCategoryTotals}
                total={income}
                currency={currency}
                type="income"
                transactions={transactions}
            />
            
            <CategoryBreakdownCard
                title="Expense Breakdown"
                categoryTotals={expenseCategoryTotals}
                total={expenses}
                currency={currency}
                type="expense"
                transactions={transactions}
            />

             {isMonthPickerOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in"
                    onClick={() => setIsMonthPickerOpen(false)}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        <MonthYearPicker
                            currentDate={dateFilter}
                            onSelect={(month, year) => {
                                setDateFilter({ month, year });
                                setIsMonthPickerOpen(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Transactions Tab ---
interface TransactionsTabProps {
    transactions: Transaction[];
    currency: string;
    onEdit: (tx: Transaction) => void;
    onAdd: () => void;
}

const TransactionsTab = ({ transactions, currency, onEdit, onAdd }: TransactionsTabProps) => {
  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">All Transactions</h2>
            <button onClick={onAdd} className="bg-primary-dark hover:bg-primary-light text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 transition-all transform active:scale-95 duration-200">
                <Icon name="plus" />
                <span>New</span>
            </button>
        </div>
      <Card className="p-0">
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {transactions.length > 0 ? (
                  transactions.map(tx => (
                      <div 
                        key={tx.id} 
                        className="flex items-center px-4 py-3 border-b border-white/10 last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => onEdit(tx)}
                      >
                          {/* Column 1: Info (Icon, Description, Category, Date) */}
                          <div className="flex items-center space-x-3 flex-grow min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                              <Icon name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'} className="font-bold"/>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{tx.description}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{tx.category} &bull; {tx.date}</p>
                            </div>
                          </div>
                          
                          {/* Column 2: Amount */}
                          <div className="text-right flex-shrink-0 ml-4 w-28">
                            <p className={`font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                              {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {currency}
                            </p>
                          </div>
                      </div>
                  ))
              ) : (
                  <p className="text-center text-gray-500 p-8">No transactions found.</p>
              )}
          </div>
      </Card>
    </div>
  );
};

// --- Loans Tab ---
interface LoanCardProps {
    loan: Loan;
    currency: string;
    onEdit: (loan: Loan) => void;
}
const LoanCard: React.FC<LoanCardProps> = ({ loan, currency, onEdit }) => {
    const paidAmount = loan.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = loan.amount - paidAmount;
    const progress = loan.amount > 0 ? (paidAmount / loan.amount) * 100 : (loan.amount === 0 ? 100 : 0);

    const statusConfig: { [key in Loan['status']]: { color: string; label: string; icon: string } } = {
        pending: { color: 'text-gray-500 bg-gray-500/10', label: 'Pending', icon: 'hourglass-split' },
        partially_paid: { color: 'text-primary-light bg-primary-light/10', label: 'In Progress', icon: 'arrow-repeat' },
        completed: { color: 'text-success bg-success/10', label: 'Completed', icon: 'check-circle' },
        overdue: { color: 'text-danger bg-danger/10', label: 'Overdue', icon: 'exclamation-triangle' },
    };
    const currentStatus = statusConfig[loan.status];

    return (
        <div onClick={() => onEdit(loan)} className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-semibold">{loan.person}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{loan.type === 'given' ? 'You lent' : 'You borrowed'}</p>
                </div>
                <div className={`flex items-center space-x-2 text-xs font-semibold px-2 py-1 rounded-full ${currentStatus.color}`}>
                    <Icon name={currentStatus.icon} />
                    <span>{currentStatus.label}</span>
                </div>
            </div>
            <div className="flex justify-between items-baseline text-sm mb-1">
                <span>Paid: <span className="font-semibold text-success">{paidAmount.toLocaleString()}</span></span>
                <span>Total: <span className="font-semibold">{loan.amount.toLocaleString()} {currency}</span></span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${loan.status === 'overdue' ? 'bg-danger' : 'bg-primary-DEFAULT'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
            </div>
             <div className="flex justify-between items-baseline text-xs text-gray-500 dark:text-gray-400">
                <span>Remaining: <span className="font-semibold text-danger">{remainingAmount.toLocaleString()}</span></span>
                {loan.dueDate && <span>Due: {loan.dueDate}</span>}
            </div>
        </div>
    );
};

const LoansTab = ({ loans, currency, onEdit, onAdd }: { loans: Loan[], currency: string, onEdit: (l: Loan) => void, onAdd: () => void }) => {
    const loansTaken = useMemo(() => loans.filter(l => l.type === 'taken'), [loans]);
    const loansGiven = useMemo(() => loans.filter(l => l.type === 'given'), [loans]);

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Loan Management</h2>
                 <button onClick={onAdd} className="bg-primary-dark hover:bg-primary-light text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 transition-all transform active:scale-95 duration-200">
                    <Icon name="plus" />
                    <span>New Loan</span>
                </button>
            </div>
            <div className="space-y-6">
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-3">Loans Taken (Debt)</h3>
                    {loansTaken.length > 0 ? (
                        <div className="space-y-4">
                            {loansTaken.map(loan => <LoanCard key={`${loan.id}-${loan.payments.length}`} loan={loan} currency={currency} onEdit={onEdit} />)}
                        </div>
                    ) : <p className="text-center text-gray-500 py-4">You haven't taken any loans.</p>}
                </Card>
                 <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-3">Loans Given (Credit)</h3>
                    {loansGiven.length > 0 ? (
                        <div className="space-y-4">
                            {loansGiven.map(loan => <LoanCard key={`${loan.id}-${loan.payments.length}`} loan={loan} currency={currency} onEdit={onEdit} />)}
                        </div>
                    ) : <p className="text-center text-gray-500 py-4">You haven't given any loans.</p>}
                </Card>
            </div>
        </div>
    )
};


// --- Custom Calendar Component ---
interface CalendarProps {
    selectedDate: string; // ISO string e.g., "2003-10-28"
    onDateSelect: (date: string) => void;
}

const Calendar = ({ selectedDate, onDateSelect }: CalendarProps) => {
    const [currentDate, setCurrentDate] = useState(new Date(selectedDate + 'T00:00:00'));

    const today = new Date();
    const selected = new Date(selectedDate + 'T00:00:00');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleDateClick = (day: number) => {
        const newDate = new Date(year, month, day);
        onDateSelect(newDate.toISOString().split('T')[0]);
    };

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`prev-${i}`} className="p-1"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const isSelected = day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();
        
        let dayClass = 'w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-colors duration-200';
        if (isSelected) {
            dayClass += ' bg-primary-DEFAULT text-white font-bold';
        } else if (isToday) {
            dayClass += ' text-primary-DEFAULT font-semibold border border-primary-DEFAULT';
        } else {
            dayClass += ' hover:bg-primary-DEFAULT/10 dark:hover:bg-white/10';
        }

        days.push(
            <div key={day} className={dayClass} onClick={() => handleDateClick(day)}>
                {day}
            </div>
        );
    }

    return (
        <Card className="w-full max-w-xs p-4 animate-scale-in-center">
            <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                    <Icon name="chevron-left" />
                </button>
                <span className="font-semibold text-center">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                    <Icon name="chevron-right" />
                </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 place-items-center">
                {days}
            </div>
        </Card>
    );
};


// --- Transaction Form Modal ---
interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id'> | Transaction) => void;
  onDelete: (id: string) => void;
  categories: Category[];
  transaction?: Transaction | null;
  currency: string;
}

const FormInput = ({ label, id, ...props }: {label:string, id:string, [key:string]: any}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
    <div className="relative">
      <input id={id} {...props} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card border border-transparent focus:ring-2 focus:ring-primary-DEFAULT focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed" />
    </div>
  </div>
);

const TransactionFormModal = ({ isOpen, onClose, onSave, onDelete, categories, transaction, currency }: TransactionFormModalProps) => {
  const [type, setType] = useState<TransactionType>(transaction?.type || 'expense');
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // New state for AI category suggestion
  const [description, setDescription] = useState(transaction?.description || '');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const categorySelectRef = useRef<HTMLSelectElement>(null);

  // Reset state when transaction prop changes (e.g., opening modal for edit vs new)
  useEffect(() => {
    setType(transaction?.type || 'expense');
    setDate(transaction?.date || new Date().toISOString().split('T')[0]);
    setDescription(transaction?.description || '');
  }, [transaction]);
  
  useEffect(() => {
    const newFiltered = categories.filter(c => c.type === type);
    setFilteredCategories(newFiltered);
  }, [type, categories]);
  
  const defaultCategory = transaction?.type === type ? transaction.category : filteredCategories[0]?.name;

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
      setIsAnimatingOut(false); // Reset for next open
    }, 200);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: type,
      category: formData.get('category') as string,
    };
    
    if (transaction) {
        onSave({ ...data, id: transaction.id });
    } else {
        onSave(data);
    }
  };

  const handleDelete = () => {
    if (transaction && window.confirm('Are you sure you want to delete this transaction?')) {
        onDelete(transaction.id);
    }
  };

  const handleAutoCategorize = async () => {
    if (!description.trim() || !categorySelectRef.current) return;
    
    setIsCategorizing(true);
    try {
        const suggested = await suggestCategory(description, filteredCategories);
        if (filteredCategories.some(c => c.name === suggested)) {
            categorySelectRef.current.value = suggested;
        } else {
            console.warn(`AI suggested a category that doesn't exist: ${suggested}`);
        }
    } catch (error) {
        console.error("Failed to suggest category:", error);
        // Could add a user-facing error here in a real app
    } finally {
        setIsCategorizing(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
      <Card 
        className={`w-full max-w-md ${isAnimatingOut ? 'animate-scale-out-center' : 'animate-scale-in-center'}`} 
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{transaction ? 'Edit Transaction' : 'New Transaction'}</h2>
            <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <Icon name="x-lg" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg p-1 bg-gray-200 dark:bg-dark-bg">
                <button type="button" onClick={() => setType('expense')} className={`py-2 rounded-md font-semibold transition-all text-lg transform active:scale-95 duration-200 ${type === 'expense' ? 'bg-danger/20 text-danger font-bold' : 'text-gray-500'}`}>Expense</button>
                <button type="button" onClick={() => setType('income')} className={`py-2 rounded-md font-semibold transition-all text-lg transform active:scale-95 duration-200 ${type === 'income' ? 'bg-success/20 text-success font-bold' : 'text-gray-500'}`}>Income</button>
            </div>
            
            <FormInput 
              label="Amount" 
              id="amount" 
              name="amount" 
              type="number"
              step="0.01"
              defaultValue={transaction?.amount || ''}
              required
              autoFocus
              placeholder={`0.00 ${currency}`}
            />
            
            <FormInput 
              label="Description" 
              id="description" 
              name="description" 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required 
            />

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="category" className="block text-sm font-medium text-gray-500 dark:text-gray-400">Category</label>
                <button 
                  type="button" 
                  onClick={handleAutoCategorize} 
                  disabled={isCategorizing || !description.trim()}
                  className="text-xs text-primary-DEFAULT hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 p-1 rounded"
                  title="Auto-categorize with AI"
                >
                  {isCategorizing ? (
                    <Icon name="arrow-repeat" className="animate-spin" />
                  ) : (
                    <Icon name="sparkles" />
                  )}
                  <span>Auto</span>
                </button>
              </div>
              <div className="relative">
                <select 
                  id="category" 
                  name="category" 
                  ref={categorySelectRef}
                  defaultValue={defaultCategory}
                  required 
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card border-transparent appearance-none focus:ring-2 focus:ring-primary-DEFAULT focus:outline-none pr-8"
                >
                  {filteredCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <Icon name="chevron-down" className="absolute right-4 top-3.5 text-gray-400 pointer-events-none"/>
              </div>
            </div>

            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input type="hidden" name="date" value={date} />
                <button 
                    type="button" 
                    onClick={() => setIsCalendarOpen(true)}
                    className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card border border-transparent focus:ring-2 focus:ring-primary-DEFAULT focus:outline-none flex justify-between items-center"
                >
                   <span>{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                   <Icon name="calendar3" className="text-gray-500"/>
                </button>
            </div>

            <div className={`mt-6 flex items-center ${transaction ? 'space-x-4' : ''}`}>
                {transaction && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-3 rounded-lg text-danger bg-danger/10 hover:bg-danger/20 font-bold transition-all transform active:scale-95 duration-200 flex items-center space-x-2"
                    >
                        <Icon name="trash" />
                        <span>Delete</span>
                    </button>
                )}
                <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-lg bg-primary-dark hover:bg-primary-DEFAULT text-white font-bold transition-all transform active:scale-95 duration-200 flex-grow"
                >
                    {transaction ? 'Save Changes' : 'Save Transaction'}
                </button>
            </div>
          </div>
        </form>
      </Card>
      
      {isCalendarOpen && (
          <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in"
              onClick={() => setIsCalendarOpen(false)}
          >
              <div onClick={(e) => e.stopPropagation()}>
                  <Calendar 
                      selectedDate={date} 
                      onDateSelect={(d) => { setDate(d); setIsCalendarOpen(false); }} 
                  />
              </div>
          </div>
      )}
    </div>
  );
};

// --- Loan Form Modal ---
interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Loan, 'id' | 'payments' | 'status'> | Loan) => void;
  onDelete: (id: string) => void;
  onAddPayment: (loanId: string, payment: Omit<LoanPayment, 'id'>) => void;
  loan?: Loan | null;
  currency: string;
}

const LoanFormModal = ({ isOpen, onClose, onSave, onDelete, onAddPayment, loan, currency }: LoanFormModalProps) => {
    const [type, setType] = useState<LoanType>(loan?.type || 'taken');
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState<'date' | 'dueDate' | 'paymentDate' | null>(null);

    // Form states
    const [person, setPerson] = useState(loan?.person || '');
    const [amount, setAmount] = useState(loan?.amount?.toString() || '');
    const [date, setDate] = useState(loan?.date || new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(loan?.dueDate || '');

    // Payment states
    const [newPaymentAmount, setNewPaymentAmount] = useState('');
    const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const isEditing = !!loan;

    // --- Start of Amount Formatting Logic ---
    const formatDisplayValue = (value: string): string => {
        if (!value) return '';
        const [integer, decimal] = value.split('.');
        if (!integer) return decimal !== undefined ? `0.${decimal}` : '';
        const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return decimal === undefined ? formattedInteger : `${formattedInteger}.${decimal}`;
    };

    const handleNumericChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        // Remove non-numeric characters except for one decimal point
        let sanitized = value.replace(/[^0-9.]/g, '');
        const parts = sanitized.split('.');
        if (parts.length > 2) {
            sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
        }
        if (parts[1] && parts[1].length > 2) {
            sanitized = `${parts[0]}.${parts[1].substring(0, 2)}`;
        }
        setter(sanitized);
    };
    // --- End of Amount Formatting Logic ---


    useEffect(() => {
        setType(loan?.type || 'taken');
        setPerson(loan?.person || '');
        setAmount(loan?.amount?.toString() || '');
        setDate(loan?.date || new Date().toISOString().split('T')[0]);
        setDueDate(loan?.dueDate || '');
        setNewPaymentAmount(''); // Reset payment form on loan change
        setNewPaymentDate(new Date().toISOString().split('T')[0]);
    }, [loan]);

    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => {
            onClose();
            setIsAnimatingOut(false);
        }, 200);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEditing && loan) {
            let loanToSave = { ...loan, dueDate };
            const numericPaymentAmount = parseFloat(newPaymentAmount.replace(/,/g, ''));

            if (newPaymentAmount && !isNaN(numericPaymentAmount) && numericPaymentAmount > 0) {
                const newPayment: LoanPayment = {
                    id: Date.now().toString(),
                    date: newPaymentDate,
                    amount: numericPaymentAmount,
                };
                const newPayments = [...loan.payments, newPayment]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                loanToSave = { ...loanToSave, payments: newPayments };
            }
            onSave(loanToSave);
        } else {
            const numericAmount = parseFloat(amount.replace(/,/g, ''));
            if (isNaN(numericAmount) || numericAmount <= 0) return;
            const data = { type, person, amount: numericAmount, date, dueDate };
            onSave(data);
        }
    };
    
    const handleDelete = () => {
        if (loan && window.confirm('Are you sure you want to delete this loan and all its payments?')) {
            onDelete(loan.id);
        }
    };

    if (!isOpen) return null;

    const paidAmount = loan?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
    
    return (
        <div className="fixed inset-0 bg-gray-500/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <Card className={`w-full max-w-md ${isAnimatingOut ? 'animate-scale-out-center' : 'animate-scale-in-center'}`} onClick={(e) => e.stopPropagation()}>
                <div className="max-h-[85vh] overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{loan ? 'Manage Loan' : 'New Loan'}</h2>
                            <button type="button" onClick={handleClose}><Icon name="x-lg" /></button>
                        </div>
                        
                        {isEditing && loan ? (
                            <>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-gray-100 dark:bg-dark-bg mb-2">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{loan.type === 'taken' ? "Lender" : "Borrower"}</p>
                                                <p className="font-bold text-xl">{loan.person}</p>
                                            </div>
                                            <div className={`text-xs font-semibold px-2 py-1 rounded-full ${loan.type === 'taken' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                                                {loan.type === 'taken' ? 'Debt' : 'Credit'}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-baseline text-sm">
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400">Total Amount</p>
                                                <p className="font-semibold">{loan.amount.toLocaleString()} {currency}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-500 dark:text-gray-400">Date {loan.type === 'taken' ? 'Taken' : 'Given'}</p>
                                                <p className="font-semibold">{new Date(loan.date + 'T00:00:00').toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date (Optional)</label>
                                        <button type="button" onClick={() => setIsCalendarOpen('dueDate')} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card text-left">{dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString() : 'Select a date'}</button>
                                    </div>
                                </div>
                                
                                {loan.status !== 'completed' && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                                        <h3 className="text-lg font-semibold mb-3">Add Payment</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                            <FormInput 
                                                label="Amount" 
                                                id="paymentAmount" 
                                                type="text" 
                                                inputMode="decimal"
                                                value={formatDisplayValue(newPaymentAmount)} 
                                                onChange={handleNumericChange(setNewPaymentAmount)} 
                                                max={loan.amount - paidAmount} 
                                            />
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                                                <button type="button" onClick={() => setIsCalendarOpen('paymentDate')} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card text-left">{new Date(newPaymentDate + 'T00:00:00').toLocaleDateString()}</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {loan.payments.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                                        <h3 className="text-lg font-semibold mb-3">Payment History</h3>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {loan.payments.map(p => (
                                                <div key={p.id} className="flex justify-between p-2 rounded-lg bg-gray-100 dark:bg-dark-bg">
                                                    <span className="text-gray-500 text-sm">{p.date}</span>
                                                    <span className="font-semibold">{p.amount.toLocaleString()} {currency}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center space-x-4">
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-4 py-3 rounded-lg text-danger bg-danger/10 hover:bg-danger/20 font-bold transition-all transform active:scale-95 duration-200 flex items-center space-x-2"
                                    >
                                        <Icon name="trash" />
                                        <span>Delete</span>
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full py-3 px-4 rounded-lg bg-primary-dark hover:bg-primary-DEFAULT text-white font-bold transition-all transform active:scale-95 duration-200 flex-grow"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </>
                        ) : (
                             <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 rounded-lg p-1 bg-gray-200 dark:bg-dark-bg">
                                    <button type="button" onClick={() => setType('taken')} className={`py-2 rounded-md font-semibold transition-all transform active:scale-95 duration-200 ${type === 'taken' ? 'bg-danger/20 text-danger font-bold' : 'text-gray-500'}`}>Loan Taken</button>
                                    <button type="button" onClick={() => setType('given')} className={`py-2 rounded-md font-semibold transition-all transform active:scale-95 duration-200 ${type === 'given' ? 'bg-success/20 text-success font-bold' : 'text-gray-500'}`}>Loan Given</button>
                                </div>
                                <FormInput label={type === 'taken' ? "Lender's Name" : "Borrower's Name"} id="person" type="text" value={person} onChange={(e:any) => setPerson(e.target.value)} required />
                                <FormInput 
                                    label="Total Amount" 
                                    id="amount" 
                                    type="text"
                                    inputMode="decimal"
                                    value={formatDisplayValue(amount)} 
                                    onChange={handleNumericChange(setAmount)} 
                                    required 
                                    placeholder={`0.00 ${currency}`}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date {type === 'taken' ? 'Taken' : 'Given'}</label>
                                    <button type="button" onClick={() => setIsCalendarOpen('date')} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card text-left">{new Date(date + 'T00:00:00').toLocaleDateString()}</button>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date (Optional)</label>
                                    <button type="button" onClick={() => setIsCalendarOpen('dueDate')} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card text-left">{dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString() : 'Select a date'}</button>
                                </div>
                                <div className="pt-2">
                                     <button type="submit" className="w-full py-3 rounded-lg bg-primary-dark text-white font-bold">Save Loan</button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </Card>

            {isCalendarOpen && (
                <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center" onClick={() => setIsCalendarOpen(null)}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <Calendar 
                            selectedDate={
                                isCalendarOpen === 'date' ? date :
                                isCalendarOpen === 'dueDate' ? (dueDate || date) : newPaymentDate
                            } 
                            onDateSelect={(d) => {
                                if (isCalendarOpen === 'date') setDate(d);
                                else if (isCalendarOpen === 'dueDate') setDueDate(d);
                                else if (isCalendarOpen === 'paymentDate') setNewPaymentDate(d);
                                setIsCalendarOpen(null);
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Analytics Tab ---
interface AnalyticsTabProps {
    analysis: AIAnalysis | null;
    loading: boolean;
    error: string | null;
    transactions: Transaction[];
    currency: string;
    isDarkMode: boolean;
    monthlyBudgets: MonthlyBudget;
}

const AnalyticsTab = ({ analysis, loading, error, transactions, currency, isDarkMode, monthlyBudgets }: AnalyticsTabProps) => {
    const netWorthData = useMemo(() => {
        return Object.entries(monthlyBudgets)
            .map(([monthKey, data]) => {
                const [year, month] = monthKey.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return {
                    date: date,
                    month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                    balance: data.endingBalance,
                };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [monthlyBudgets]);

    if (loading) return <div className="text-center p-10">
        <p className="animate-pulse">Generating AI insights...</p>
    </div>;

    if (error) return <div className="text-center p-10 text-danger">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-4 text-center">
                    <p className="text-sm text-gray-500">Health Score</p>
                    <p className="text-4xl font-bold text-primary-DEFAULT">{analysis?.healthScore}/100</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-sm text-gray-500">Savings Rate</p>
                    <p className="text-4xl font-bold text-success">{analysis?.savingsRate ? (analysis.savingsRate * 100).toFixed(1) : 0}%</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-sm text-gray-500">Next Month's Spending</p>
                    <p className="text-4xl font-bold text-warning">{analysis?.spendingPrediction?.toLocaleString()} <span className="text-base">{currency}</span></p>
                </Card>
            </div>
            
            <Card className="p-4">
                <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
                <div className="space-y-3">
                    {analysis?.insights.map((insight, i) => (
                        <div key={i} className={`flex items-start space-x-3 p-3 rounded-lg ${
                            insight.type === 'positive' ? 'bg-success/10' :
                            insight.type === 'warning' ? 'bg-danger/10' : 'bg-primary-DEFAULT/10'
                        }`}>
                           <Icon name={insight.icon} className={`text-xl ${
                            insight.type === 'positive' ? 'text-success' :
                            insight.type === 'warning' ? 'text-danger' : 'text-primary-DEFAULT'
                           }`}/>
                           <p>{insight.message}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-4">
                <h2 className="text-lg font-semibold mb-2">Net Worth Over Time</h2>
                <div className="h-80">
                    {netWorthData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={netWorthData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
                                <XAxis dataKey="month" tick={{ fill: isDarkMode ? '#A0A0A0' : '#6B7280', fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value)} tick={{ fill: isDarkMode ? '#A0A0A0' : '#6B7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: isDarkMode ? '#333' : '#fff', border: 'none', borderRadius: '8px' }}
                                    formatter={(value: number) => [`${value.toLocaleString()} ${currency}`, 'Balance']}
                                />
                                <Line isAnimationActive={true} animationDuration={800} type="monotone" dataKey="balance" stroke="#4361EE" strokeWidth={2} dot={{ r: 4, fill: '#4361EE' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            At least two months of data are needed to show net worth trend.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

// --- Settings Tab ---
interface SettingsTabProps {
    categories: Category[];
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onExport: () => void;
    onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    // Google Drive props
    gapiReady: boolean;
    isSignedIn: boolean;
    isDriveLoading: boolean;
    driveError: string | null;
    driveSuccess: string | null;
    onSignIn: () => void;
    onSignOut: () => void;
    onBackup: () => void;
    onRestore: () => void;
}

const SettingsTab = ({ 
    categories, setCategories, isDarkMode, toggleDarkMode, onExport, onImport,
    gapiReady, isSignedIn, isDriveLoading, driveError, driveSuccess,
    onSignIn, onSignOut, onBackup, onRestore 
}: SettingsTabProps) => {
    
    const importInputRef = React.useRef<HTMLInputElement>(null);
    const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

    const addCategory = (name: string, type: TransactionType) => {
        if (name && !categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            setCategories(prev => [...prev, {id: Date.now().toString(), name, type}]);
        }
    };
    
    const deleteCategory = (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    const handleAddCategory = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const type = formData.get('type') as TransactionType;
        addCategory(name, type);
        e.currentTarget.reset();
    }
    
    const DriveButton = ({ onClick, disabled, children, className = '' }: { onClick: () => void; disabled: boolean; children?: React.ReactNode; className?: string }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex-1 text-center px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold transition-all transform active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <h2 className="text-lg font-semibold mb-4">General</h2>
                 <div className="flex justify-between items-center">
                    <span>Dark Mode</span>
                    <button onClick={toggleDarkMode} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isDarkMode ? 'bg-primary-DEFAULT' : 'bg-gray-200'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                </div>
            </Card>
            
            <Card className="p-4">
                <h2 className="text-lg font-semibold mb-4">Google Drive Sync</h2>
                {!gapiReady ? (
                     <p className="text-center text-gray-500">Initializing Google Services...</p>
                ) : !isSignedIn ? (
                    <div className="text-center">
                        <p className="mb-4 text-gray-600 dark:text-gray-400">Sign in to backup and restore your data.</p>
                        <button onClick={onSignIn} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center w-full max-w-xs mx-auto">
                            <Icon name="google" className="mr-3"/>
                            Sign in with Google
                        </button>
                        <p className="text-xs text-gray-400 mt-2">The app will only access files it creates.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-green-600 dark:text-green-400 font-semibold">Signed in to Google Drive</p>
                             <button onClick={onSignOut} className="text-sm text-gray-500 hover:text-danger">Sign Out</button>
                        </div>
                        <div className="flex space-x-4">
                            <DriveButton onClick={onBackup} disabled={isDriveLoading}>
                                {isDriveLoading ? <Icon name="arrow-repeat" className="animate-spin mr-2"/> : <Icon name="cloud-arrow-up" className="mr-2"/>}
                                Backup
                            </DriveButton>
                             <DriveButton onClick={onRestore} disabled={isDriveLoading}>
                                {isDriveLoading ? <Icon name="arrow-repeat" className="animate-spin mr-2"/> : <Icon name="cloud-arrow-down" className="mr-2"/>}
                                Restore
                            </DriveButton>
                        </div>
                    </div>
                )}
                {driveError && <p className="text-center text-danger mt-4">{driveError}</p>}
                {driveSuccess && <p className="text-center text-success mt-4">{driveSuccess}</p>}
            </Card>

             <Card className="p-4">
                <h2 className="text-lg font-semibold mb-4">Local Data Management</h2>
                <div className="flex space-x-4">
                    <button onClick={onExport} className="flex-1 text-center px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform active:scale-95 duration-200">
                        <Icon name="box-arrow-up-right" className="mr-2"/>
                        Export Data
                    </button>
                    <button onClick={() => importInputRef.current?.click()} className="flex-1 text-center px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform active:scale-95 duration-200">
                       <Icon name="box-arrow-in-down-left" className="mr-2"/>
                        Import Data
                    </button>
                    <input type="file" ref={importInputRef} accept=".json" className="hidden" onChange={onImport} />
                </div>
            </Card>
            <Card className="p-4 transition-all duration-300">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}>
                    <h2 className="text-lg font-semibold">Manage Categories</h2>
                    <Icon name="chevron-down" className={`transition-transform duration-300 ${isCategoriesOpen ? 'rotate-180' : ''}`} />
                </div>
                 <div className={`grid transition-all duration-500 ease-in-out ${isCategoriesOpen ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                        <form onSubmit={handleAddCategory} className="flex space-x-2 mb-4">
                            <input name="name" placeholder="New category name" required className="flex-grow p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none"/>
                            <select name="type" className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none">
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                            </select>
                            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-DEFAULT text-white font-semibold transition-all transform active:scale-95 duration-200">Add</button>
                        </form>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                    <div>
                                        <span>{cat.name}</span>
                                        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${cat.type === 'income' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>{cat.type}</span>
                                    </div>
                                    <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-danger"><Icon name="trash"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            </Card>
        </div>
    );
};

// --- Planner: Projection Summary Component ---
interface ProjectionSummaryProps {
    data: { income: number; expenses: number; balance: number };
    currency: string;
    dateFilter: { month: number; year: number };
    setDateFilter: React.Dispatch<React.SetStateAction<{ month: number; year: number }>>;
}

const ProjectionSummary = ({ data, currency, dateFilter, setDateFilter }: ProjectionSummaryProps) => {
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    const handlePrevMonth = () => {
        setDateFilter(current => {
            const newDate = new Date(current.year, current.month - 2, 1);
            return { month: newDate.getMonth() + 1, year: newDate.getFullYear() };
        });
    };

    const handleNextMonth = () => {
        setDateFilter(current => {
            const newDate = new Date(current.year, current.month, 1);
            return { month: newDate.getMonth() + 1, year: newDate.getFullYear() };
        });
    };

    return (
        <>
            <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Projection</h2>
                    <div className="flex items-center justify-center bg-primary-DEFAULT/10 dark:bg-dark-bg rounded-full transition-colors flex-shrink-0">
                        <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-DEFAULT/20 dark:hover:bg-white/10" aria-label="Previous month"><Icon name="chevron-left" /></button>
                        <button onClick={() => setIsMonthPickerOpen(true)} className="py-2 w-32 text-center" aria-label="Select month">
                            <span className="font-semibold text-primary-dark dark:text-primary-light tabular-nums whitespace-nowrap">
                                {new Date(dateFilter.year, dateFilter.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                        </button>
                        <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-DEFAULT/20 dark:hover:bg-white/10" aria-label="Next month"><Icon name="chevron-right" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <AnimatedStat label="Income" value={data.income} currency={currency} className="text-success" />
                    <AnimatedStat label="Expenses" value={data.expenses} currency={currency} className="text-danger" />
                    <AnimatedStat label="Balance" value={data.balance} currency={currency} className={data.balance >= 0 ? 'text-primary-DEFAULT' : 'text-warning'} />
                </div>
            </Card>
             {isMonthPickerOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in" onClick={() => setIsMonthPickerOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <MonthYearPicker
                            currentDate={dateFilter}
                            onSelect={(month, year) => {
                                setDateFilter({ month, year });
                                setIsMonthPickerOpen(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
};


// --- Planner: Month Accordion Component ---
interface MonthAccordionProps {
    monthKey: string;
    transactions: FutureTransaction[];
    currency: string;
    onViewOrEdit: (ftx: FutureTransaction) => void;
    expandedMonth: string | null;
    setExpandedMonth: React.Dispatch<React.SetStateAction<string | null>>;
}

const MonthAccordion: React.FC<MonthAccordionProps> = ({ monthKey, transactions, currency, onViewOrEdit, expandedMonth, setExpandedMonth }) => {
    const isExpanded = expandedMonth === monthKey;
    const [year, month] = monthKey.split('-').map(Number);
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const income = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');

    const content = useMemo(() => (
        isExpanded ? (
            <div className="p-4 border-t border-white/20 space-y-4 animate-fade-in [animation-duration:500ms]">
                {income.length > 0 && (
                    <Card className="p-4 bg-white/40 dark:bg-dark-bg/60">
                        <h4 className="font-semibold text-md mb-2 text-success/80">Income</h4>
                        <div className="space-y-1">
                            {income.map(ftx => (
                                <div key={ftx.id} onClick={() => onViewOrEdit(ftx)} className="flex justify-between items-center p-2 rounded-lg cursor-pointer hover:bg-gray-100/50 dark:hover:bg-dark-card/50">
                                    <div>
                                        <p className="font-medium">{ftx.description}</p>
                                        <p className="text-sm text-gray-500 capitalize">
                                            {ftx.category ? `${ftx.category} • ` : ''}
                                            {ftx.frequency}
                                        </p>
                                    </div>
                                    <p className="font-bold text-success">+{ftx.amount.toLocaleString()} {currency}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
                {expenses.length > 0 && (
                     <Card className="p-4 bg-white/40 dark:bg-dark-bg/60">
                        <h4 className="font-semibold text-md mb-2 text-danger/80">Expenses</h4>
                         <div className="space-y-1">
                            {expenses.map(ftx => (
                                <div key={ftx.id} onClick={() => onViewOrEdit(ftx)} className="flex justify-between items-center p-2 rounded-lg cursor-pointer hover:bg-gray-100/50 dark:hover:bg-dark-card/50">
                                    <div>
                                        <p className="font-medium">{ftx.description}</p>
                                        <p className="text-sm text-gray-500 capitalize">
                                            {ftx.category ? `${ftx.category} • ` : ''}
                                            {ftx.frequency}
                                        </p>
                                    </div>
                                    <p className="font-bold text-danger">-{ftx.amount.toLocaleString()} {currency}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
                 {income.length === 0 && expenses.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No items planned for this month.</p>
                 )}
            </div>
        ) : null
    ), [isExpanded, income, expenses, currency, onViewOrEdit]);

    return (
        <Card className="p-0 overflow-hidden transition-shadow hover:shadow-xl">
            <div 
                onClick={() => setExpandedMonth(isExpanded ? null : monthKey)} 
                className="flex justify-between items-center cursor-pointer p-4"
            >
                <h3 className="font-semibold text-lg">{monthName}</h3>
                <Icon name="chevron-down" className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            <AnimatedHeightContainer>
                {content}
            </AnimatedHeightContainer>
        </Card>
    );
};

// --- Planner Tab ---
interface PlannerTabProps {
    groupedTransactions: { monthKey: string; transactions: FutureTransaction[] }[];
    currency: string;
    onAdd: () => void;
    onViewOrEdit: (ftx: FutureTransaction) => void;
    activePlannerTab: string;
    setActivePlannerTab: (tab: string) => void;
    onAddToPlanner: (result: any, inputs: SalaryCalculationDetails) => void;
    initialCalculation: SalaryCalculationDetails | null;
    projectedData: { income: number; expenses: number; balance: number };
    plannerDateFilter: { month: number; year: number };
    setPlannerDateFilter: React.Dispatch<React.SetStateAction<{ month: number; year: number }>>;
}

const PlannerTab = ({ groupedTransactions, currency, onAdd, onViewOrEdit, activePlannerTab, setActivePlannerTab, onAddToPlanner, initialCalculation, projectedData, plannerDateFilter, setPlannerDateFilter }: PlannerTabProps) => {
    
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    // When planner tab becomes active, expand the first month with items by default
    useEffect(() => {
        if(activePlannerTab === 'planner' && groupedTransactions.length > 0) {
            setExpandedMonth(groupedTransactions[0].monthKey);
        }
    }, [activePlannerTab, groupedTransactions]);
    
    const plannerItems = useMemo(() => {
        return groupedTransactions.length > 0 ? (
            groupedTransactions.map(({ monthKey, transactions }) => (
                <MonthAccordion
                    key={monthKey}
                    monthKey={monthKey}
                    transactions={transactions}
                    currency={currency}
                    onViewOrEdit={onViewOrEdit}
                    expandedMonth={expandedMonth}
                    setExpandedMonth={setExpandedMonth}
                />
            ))
        ) : (
            <Card className="p-8 text-center text-gray-500">
                No items planned for the next 12 months.
            </Card>
        );
    }, [groupedTransactions, currency, onViewOrEdit, expandedMonth, setExpandedMonth]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2 rounded-lg p-1 bg-gray-200/50 dark:bg-dark-bg/80">
                <button onClick={() => setActivePlannerTab('planner')} className={`py-2 rounded-md font-semibold transition-all text-lg transform active:scale-95 duration-200 ${activePlannerTab === 'planner' ? 'bg-white dark:bg-dark-card shadow' : 'text-gray-500'}`}>Planner</button>
                <button onClick={() => setActivePlannerTab('calculator')} className={`py-2 rounded-md font-semibold transition-all text-lg transform active:scale-95 duration-200 ${activePlannerTab === 'calculator' ? 'bg-white dark:bg-dark-card shadow' : 'text-gray-500'}`}>Salary Calculator</button>
            </div>
            
            {activePlannerTab === 'planner' && (
                <div className="space-y-6 animate-fade-in">
                    <ProjectionSummary data={projectedData} currency={currency} dateFilter={plannerDateFilter} setDateFilter={setPlannerDateFilter} />

                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Planned Items</h2>
                        <button onClick={onAdd} className="bg-primary-dark hover:bg-primary-light text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 transition-all transform active:scale-95 duration-200">
                            <Icon name="plus" />
                            <span>Plan Item</span>
                        </button>
                    </div>
                    
                     <div className="space-y-4">
                        {plannerItems}
                    </div>
                </div>
            )}

            {activePlannerTab === 'calculator' && <SalaryCalculator currency={currency} onAddToPlanner={onAddToPlanner} initialCalculation={initialCalculation} />}
        </div>
    );
};

// --- Salary Calculator ---
interface SalaryCalculatorProps {
    currency: string;
    onAddToPlanner: (result: any, inputs: SalaryCalculationDetails) => void;
    initialCalculation: SalaryCalculationDetails | null;
}
const SalaryCalculator = ({ currency, onAddToPlanner, initialCalculation }: SalaryCalculatorProps) => {
    const [inputs, setInputs] = useState<SalaryCalculationDetails>({
        base: '', days: '30', unpaid: '', totalHours: '', kpi: ''
    });
    const [result, setResult] = useState<{ 
        net: number, 
        deduction: number, 
        otBonus: number, 
        kpiBonus: number,
        hourlyRate: number,
        overtimeHours: number,
    } | null>(null);

    const [isAdded, setIsAdded] = useState(false);

    useEffect(() => {
        if(initialCalculation) {
            setInputs(initialCalculation);
        }
    }, [initialCalculation])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numericFields = ['base', 'kpi'];

        if (numericFields.includes(name)) {
            const numericValue = value.replace(/[^0-9]/g, '');
            setInputs(prev => ({...prev, [name]: numericValue}));
        } else {
            setInputs(prev => ({...prev, [name]: value}));
        }
    };

    useEffect(() => {
        const base = parseFloat(inputs.base) || 0;
        const days = parseInt(inputs.days, 10) || 30;
        const unpaid = parseInt(inputs.unpaid, 10) || 0;
        const totalHours = parseFloat(inputs.totalHours) || 0;
        const kpi = parseFloat(inputs.kpi) || 0;

        if (base <= 0) {
            setResult(null);
            return;
        }
        
        const workingDays = days - 8;
        if (workingDays <= 0) {
            setResult(null);
            return;
        }

        const standardWorkingHours = workingDays * 9;
        const hourlyRate = standardWorkingHours > 0 ? base / standardWorkingHours : 0;
        const overtimeRate = hourlyRate; // 1x multiplier

        const overtimeHours = Math.max(0, totalHours - standardWorkingHours);
        const otBonus = overtimeHours * overtimeRate;
        
        const dailyRateForDeduction = base / days;
        const deduction = unpaid * dailyRateForDeduction;
        
        const kpiBonus = kpi;
        const net = base - deduction + otBonus + kpiBonus;

        setResult({ net, deduction, otBonus, kpiBonus, hourlyRate, overtimeHours });
        setIsAdded(false); // Reset button state on calculation change

    }, [inputs]);

    const formatInputValue = (value: string) => {
        if (!value) return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : num.toLocaleString();
    };

    const handleAddToPlanner = () => {
        if(result) {
            onAddToPlanner(result, inputs);
            setIsAdded(true);
            setTimeout(() => setIsAdded(false), 2000); // Reset after 2 seconds
        }
    }

    const dayOptions = ['28', '29', '30', '31'];

    return (
        <div className="space-y-6 animate-fade-in">
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Salary Calculator</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput 
                        label="Base Salary" 
                        id="base" 
                        name="base" 
                        type="text"
                        inputMode="numeric"
                        placeholder="30,000" 
                        value={formatInputValue(inputs.base)} 
                        onChange={handleInputChange} 
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Days in Month</label>
                        <div className="flex items-center justify-between space-x-2 rounded-lg p-1 bg-gray-100 dark:bg-dark-bg">
                            {dayOptions.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => setInputs(prev => ({ ...prev, days: day }))}
                                    className={`flex-1 py-2 rounded-md font-semibold transition-all text-sm transform active:scale-95 duration-200 ${
                                        inputs.days === day
                                            ? 'bg-white dark:bg-dark-card text-primary-DEFAULT dark:text-primary-light shadow'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-dark-card/50'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                    <FormInput label="Unpaid Days Off" id="unpaid" name="unpaid" type="number" value={inputs.unpaid} onChange={handleInputChange} placeholder="0"/>
                    <FormInput 
                        label={`KPI Bonus (${currency})`} 
                        id="kpi" 
                        name="kpi" 
                        type="text"
                        inputMode="numeric"
                        placeholder="5,000"
                        value={formatInputValue(inputs.kpi)} 
                        onChange={handleInputChange}
                    />
                    <FormInput label="Total Hours Worked" id="totalHours" name="totalHours" type="number" value={inputs.totalHours} onChange={handleInputChange} placeholder="e.g., 220" />
                </div>
            </Card>

            {result && (
                <Card className="p-6 pb-6">
                    <h3 className="text-lg font-semibold mb-4">Calculation Breakdown</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-gray-500">Base Salary</span> <span className="font-semibold">{parseFloat(inputs.base || '0').toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Hourly Rate (9hr/day)</span> <span className="font-semibold">{result.hourlyRate.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Overtime Hours</span> <span className="font-semibold">{result.overtimeHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs</span></div>
                        <hr className="my-2 border-gray-200 dark:border-gray-700"/>
                        <div className="flex justify-between items-center text-danger"><span >Deductions ({inputs.unpaid} unpaid days)</span> <span className="font-semibold">-{result.deduction.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center text-success"><span >Overtime Bonus</span> <span className="font-semibold">+{result.otBonus.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center text-success"><span >KPI Bonus</span> <span className="font-semibold">+{result.kpiBonus.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <hr className="my-2 border-gray-200 dark:border-gray-700"/>
                        <div className="flex justify-between items-center text-xl"><span className="font-bold">Net Salary</span> <span className="font-extrabold text-primary-DEFAULT">{result.net.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                    </div>
                     <button
                        onClick={handleAddToPlanner}
                        disabled={isAdded}
                        className={`w-full py-3 px-4 rounded-lg mt-6 font-bold transition-all transform active:scale-95 duration-200 flex items-center justify-center space-x-2 ${
                            isAdded ? 'bg-success text-white' : 'bg-primary-dark hover:bg-primary-DEFAULT text-white'
                        }`}
                    >
                        <Icon name={isAdded ? 'check-circle' : 'plus-circle'} />
                        <span>{isAdded ? 'Added to Planner!' : 'Add to Planner'}</span>
                    </button>
                </Card>
            )}
        </div>
    );
};


// --- Future Transaction Form Modal ---
interface FutureTransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<FutureTransaction, 'id'> | FutureTransaction) => void;
  onDelete: (id: string) => void;
  transaction?: FutureTransaction | null;
  currency: string;
  categories: Category[];
}

const FutureTransactionFormModal = ({ isOpen, onClose, onSave, onDelete, transaction, currency, categories }: FutureTransactionFormModalProps) => {
    const [type, setType] = useState<PlannerItemType>(transaction?.type || 'expense');
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [startDate, setStartDate] = useState(transaction?.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(transaction?.endDate || '');
    const [isCalendarOpen, setIsCalendarOpen] = useState<'start' | 'end' | null>(null);
    const [frequency, setFrequency] = useState<PlannerFrequency>(transaction?.frequency || 'monthly');

    useEffect(() => {
        if(transaction) {
            setType(transaction.type);
            setStartDate(transaction.startDate);
            setEndDate(transaction.endDate || '');
            setFrequency(transaction.frequency);
        } else {
            // Reset for new
            setType('expense');
            setStartDate(new Date().toISOString().split('T')[0]);
            setEndDate('');
            setFrequency('monthly');
        }
    }, [transaction]);

    useEffect(() => {
        setFilteredCategories(categories.filter(c => c.type === type));
    }, [type, categories]);
    
    const defaultCategory = transaction?.category || filteredCategories[0]?.name;

    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => { onClose(); setIsAnimatingOut(false); }, 200);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: Omit<FutureTransaction, 'id'> = {
            description: formData.get('description') as string,
            amount: parseFloat(formData.get('amount') as string),
            type,
            frequency,
            startDate,
            endDate: frequency === 'one-time' ? startDate : (endDate || undefined),
            category: formData.get('category') as string,
        };
        onSave(transaction ? { ...data, id: transaction.id } : data);
    };

    const handleDelete = () => {
        if (transaction && window.confirm('Are you sure you want to delete this planned item?')) {
            onDelete(transaction.id);
        }
    };
    
    if (!isOpen) return null;

    return (
    <div className="fixed inset-0 bg-gray-500/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
        <Card className={`w-full max-w-md ${isAnimatingOut ? 'animate-scale-out-center' : 'animate-scale-in-center'}`} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{transaction ? 'Edit Plan' : 'New Plan'}</h2>
                    <button type="button" onClick={handleClose}><Icon name="x-lg" /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 rounded-lg p-1 bg-gray-200 dark:bg-dark-bg">
                        <button type="button" onClick={() => setType('expense')} className={`py-2 rounded-md font-semibold transition-all ${type === 'expense' ? 'bg-danger/20 text-danger' : ''}`}>Expense</button>
                        <button type="button" onClick={() => setType('income')} className={`py-2 rounded-md font-semibold transition-all ${type === 'income' ? 'bg-success/20 text-success' : ''}`}>Income</button>
                    </div>
                    <FormInput label="Amount" id="amount" name="amount" type="number" step="0.01" defaultValue={transaction?.amount || ''} required placeholder={`0.00 ${currency}`} />
                    <FormInput label="Description" id="description" name="description" type="text" defaultValue={transaction?.description || ''} required />
                    <div>
                        <label htmlFor="future-category" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                        <div className="relative">
                            <select 
                                id="future-category" 
                                name="category"
                                defaultValue={defaultCategory}
                                required 
                                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card border-transparent appearance-none focus:ring-2 focus:ring-primary-DEFAULT focus:outline-none pr-8"
                            >
                              {filteredCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <Icon name="chevron-down" className="absolute right-4 top-3.5 text-gray-400 pointer-events-none"/>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="frequency" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Frequency</label>
                         <div className="relative">
                            <select id="frequency" name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as PlannerFrequency)} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card border-transparent appearance-none focus:ring-2 focus:ring-primary-DEFAULT focus:outline-none pr-8">
                                <option value="one-time">One-Time</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                             <Icon name="chevron-down" className="absolute right-4 top-3.5 text-gray-400 pointer-events-none"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{frequency === 'one-time' ? 'Date' : 'Start Date'}</label>
                        <button type="button" onClick={() => setIsCalendarOpen('start')} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card text-left">{new Date(startDate + 'T00:00:00').toLocaleDateString()}</button>
                    </div>
                     {frequency !== 'one-time' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">End Date (Optional)</label>
                            <button type="button" onClick={() => setIsCalendarOpen('end')} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-card text-left">{endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString() : 'No end date'}</button>
                        </div>
                    )}
                    <div className="flex items-center space-x-4 pt-2">
                        {transaction && <button type="button" onClick={handleDelete} className="px-4 py-3 rounded-lg text-danger bg-danger/10 font-bold"><Icon name="trash" /> Delete</button>}
                        <button type="submit" className="w-full py-3 rounded-lg bg-primary-dark text-white font-bold">{transaction ? 'Save Changes' : 'Save Plan'}</button>
                    </div>
                </div>
            </form>
        </Card>
        {isCalendarOpen && (
            <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center" onClick={() => setIsCalendarOpen(null)}>
                <div onClick={(e) => e.stopPropagation()}>
                    <Calendar selectedDate={isCalendarOpen === 'start' ? startDate : (endDate || startDate)} onDateSelect={(d) => {
                        if (isCalendarOpen === 'start') setStartDate(d);
                        else setEndDate(d);
                        setIsCalendarOpen(null);
                    }} />
                </div>
            </div>
        )}
    </div>
    );
};


// --- Select Month for Salary Modal ---
interface SelectMonthForSalaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (month: number, year: number) => void;
}
const SelectMonthForSalaryModal = ({ isOpen, onClose, onSave }: SelectMonthForSalaryModalProps) => {
    const [date, setDate] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    
    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => { onClose(); setIsAnimatingOut(false); }, 200);
    };

    const handleSave = () => {
        onSave(date.month, date.year);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <Card className={`w-full max-w-xs ${isAnimatingOut ? 'animate-scale-out-center' : 'animate-scale-in-center'}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-4">
                    <h2 className="text-xl font-bold text-center mb-4">Select Month</h2>
                    <MonthYearPicker currentDate={date} onSelect={(m, y) => setDate({ month: m, year: y })} />
                    <button onClick={handleSave} className="mt-4 w-full py-3 rounded-lg bg-primary-dark text-white font-bold">
                        Save to Planner
                    </button>
                </div>
            </Card>
        </div>
    );
};


// --- Calculation Detail Modal ---
interface CalculationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    transaction: FutureTransaction;
    currency: string;
}
const CalculationDetailModal = ({ isOpen, onClose, onEdit, transaction, currency }: CalculationDetailModalProps) => {
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    
    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => { onClose(); setIsAnimatingOut(false); }, 200);
    };
    
    const { calculationDetails, amount } = transaction;

    if (!isOpen || !calculationDetails) return null;

    // Re-run calculation for display
    const base = parseFloat(calculationDetails.base) || 0;
    const days = parseInt(calculationDetails.days, 10) || 30;
    const unpaid = parseInt(calculationDetails.unpaid, 10) || 0;
    const totalHours = parseFloat(calculationDetails.totalHours) || 0;
    const kpi = parseFloat(calculationDetails.kpi) || 0;

    const workingDays = days - 8;
    const standardWorkingHours = workingDays * 9;
    const hourlyRate = standardWorkingHours > 0 ? base / standardWorkingHours : 0;
    const overtimeRate = hourlyRate;
    const overtimeHours = Math.max(0, totalHours - standardWorkingHours);
    const otBonus = overtimeHours * overtimeRate;
    const dailyRateForDeduction = base / days;
    const deduction = unpaid * dailyRateForDeduction;
    const kpiBonus = kpi;

    return (
        <div className="fixed inset-0 bg-gray-500/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <Card className={`w-full max-w-md ${isAnimatingOut ? 'animate-scale-out-center' : 'animate-scale-in-center'}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Salary Breakdown</h2>
                        <button type="button" onClick={handleClose}><Icon name="x-lg" /></button>
                    </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-gray-500">Base Salary</span> <span className="font-semibold">{base.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Hourly Rate (9hr/day)</span> <span className="font-semibold">{hourlyRate.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Overtime Hours</span> <span className="font-semibold">{overtimeHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs</span></div>
                        <hr className="my-2 border-gray-200 dark:border-gray-700"/>
                        <div className="flex justify-between items-center text-danger"><span >Deductions ({unpaid} unpaid days)</span> <span className="font-semibold">-{deduction.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center text-success"><span >Overtime Bonus</span> <span className="font-semibold">+{otBonus.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <div className="flex justify-between items-center text-success"><span >KPI Bonus</span> <span className="font-semibold">+{kpiBonus.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                        <hr className="my-2 border-gray-200 dark:border-gray-700"/>
                        <div className="flex justify-between items-center text-xl"><span className="font-bold">Net Salary</span> <span className="font-extrabold text-primary-DEFAULT">{amount.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span></div>
                    </div>
                    <button onClick={onEdit} className="mt-6 w-full py-3 rounded-lg bg-primary-dark/20 text-primary-dark dark:bg-primary-light/20 dark:text-primary-light font-bold">
                        Edit Calculation
                    </button>
                </div>
            </Card>
        </div>
    );
};
