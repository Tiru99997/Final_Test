import { Transaction } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { generateId } from './calculations';

// Sample descriptions for different expense categories
const SAMPLE_DESCRIPTIONS = {
  'Leisure': {
    'Clothes': ['New shirt from H&M', 'Winter jacket', 'Running shoes', 'Jeans', 'Dress for party'],
    'Entertainment': ['Movie tickets', 'Concert tickets', 'Netflix subscription', 'Video game', 'Book purchase'],
    'Vacation': ['Flight to Paris', 'Hotel booking', 'Car rental', 'Travel insurance', 'Souvenirs'],
    'Gifts': ['Birthday gift for mom', 'Wedding present', 'Christmas gifts', 'Anniversary gift', 'Baby shower gift'],
    'Cigarette': ['Pack of cigarettes', 'Cigarettes from gas station', 'Weekly cigarette supply'],
    'Casino': ['Poker night', 'Slot machines', 'Blackjack game', 'Lottery tickets', 'Sports betting'],
    'Party': ['Birthday party supplies', 'New Year celebration', 'House party drinks', 'Party decorations'],
    'Maintenance': ['Car oil change', 'Home repairs', 'Bike maintenance', 'Phone screen repair'],
    'Netflix': ['Netflix monthly subscription'],
    'Disney Plus': ['Disney Plus monthly subscription'],
    'HBO': ['HBO Max subscription'],
    'Spotify': ['Spotify Premium subscription'],
    'AI subscriptions': ['ChatGPT Plus', 'Midjourney subscription', 'Claude Pro']
  },
  'Dining Out': {
    'Restaurant': ['Dinner at Italian place', 'Lunch with colleagues', 'Date night dinner', 'Family brunch', 'Thai takeout'],
    'Coffee': ['Morning coffee', 'Starbucks latte', 'Coffee with friends', 'Afternoon espresso'],
    'Sandwich': ['Subway lunch', 'Deli sandwich', 'Quick lunch break', 'Airport sandwich']
  },
  'Medical': {
    'Scans': ['MRI scan', 'X-ray examination', 'Ultrasound', 'CT scan'],
    'Medical Insurance': ['Monthly health insurance', 'Dental insurance premium'],
    'Physiotherapy': ['Physical therapy session', 'Sports injury treatment'],
    'Dental': ['Dental cleaning', 'Tooth filling', 'Dental checkup'],
    'Prescriptions': ['Antibiotics', 'Vitamins', 'Pain medication', 'Allergy medicine'],
    'GP': ['General practitioner visit', 'Annual checkup', 'Flu consultation'],
    'Blood test': ['Annual blood work', 'Cholesterol test', 'Diabetes screening'],
    'Hospital': ['Emergency room visit', 'Surgery', 'Hospital stay']
  },
  'Personal Development': {
    'Courses': ['Online programming course', 'Language learning app', 'Professional certification'],
    'Gym': ['Monthly gym membership', 'Personal trainer session', 'Yoga class']
  },
  'Transport': {
    'Taxi': ['Uber to airport', 'Late night taxi', 'Taxi to meeting', 'Weekend taxi ride'],
    'Bus': ['Monthly bus pass', 'City bus ticket', 'Long distance bus']
  },
  'Charity': {
    'Donation': ['Red Cross donation', 'Local food bank', 'Animal shelter donation', 'Disaster relief fund']
  },
  'Bills': {
    'Electricity': ['Monthly electricity bill'],
    'Gas': ['Monthly gas bill'],
    'Water': ['Quarterly water bill'],
    'Broadband': ['Internet service provider'],
    'Bins': ['Waste management fee']
  },
  'Savings': {
    'Long term saving': ['Retirement fund contribution', '401k contribution'],
    'Short term saving': ['Holiday fund deposit', 'Emergency fund'],
    'Investments': ['Stock purchase', 'Crypto investment', 'Mutual fund']
  },
  'Living Expenses': {
    'Grocery': ['Weekly groceries', 'Costco shopping', 'Fresh produce', 'Organic food shopping'],
    'Laundry': ['Laundromat', 'Dry cleaning', 'Detergent purchase'],
    'Inessentials': ['Snacks', 'Impulse purchase', 'Random shopping'],
    'Toiletries': ['Shampoo and soap', 'Toothpaste', 'Skincare products'],
    'Kitchen supplies': ['Cooking utensils', 'Food containers', 'Kitchen appliances']
  }
};

const INCOME_DESCRIPTIONS = {
  'Fixed Income': {
    'Salary': ['Monthly salary', 'Bi-weekly paycheck', 'Bonus payment', 'Overtime pay']
  },
  'Variable Income': {
    'Dividends': ['Stock dividends', 'Mutual fund dividends', 'REIT dividends'],
    'Casino profit': ['Poker winnings', 'Lottery prize', 'Sports betting win', 'Casino jackpot']
  }
};

// Generate random amount within a range
const getRandomAmount = (min: number, max: number): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

// Get random item from array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate random date within the last 6 months
const getRandomDate = (): Date => {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime);
};

// Generate random date for a specific month
const getRandomDateInMonth = (monthOffset: number): Date => {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0);
  
  const randomTime = targetMonth.getTime() + Math.random() * (nextMonth.getTime() - targetMonth.getTime());
  return new Date(randomTime);
};

// Get weighted random category (some categories should appear more frequently)
const getWeightedRandomCategory = (categories: string[]): string => {
  const weights: { [key: string]: number } = {
    'Living Expenses': 3, // Most frequent
    'Dining Out': 2.5,
    'Leisure': 2,
    'Transport': 2,
    'Bills': 1.5,
    'Medical': 1,
    'Personal Development': 0.8,
    'Charity': 0.5,
    'Savings': 1.2
  };
  
  const weightedCategories: string[] = [];
  categories.forEach(category => {
    const weight = weights[category] || 1;
    for (let i = 0; i < weight * 10; i++) {
      weightedCategories.push(category);
    }
  });
  
  return getRandomItem(weightedCategories);
};

// Generate sample expense transactions
const generateExpenseTransactions = (count: number, distributeAcrossMonths: boolean = true): Transaction[] => {
  const transactions: Transaction[] = [];
  const monthsToGenerate = distributeAcrossMonths ? 6 : 1;
  const transactionsPerMonth = Math.floor(count / monthsToGenerate);
  const remainder = count % monthsToGenerate;
  
  for (let month = 0; month < monthsToGenerate; month++) {
    const monthTransactionCount = transactionsPerMonth + (month < remainder ? 1 : 0);
    
    for (let i = 0; i < monthTransactionCount; i++) {
      const category = distributeAcrossMonths ? 
        getWeightedRandomCategory(Object.keys(EXPENSE_CATEGORIES)) : 
        getRandomItem(Object.keys(EXPENSE_CATEGORIES));
      
      const subcategory = getRandomItem(EXPENSE_CATEGORIES[category]);
      const descriptions = SAMPLE_DESCRIPTIONS[category as keyof typeof SAMPLE_DESCRIPTIONS]?.[subcategory] || ['Sample expense'];
      const description = getRandomItem(descriptions);
      
      // Set realistic amount ranges based on category and add some monthly variation
      let minAmount = 10;
      let maxAmount = 100;
      const monthlyVariation = 0.8 + (Math.random() * 0.4); // 80% to 120% variation
      
      switch (category) {
        case 'Leisure':
          if (subcategory === 'Vacation') {
            minAmount = 200;
            maxAmount = 2000;
          } else if (subcategory === 'Clothes') {
            minAmount = 25;
            maxAmount = 300;
          } else if (subcategory === 'Netflix' || subcategory === 'Disney Plus' || subcategory === 'HBO' || subcategory === 'Spotify') {
            minAmount = 8;
            maxAmount = 25; // Subscription services
          } else {
            minAmount = 10;
            maxAmount = 150;
          }
          break;
        case 'Dining Out':
          minAmount = 8;
          maxAmount = 80;
          break;
        case 'Medical':
          if (subcategory === 'Medical Insurance') {
            minAmount = 200;
            maxAmount = 500;
          } else if (subcategory === 'Hospital') {
            minAmount = 500;
            maxAmount = 5000;
          } else {
            minAmount = 30;
            maxAmount = 300;
          }
          break;
        case 'Bills':
          minAmount = 50;
          maxAmount = 300;
          break;
        case 'Savings':
          minAmount = 100;
          maxAmount = 2000;
          break;
        case 'Living Expenses':
          if (subcategory === 'Grocery') {
            minAmount = 50;
            maxAmount = 200;
          } else {
            minAmount = 15;
            maxAmount = 100;
          }
          break;
        case 'Transport':
          minAmount = 5;
          maxAmount = 50;
          break;
        default:
          minAmount = 20;
          maxAmount = 150;
      }
      
      // Apply monthly variation
      minAmount *= monthlyVariation;
      maxAmount *= monthlyVariation;
      
      transactions.push({
        id: generateId(),
        date: distributeAcrossMonths ? getRandomDateInMonth(month) : getRandomDate(),
        category,
        subcategory,
        amount: getRandomAmount(minAmount, maxAmount),
        description,
        type: 'expense'
      });
    }
  }
  
  return transactions;
};

// Generate sample income transactions
const generateIncomeTransactions = (count: number, distributeAcrossMonths: boolean = true): Transaction[] => {
  const transactions: Transaction[] = [];
  const monthsToGenerate = distributeAcrossMonths ? 6 : 1;
  const transactionsPerMonth = Math.floor(count / monthsToGenerate);
  const remainder = count % monthsToGenerate;
  
  for (let month = 0; month < monthsToGenerate; month++) {
    const monthTransactionCount = transactionsPerMonth + (month < remainder ? 1 : 0);
    
    for (let i = 0; i < monthTransactionCount; i++) {
      const category = getRandomItem(Object.keys(INCOME_CATEGORIES));
      const subcategory = getRandomItem(INCOME_CATEGORIES[category]);
      const descriptions = INCOME_DESCRIPTIONS[category as keyof typeof INCOME_DESCRIPTIONS]?.[subcategory] || ['Sample income'];
      const description = getRandomItem(descriptions);
      
      // Set realistic amount ranges based on subcategory with monthly variation
      let minAmount = 100;
      let maxAmount = 1000;
      const monthlyVariation = 0.9 + (Math.random() * 0.2); // 90% to 110% variation for income
      
      switch (subcategory) {
        case 'Salary':
          minAmount = 3000;
          maxAmount = 8000;
          break;
        case 'Dividends':
          minAmount = 50;
          maxAmount = 500;
          break;
        case 'Casino profit':
          minAmount = 20;
          maxAmount = 1000;
          break;
        default:
          minAmount = 100;
          maxAmount = 1000;
      }
      
      // Apply monthly variation
      minAmount *= monthlyVariation;
      maxAmount *= monthlyVariation;
      
      transactions.push({
        id: generateId(),
        date: distributeAcrossMonths ? getRandomDateInMonth(month) : getRandomDate(),
        category,
        subcategory,
        amount: getRandomAmount(minAmount, maxAmount),
        description,
        type: 'income'
      });
    }
  }
  
  return transactions;
};

// Generate complete sample dataset
export const generateSampleData = (expenseCount: number = 100, incomeCount: number = 50): Transaction[] => {
  const expenses = generateExpenseTransactions(expenseCount, true);
  const income = generateIncomeTransactions(incomeCount, true);
  
  // Combine and sort by date (newest first)
  return [...expenses, ...income].sort((a, b) => b.date.getTime() - a.date.getTime());
};

// Generate sample budgets for the current and previous months
export const generateSampleBudgets = () => {
  const budgets = [];
  const currentDate = new Date();
  
  // Generate budgets for current month and previous 5 months
  for (let monthOffset = 0; monthOffset <= 5; monthOffset++) {
    const budgetDate = new Date(currentDate);
    budgetDate.setMonth(budgetDate.getMonth() - monthOffset);
    const monthStr = budgetDate.toISOString().slice(0, 7); // YYYY-MM format
    
    // Add some variation to budgets across months
    const budgetVariation = 0.85 + (Math.random() * 0.3); // 85% to 115% variation
    
    // Income budgets
    budgets.push(
      { category: 'Fixed Income', amount: Math.round(5000 * budgetVariation), month: monthStr },
      { category: 'Variable Income', amount: Math.round(300 * budgetVariation), month: monthStr }
    );
    
    // Expense budgets
    budgets.push(
      { category: 'Leisure', amount: Math.round(500 * budgetVariation), month: monthStr },
      { category: 'Dining Out', amount: Math.round(300 * budgetVariation), month: monthStr },
      { category: 'Medical', amount: Math.round(200 * budgetVariation), month: monthStr },
      { category: 'Personal Development', amount: Math.round(150 * budgetVariation), month: monthStr },
      { category: 'Transport', amount: Math.round(100 * budgetVariation), month: monthStr },
      { category: 'Charity', amount: Math.round(100 * budgetVariation), month: monthStr },
      { category: 'Bills', amount: Math.round(800 * budgetVariation), month: monthStr },
      { category: 'Savings', amount: Math.round(1500 * budgetVariation), month: monthStr },
      { category: 'Living Expenses', amount: Math.round(600 * budgetVariation), month: monthStr }
    );
  }
  
  return budgets;
};