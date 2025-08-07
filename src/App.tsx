import React, { useState, useEffect } from 'react';
import { Transaction, Budget } from './types';
import { saveTransactions, loadTransactions, saveBudgets, loadBudgets } from './utils/storage';
import { generateId } from './utils/calculations';

import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import SavingsDashboard from './components/SavingsDashboard';
import InvestmentsDashboard from './components/InvestmentsDashboard';
import AddTransaction from './components/AddTransaction';
import TransactionHistory from './components/TransactionHistory';
import BudgetSettings from './components/BudgetSettings';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Load data on app start
  useEffect(() => {
    const loadedTransactions = loadTransactions();
    const loadedBudgets = loadBudgets();
    
    setTransactions(loadedTransactions);
    setBudgets(loadedBudgets);
  }, []);

  // Save transactions whenever they change
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  // Save budgets whenever they change
  useEffect(() => {
    saveBudgets(budgets);
  }, [budgets]);

  const handleAddTransaction = (transaction: Transaction) => {
    setTransactions(prev => [...prev, transaction]);
  };

  const handleBulkImport = (importedTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...importedTransactions]);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEditTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
  };

  const handleUpdateBudgets = (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
  };

  const handleLoadSampleData = (sampleTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...sampleTransactions]);
  };

  const handleLoadSampleBudgets = (sampleBudgets: Budget[]) => {
    setBudgets(prev => [...prev, ...sampleBudgets]);
  };
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard transactions={transactions} budgets={budgets} />;
      case 'savings':
        return <SavingsDashboard transactions={transactions} />;
      case 'investments':
        return <InvestmentsDashboard transactions={transactions} />;
      case 'add-transaction':
        return (
          <AddTransaction 
            onAddTransaction={handleAddTransaction}
            onBulkImport={handleBulkImport}
            transactions={transactions}
            onLoadSampleData={handleLoadSampleData}
            onLoadSampleBudgets={handleLoadSampleBudgets}
          />
        );
      case 'history':
        return (
          <TransactionHistory 
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
          />
        );
      case 'budget-settings':
        return (
          <BudgetSettings 
            budgets={budgets}
            onUpdateBudgets={handleUpdateBudgets}
          />
        );
      default:
        return <Dashboard transactions={transactions} budgets={budgets} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      <main className="pb-8">
        {renderView()}
      </main>
    </div>
  );
}

export default App;