export type TransactionType = "income" | "expense";
export type TransactionFrequency = "weekly" | "monthly" | "yearly";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod?: string;
  notes?: string;
  recurrence?: TransactionFrequency;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly";
  nextDate: string;
}

export const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateOnly = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getTodayDate = (): string => formatDateOnly(new Date());

export const getMonthStart = (referenceDate: Date, monthOffset = 0): Date =>
  new Date(referenceDate.getFullYear(), referenceDate.getMonth() + monthOffset, 1);

const offsetDate = (dayOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return formatDateOnly(date);
};

const offsetMonthDate = (monthOffset: number, day: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthOffset, day);
  return formatDateOnly(date);
};

export const defaultTransactions: Transaction[] = [
  { id: "txn-1", type: "income", amount: 28000, category: "Salary", description: "September salary", date: offsetDate(-18) },
  { id: "txn-2", type: "income", amount: 4200, category: "Freelance", description: "Website design project", date: offsetDate(-10) },
  { id: "txn-3", type: "expense", amount: 980, category: "Food", description: "Groceries and meal prep", date: offsetDate(-22) },
  { id: "txn-4", type: "expense", amount: 760, category: "Transport", description: "Metro card top-up", date: offsetDate(-14) },
  { id: "txn-5", type: "expense", amount: 1400, category: "Housing", description: "Rent payment", date: offsetDate(-7) },
  { id: "txn-6", type: "expense", amount: 650, category: "Entertainment", description: "Streaming + movies", date: offsetDate(-6) },
  { id: "txn-7", type: "expense", amount: 320, category: "Food", description: "Dinner out", date: offsetDate(-4) },
  { id: "txn-8", type: "expense", amount: 250, category: "Education", description: "Course materials", date: offsetDate(-2) },
  { id: "txn-9", type: "expense", amount: 410, category: "Shopping", description: "Household supplies", date: offsetDate(-1) },
  { id: "txn-10", type: "expense", amount: 1200, category: "Utilities", description: "Internet + electricity", date: offsetDate(0) },
  { id: "txn-11", type: "expense", amount: 560, category: "Transport", description: "Ride share and fuel", date: offsetDate(2) },
  { id: "txn-12", type: "expense", amount: 880, category: "Food", description: "Weekend groceries", date: offsetMonthDate(-1, 12) },
  { id: "txn-13", type: "expense", amount: 690, category: "Transport", description: "Travel card recharge", date: offsetMonthDate(-1, 17) },
  { id: "txn-14", type: "expense", amount: 1600, category: "Housing", description: "Rent payment", date: offsetMonthDate(-1, 1) },
  { id: "txn-15", type: "income", amount: 27000, category: "Salary", description: "August salary", date: offsetMonthDate(-1, 25) },
  { id: "txn-16", type: "expense", amount: 2150, category: "Food", description: "Monthly grocery run", date: offsetMonthDate(-2, 8) },
  { id: "txn-17", type: "expense", amount: 950, category: "Transport", description: "Commute card", date: offsetMonthDate(-2, 12) },
  { id: "txn-18", type: "expense", amount: 500, category: "Entertainment", description: "Concert tickets", date: offsetMonthDate(-2, 18) },
  { id: "txn-19", type: "income", amount: 28000, category: "Salary", description: "July salary", date: offsetMonthDate(-2, 29) },
];

export const defaultGoals: Goal[] = [
  { id: "goal-1", name: "Emergency Fund", targetAmount: 20000, currentAmount: 7500, deadline: offsetMonthDate(5, 10) },
  { id: "goal-2", name: "New Laptop", targetAmount: 45000, currentAmount: 22000, deadline: offsetMonthDate(8, 15) },
  { id: "goal-3", name: "Trip to Europe", targetAmount: 80000, currentAmount: 18000, deadline: offsetMonthDate(9, 20) },
];

export const defaultRecurringPayments: RecurringPayment[] = [
  { id: "rec-1", name: "Mobile plan", amount: 399, frequency: "monthly", nextDate: offsetDate(9) },
  { id: "rec-2", name: "Netflix", amount: 199, frequency: "monthly", nextDate: offsetDate(14) },
  { id: "rec-3", name: "Gym membership", amount: 1100, frequency: "monthly", nextDate: offsetDate(24) },
  { id: "rec-4", name: "Insurance", amount: 4200, frequency: "yearly", nextDate: offsetMonthDate(2, 5) },
];

export const getTotalIncome = (transactions: Transaction[]) => transactions.filter((t) => t.type === "income").reduce((sum, item) => sum + item.amount, 0);

export const getTotalExpenses = (transactions: Transaction[]) => transactions.filter((t) => t.type === "expense").reduce((sum, item) => sum + item.amount, 0);

export const getIncomeByCategory = (transactions: Transaction[]) => {
  const totals = new Map<string, number>();
  transactions.filter((t) => t.type === "income").forEach((transaction) => {
    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
  });

  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

export const getRemainingBalance = (transactions: Transaction[]) => getTotalIncome(transactions) - getTotalExpenses(transactions);

export const getExpensesByCategory = (transactions: Transaction[]) => {
  const totals = new Map<string, number>();
  transactions.filter((t) => t.type === "expense").forEach((transaction) => {
    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
  });

  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

export const getLargestExpense = (transactions: Transaction[]) => {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (!expenses.length) return null;
  return expenses.reduce((largest, item) => (item.amount > largest.amount ? item : largest), expenses[0]);
};

export const getAverageDailySpending = (transactions: Transaction[]) => {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (!expenses.length) return 0;
  const dates = expenses.map((item) => parseDateOnly(item.date).getTime()).sort((a, b) => a - b);
  if (!dates.length) return 0;
  const spanMs = Math.max(1, dates[dates.length - 1] - dates[0]);
  const days = Math.max(1, Math.ceil(spanMs / (1000 * 60 * 60 * 24)) + 1);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  return total / days;
};

export const getThisMonthExpenses = (transactions: Transaction[], referenceDate = new Date()) => {
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();

  return transactions.filter((transaction) => {
    if (transaction.type !== "expense") return false;
    return transaction.date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`;
  }).reduce((sum, item) => sum + item.amount, 0);
};

export const getThisMonthIncome = (transactions: Transaction[], referenceDate = new Date()) => {
  const monthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  return transactions.filter((transaction) => transaction.type === "income" && transaction.date.slice(0, 7) === monthKey)
    .reduce((sum, item) => sum + item.amount, 0);
};

export const getPreviousMonthExpenses = (transactions: Transaction[], referenceDate = new Date()) => {
  const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  return getThisMonthExpenses(transactions, previousMonthDate);
};

export const getForecastRange = (transactions: Transaction[]) => {
  const monthMap = new Map<string, number>();

  transactions.filter((item) => item.type === "expense").forEach((item) => {
    const monthKey = item.date.slice(0, 7);
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + item.amount);
  });

  const monthlyExpenses = Array.from(monthMap.values()).sort((a, b) => a - b);
  if (!monthlyExpenses.length) {
    return { average: 0, min: 0, max: 0, months: 0 };
  }

  const average = monthlyExpenses.reduce((sum, amount) => sum + amount, 0) / monthlyExpenses.length;
  const min = average * 0.92;
  const max = average * 1.08;

  return { average, min, max, months: monthlyExpenses.length };
};

export const getGoalProgress = (goal: Goal) => {
  const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  return {
    percentage: Math.min(percentage, 100),
    remaining: Math.max(goal.targetAmount - goal.currentAmount, 0),
  };
};

export const getRequiredMonthlySaving = (goal: Goal) => {
  const targetDate = parseDateOnly(goal.deadline);
  const today = new Date();
  const monthsLeft = Math.max(1, targetDate.getMonth() - today.getMonth() + (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getDate() >= today.getDate() ? 0 : 1));
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  return remaining / monthsLeft;
};

export const getRecurringMonthlyCost = (payments: RecurringPayment[]) => {
  return payments.reduce((sum, payment) => {
    if (payment.frequency === "weekly") return sum + payment.amount * 4.33;
    if (payment.frequency === "yearly") return sum + payment.amount / 12;
    return sum + payment.amount;
  }, 0);
};

export const getTransactionsForMonth = (transactions: Transaction[], monthOffset = 0) => {
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  return transactions.filter((transaction) => {
    return transaction.date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`;
  });
};

export const getComparisonText = (current: number, previous: number) => {
  if (previous <= 0) return "Not enough data yet";
  const change = ((current - previous) / previous) * 100;
  return `${Math.abs(change).toFixed(0)}% ${change >= 0 ? "higher" : "lower"} than last month`;
};

export const getWeekdayWeekendComparison = (transactions: Transaction[]) => {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (!expenses.length) return { weekday: 0, weekend: 0 };

  const weekdayTotal = expenses.filter((item) => {
    const day = parseDateOnly(item.date).getDay();
    return day >= 1 && day <= 5;
  }).reduce((sum, item) => sum + item.amount, 0);

  const weekendTotal = expenses.filter((item) => {
    const day = parseDateOnly(item.date).getDay();
    return day === 0 || day === 6;
  }).reduce((sum, item) => sum + item.amount, 0);

  return { weekday: weekdayTotal, weekend: weekendTotal };
};
