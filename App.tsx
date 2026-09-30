
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppThemeProvider, resolveThemeColors, useAppTheme, useMoneyFormatter, type ThemeColors } from "./src/theme/AppTheme";
import * as Linking from "expo-linking";

import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthScreen } from "./src/auth/AuthScreen";
import { ProfileModal } from "./src/auth/ProfileModal";
import {
  getExpensesByCategory,
  getForecastRange,
  getGoalProgress,
  getIncomeByCategory,
  getMonthStart,
  getPreviousMonthExpenses,
  getRecurringMonthlyCost,
  getRequiredMonthlySaving,
  getRemainingBalance,
  getThisMonthExpenses,
  getThisMonthIncome,
  getTotalExpenses,
  getTotalIncome,
  formatDateOnly,
  getTodayDate,
  parseDateOnly,
  type Goal,
  type RecurringPayment,
  type Transaction,
  type TransactionFrequency,
  type TransactionType,
} from "./src/data/finance";

const { width } = Dimensions.get("window");

const DEFAULT_COLORS = {
  bg: "#061321",
  panel: "#0B1D30",
  panel2: "#10263D",
  border: "#183750",
  text: "#F5F8FC",
  muted: "#8FA5BA",
  primary: "#6C63FF",
  cyan: "#25D9C2",
  green: "#3BE0A1",
  red: "#FF647C",
  orange: "#FF9B4A",
  blue: "#48A9FF",
};

type Tab =
  | "Home"
  | "Insights"
  | "Goals"
  | "Calendar"
  | "Transactions"
  | "SpendingHabits"
  | "Forecasts"
  | "WhatIf"
  | "Calculator"
  | "CurrencyConverter"
  | "RecurringPayments"
  | "ReceiptScanner";

const money = (value: number, currencyCode = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currencyCode} ${Math.round(value).toLocaleString("en-IN")}`;
  }
};
const yyyyMmDd = getTodayDate;
const dateLabel = (value: string) => parseDateOnly(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const categoryColors: Record<string, string> = {
  Food: DEFAULT_COLORS.orange,
  Transport: DEFAULT_COLORS.blue,
  Housing: DEFAULT_COLORS.primary,
  Entertainment: DEFAULT_COLORS.red,
  Education: DEFAULT_COLORS.green,
  Utilities: DEFAULT_COLORS.cyan,
  Shopping: DEFAULT_COLORS.primary,
  Salary: DEFAULT_COLORS.green,
  Freelance: DEFAULT_COLORS.cyan,
};

const expenseCategories = ["Food", "Transport", "Housing", "Education", "Utilities", "Shopping", "Entertainment", "Health", "Other"];
const incomeCategories = ["Scholarship", "Allowance", "Salary/Part-time work", "Freelance", "Family support", "Refund", "Gift", "Other"];
const paymentMethods = ["UPI", "Bank transfer", "Cash", "Card", "Digital wallet", "Other"];
const transactionFrequencies: TransactionFrequency[] = ["weekly", "monthly", "yearly"];

function IconButton({ icon, onPress }: { icon: any; onPress: () => void }) {
  const { colors: C, styles } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={20} color={C.text} />
    </Pressable>
  );
}

function ProfileAvatar({ uri, displayName, onPress, size = 38 }: { uri?: string | null; displayName: string; onPress: () => void; size?: number }) {
  const { colors: C, styles } = useAppTheme();
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open Profile & Account" onPress={onPress} style={[styles.profileAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} /> : initials ? <Text style={styles.profileAvatarInitials}>{initials}</Text> : <Ionicons name="person" size={size * 0.52} color={C.cyan} />}
    </Pressable>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { styles } = useAppTheme();
  return <View style={[styles.card, style]}>{children}</View>;
}

function Progress({ value, color }: { value: number; color?: string }) {
  const { colors: C, styles } = useAppTheme();
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color ?? C.cyan }]} />
    </View>
  );
}

function BottomNav({ tab, setTab, onAdd, bottomInset }: { tab: Tab; setTab: (tab: Tab) => void; onAdd: () => void; bottomInset: number }) {
  const { styles } = useAppTheme();
  return (
    <View style={[styles.bottomNav, { height: 76 + bottomInset, paddingBottom: bottomInset }]}>
      <NavItem icon="home" label="Home" active={tab === "Home"} onPress={() => setTab("Home")} />
      <NavItem icon="stats-chart" label="Insights" active={tab === "Insights" || tab === "SpendingHabits"} onPress={() => setTab("Insights")} />
      <Pressable onPress={onAdd} style={styles.addButton}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
      <NavItem icon="trophy-outline" label="Goals" active={tab === "Goals"} onPress={() => setTab("Goals")} />
      <NavItem icon="calendar-outline" label="Calendar" active={tab === "Calendar"} onPress={() => setTab("Calendar")} />
    </View>
  );
}

function NavItem({ icon, label, active, onPress }: { icon: any; label: string; active: boolean; onPress: () => void }) {
  const { colors: C, styles } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <Ionicons name={icon} size={21} color={active ? C.primary : C.muted} />
      <Text style={[styles.navLabel, active && { color: C.primary }]}>{label}</Text>
    </Pressable>
  );
}

function Header({ onMenu, onNotifications, onSettings, onAccount, userName, profilePictureUri }: any) {
  const { styles } = useAppTheme();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <IconButton icon="menu-outline" onPress={onMenu} />
        <View>
          <Text style={styles.eyebrow}>Good morning,</Text>
          <Text style={styles.title}>{userName} 👋</Text>
          <Text style={styles.subtitle}>Small steps. Big goals.</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <IconButton icon="notifications-outline" onPress={onNotifications} />
        <IconButton icon="settings-outline" onPress={onSettings} />
        <ProfileAvatar uri={profilePictureUri} displayName={userName} onPress={onAccount} />
      </View>
    </View>
  );
}

function HomeScreen({ transactions, setTab, onAdd, onMenu, onSettings, onAccount, userName, profilePictureUri, monthlyBudget, onSetBudget }: { transactions: Transaction[]; setTab: (tab: Tab) => void; onAdd: () => void; onMenu: () => void; onSettings: () => void; onAccount: () => void; userName: string; profilePictureUri?: string | null; monthlyBudget: number; onSetBudget: () => void }) {
  const { colors: C, styles } = useAppTheme();
  const money = useMoneyFormatter();
  const monthExpenses = getThisMonthExpenses(transactions);
  const monthIncome = getThisMonthIncome(transactions);
  const monthKey = yyyyMmDd().slice(0, 7);
  const thisMonthTransactions = transactions.filter((item) => item.date.slice(0, 7) === monthKey);
  const available = Math.max(monthlyBudget - monthExpenses, 0);
  const categoryTotals = getExpensesByCategory(thisMonthTransactions);
  const food = categoryTotals.find((item) => item.category === "Food")?.total ?? 0;
  const alertMessage = monthExpenses ? `Food is ${Math.round((food / monthExpenses) * 100)}% of this month's expenses.` : "No spending alerts yet.";
  const today = yyyyMmDd();
  const recent = transactions.filter((item) => item.date <= today).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const upcoming = transactions.filter((item) => item.date > today).slice().sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const localToday = parseDateOnly(today);
  const weekStart = new Date(localToday.getFullYear(), localToday.getMonth(), localToday.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
    return { key: formatDateOnly(date), label: date.toLocaleDateString("en-IN", { weekday: "short" }) };
  });
  const weekSpending = weekKeys.map((day) => transactions.filter((item) => item.type === "expense" && item.date === day.key).reduce((sum, item) => sum + item.amount, 0));
  const maxDaySpending = Math.max(0, ...weekSpending);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header onMenu={onMenu} onNotifications={() => {}} onSettings={onSettings} onAccount={onAccount} userName={userName} profilePictureUri={profilePictureUri} />

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>MONTHLY BUDGET</Text>
          <Pressable onPress={onSetBudget}><Text style={styles.link}>{monthlyBudget > 0 ? "Edit budget" : "Set budget"}</Text></Pressable>
        </View>
        <Text style={styles.bigMoney}>{money(monthlyBudget)}</Text>
        <Text style={styles.muted}>{monthlyBudget > 0 ? `${money(available)} remaining after this month's expenses` : "Set your budget to get started."}</Text>
        <Progress value={monthlyBudget > 0 ? Math.min((monthExpenses / monthlyBudget) * 100, 100) : 0} />
        <View style={styles.statRow}>
          <View><Text style={styles.muted}>Income</Text><Text style={[styles.statValue, { color: C.green }]}>{money(monthIncome)}</Text></View>
          <View><Text style={styles.muted}>Spent</Text><Text style={[styles.statValue, { color: C.red }]}>{money(monthExpenses)}</Text></View>
          <View><Text style={styles.muted}>Available</Text><Text style={styles.statValue}>{money(available)}</Text></View>
        </View>
      </Card>

      <Card style={{ borderColor: "#1B5E5B" }}>
        <View style={styles.rowBetween}>
          <View style={styles.inline}>
            <Ionicons name="wallet-outline" size={20} color={C.cyan} />
            <Text style={styles.cardLabel}>SAFE TO SPEND TODAY</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </View>
        <Text style={[styles.bigMoney, { color: C.cyan }]}>{money(monthlyBudget > 0 ? available * 0.1 : 0)}</Text>
        <Text style={styles.muted}>{monthlyBudget > 0 ? "Based on remaining budget after expenses." : "Set a budget to calculate safe-to-spend."}</Text>
      </Card>

      <Card style={{ borderColor: "#713244" }}>
        <View style={styles.inline}>
          <Ionicons name="trending-up" size={20} color={C.red} />
          <Text style={styles.cardLabel}>SPENDING ALERT</Text>
        </View>
        <Text style={styles.alertTitle}>{alertMessage}</Text>
        <Pressable onPress={() => setTab("SpendingHabits")}>
          <Text style={styles.link}>View details →</Text>
        </Pressable>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <Pressable onPress={() => setTab("Calendar")}>
          <Text style={styles.link}>View calendar →</Text>
        </Pressable>
      </View>
      {upcoming.length ? upcoming.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <Text style={styles.date}>{parseDateOnly(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
          <Text style={styles.listMain}>{item.description} · {item.type === "income" ? "Income" : "Expense"}</Text>
          <Text style={[styles.listAmount, { color: item.type === "income" ? C.green : C.red }]}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</Text>
        </View>
      )) : <Text style={styles.muted}>No scheduled transactions.</Text>}

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Spending this week</Text>
        </View>
        <Text style={styles.bigMoney}>{money(weekSpending.reduce((sum, value) => sum + value, 0))}</Text>
        {maxDaySpending > 0 ? <View style={styles.miniChart}>
          {weekSpending.map((value, index) => <View key={weekKeys[index].key} style={styles.dayBarColumn}>
            <View style={[styles.bar, { height: Math.max(3, value / maxDaySpending * 68), backgroundColor: value > 0 ? C.primary : C.border }]} />
            <Text style={styles.weekLabel}>{weekKeys[index].label}</Text>
          </View>)}
        </View> : <Text style={styles.muted}>No expenses recorded this week.</Text>}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        {recent.length ? recent.map((item) => (
          <View key={item.id} style={styles.listRow}>
            <Ionicons name={item.type === "income" ? "cash-outline" : "card-outline"} size={20} color={C.muted} />
            <Text style={styles.listMain}>{item.description}</Text>
            <Text style={[styles.listAmount, item.type === "income" ? { color: C.green } : { color: C.red }]}>
              {item.type === "income" ? "+" : "-"}
              {money(item.amount)}
            </Text>
          </View>
        )) : <Text style={styles.muted}>No completed transactions yet.</Text>}
      </Card>
    </ScrollView>
  );
}

function InsightsScreen({ transactions }: { transactions: Transaction[] }) {
  const { colors: C, styles } = useAppTheme();
  const money = useMoneyFormatter();
  const [selectedPeriod, setSelectedPeriod] = useState<"current" | "previous">("current");
  const monthDate = getMonthStart(new Date(), selectedPeriod === "current" ? 0 : -1);
  const previousMonthDate = getMonthStart(monthDate, -1);
  const monthKey = formatDateOnly(monthDate).slice(0, 7);
  const periodLabel = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const previousPeriodLabel = previousMonthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const expenseTotal = getThisMonthExpenses(transactions, monthDate);
  const incomeTotal = getThisMonthIncome(transactions, monthDate);
  const netChange = incomeTotal - expenseTotal;
  const previousExpenses = getThisMonthExpenses(transactions, previousMonthDate);
  const previousIncome = getThisMonthIncome(transactions, previousMonthDate);
  const periodTransactions = transactions.filter((item) => item.date.slice(0, 7) === monthKey);
  const categoryTotals = getExpensesByCategory(periodTransactions);
  const incomeSources = getIncomeByCategory(periodTransactions);
  const totalCategoryAmount = categoryTotals.reduce((sum, item) => sum + item.total, 0);
  const totalIncomeBySource = incomeSources.reduce((sum, item) => sum + item.total, 0);
  const largest = categoryTotals[0];
  const weeklyFlow = Array.from({ length: 5 }, (_, index) => {
    const entries = periodTransactions.filter((item) => Math.floor((Number(item.date.slice(8, 10)) - 1) / 7) === index);
    return {
      income: entries.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
      expenses: entries.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
    };
  });
  const maxWeeklyFlow = Math.max(1, ...weeklyFlow.flatMap((week) => [week.income, week.expenses]));
  const comparison = previousExpenses > 0 ? `${Math.abs(((expenseTotal - previousExpenses) / previousExpenses) * 100).toFixed(0)}% ${expenseTotal >= previousExpenses ? "higher" : "lower"} than ${previousPeriodLabel}` : `No expense data for ${previousPeriodLabel}`;
  const incomeComparison = previousIncome > 0 ? `${Math.abs(((incomeTotal - previousIncome) / previousIncome) * 100).toFixed(0)}% ${incomeTotal >= previousIncome ? "higher" : "lower"} than ${previousPeriodLabel}` : `No income data for ${previousPeriodLabel}`;
  const monthDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const periodExpenses = periodTransactions.filter((item) => item.type === "expense");
  const largestExpense = Math.max(0, ...periodExpenses.map((item) => item.amount));
  const weekdayExpenses = periodExpenses.filter((item) => [1, 2, 3, 4, 5].includes(parseDateOnly(item.date).getDay())).reduce((sum, item) => sum + item.amount, 0);
  const weekendExpenses = periodExpenses.filter((item) => [0, 6].includes(parseDateOnly(item.date).getDay())).reduce((sum, item) => sum + item.amount, 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Insights</Text>
      <View style={styles.segment}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedPeriod === "current" }} onPress={() => setSelectedPeriod("current")} style={selectedPeriod === "current" ? styles.periodChoiceActive : styles.periodChoice}>
          <Text style={selectedPeriod === "current" ? styles.segmentActiveText : styles.segmentText}>This Month</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedPeriod === "previous" }} onPress={() => setSelectedPeriod("previous")} style={selectedPeriod === "previous" ? styles.periodChoiceActive : styles.periodChoice}>
          <Text style={selectedPeriod === "previous" ? styles.segmentActiveText : styles.segmentText}>Last Month</Text>
        </Pressable>
      </View>

      <Card>
        <Text style={styles.cardLabel}>MONTHLY CASH FLOW · {periodLabel.toUpperCase()}</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}><Text style={styles.metricLabel}>Income</Text><Text style={styles.metricValuePositive}>{money(incomeTotal)}</Text><Text style={styles.muted}>{incomeComparison}</Text></View>
          <View style={styles.metricBox}><Text style={styles.metricLabel}>Expenses</Text><Text style={styles.metricValueNegative}>{money(expenseTotal)}</Text><Text style={styles.muted}>{comparison}</Text></View>
        </View>
        <Text style={styles.metricLabel}>NET CHANGE</Text>
        <Text style={[styles.bigMoney, { color: netChange >= 0 ? C.green : C.red }]}>{netChange >= 0 ? "+" : "−"}{money(Math.abs(netChange))}</Text>
        <View style={styles.flowChart}>
          {weeklyFlow.map((week, index) => (
            <View key={index} style={styles.flowWeek}>
              <View style={styles.flowBars}>
                <View style={[styles.flowBar, { height: Math.max(3, week.income / maxWeeklyFlow * 92), backgroundColor: C.green }]} />
                <View style={[styles.flowBar, { height: Math.max(3, week.expenses / maxWeeklyFlow * 92), backgroundColor: C.red }]} />
              </View>
              <Text style={styles.weekLabel}>W{index + 1}</Text>
            </View>
          ))}
        </View>
        <View style={styles.inline}><View style={[styles.legendDot, { backgroundColor: C.green }]} /><Text style={styles.muted}>Income</Text><View style={[styles.legendDot, { backgroundColor: C.red, marginLeft: 12 }]} /><Text style={styles.muted}>Expenses</Text></View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Income sources · {periodLabel}</Text>
        {incomeSources.length ? incomeSources.slice(0, 5).map((item) => {
          const pct = totalIncomeBySource > 0 ? (item.total / totalIncomeBySource) * 100 : 0;
          return (
            <View key={item.category} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: C.green }]} />
              <Text style={styles.listMain}>{item.category}</Text>
              <Text style={styles.muted}>{pct.toFixed(0)}%</Text>
              <Text style={[styles.listAmount, { color: C.green }]}>{money(item.total)}</Text>
            </View>
          );
        }) : <Text style={styles.muted}>No income recorded in {periodLabel}.</Text>}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Spending by category · {periodLabel}</Text>
        {categoryTotals.length ? categoryTotals.slice(0, 5).map((item) => {
          const pct = totalCategoryAmount > 0 ? (item.total / totalCategoryAmount) * 100 : 0;
          return (
            <View key={item.category} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] ?? C.muted }]} />
              <Text style={styles.listMain}>{item.category}</Text>
              <Text style={styles.muted}>{pct.toFixed(0)}%</Text>
              <Text style={styles.listAmount}>{money(item.total)}</Text>
            </View>
          );
        }) : <Text style={styles.muted}>Not enough data yet.</Text>}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Quick metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}><Text style={styles.metricLabel}>Average daily</Text><Text style={styles.metricValue}>{money(expenseTotal / monthDays)}</Text></View>
          <View style={styles.metricBox}><Text style={styles.metricLabel}>Largest expense</Text><Text style={styles.metricValue}>{money(largestExpense)}</Text></View>
          <View style={styles.metricBox}><Text style={styles.metricLabel}>Highest category</Text><Text style={styles.metricValue}>{largest ? largest.category : "—"}</Text></View>
          <View style={styles.metricBox}><Text style={styles.metricLabel}>Weekday vs weekend</Text><Text style={styles.metricValue}>{money(weekdayExpenses)} / {money(weekendExpenses)}</Text></View>
        </View>
      </Card>
    </ScrollView>
  );
}

function SpendingHabitsScreen({ transactions }: { transactions: Transaction[] }) {
  const { styles } = useAppTheme();
  const money = useMoneyFormatter();
  const categoryTotals = getExpensesByCategory(transactions);
  const currentMonth = getThisMonthExpenses(transactions);
  const previousMonth = getPreviousMonthExpenses(transactions);
  const topCategory = categoryTotals[0];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Spending Habits</Text>
      <Card>
        <Text style={styles.sectionTitle}>Insights</Text>
        <Text style={styles.muted}>{categoryTotals.length ? `${topCategory.category} is your largest spending category.` : "Not enough data yet"}</Text>
        <Text style={[styles.muted, { marginTop: 8 }]}>
          {previousMonth > 0 ? `${Math.abs(((currentMonth - previousMonth) / previousMonth) * 100).toFixed(0)}% ${currentMonth >= previousMonth ? "higher" : "lower"} than last month.` : "Not enough data yet."}
        </Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Category totals</Text>
        {categoryTotals.length ? categoryTotals.map((item) => (
          <View key={item.category} style={styles.categoryRow}>
            <Text style={styles.listMain}>{item.category}</Text>
            <Text style={styles.listAmount}>{money(item.total)}</Text>
          </View>
        )) : <Text style={styles.muted}>Not enough data yet.</Text>}
      </Card>
    </ScrollView>
  );
}

function ForecastsScreen({ transactions }: { transactions: Transaction[] }) {
  const { styles } = useAppTheme();
  const money = useMoneyFormatter();
  const forecast = getForecastRange(transactions);
  const currentMonth = getThisMonthExpenses(transactions);
  const previousMonth = getPreviousMonthExpenses(transactions);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Forecasts</Text>
      <Card>
        <Text style={styles.cardLabel}>ESTIMATED NEXT MONTH</Text>
        <Text style={styles.bigMoney}>{forecast.months ? `${money(forecast.min)}–${money(forecast.max)}` : "Not enough data yet"}</Text>
        <Text style={styles.muted}>Estimate based on recent spending history.</Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Estimate notes</Text>
        <Text style={styles.muted}>Current month: {money(currentMonth)}</Text>
        <Text style={styles.muted}>Previous month: {money(previousMonth)}</Text>
      </Card>
    </ScrollView>
  );
}

function DatePicker({ label, value, onChange }: { label: string; value: string; onChange: (date: string) => void }) {
  const { colors: C, styles } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const selected = parseDateOnly(value);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const selected = parseDateOnly(value);
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1));

  useEffect(() => {
    const date = parseDateOnly(value);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value]);

  return (
    <View style={styles.datePicker}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Pressable style={styles.datePickerButton} onPress={() => setOpen((current) => !current)}>
        <Ionicons name="calendar-outline" size={18} color={C.cyan} />
        <Text style={styles.datePickerValue}>{dateLabel(value)}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
      </Pressable>
      {open && (
        <View style={styles.datePickerPanel}>
          <View style={styles.calendarHeader}>
            <Pressable style={styles.calendarArrow} onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
              <Ionicons name="chevron-back" size={19} color={C.text} />
            </Pressable>
            <Text style={styles.sectionTitle}>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</Text>
            <Pressable style={styles.calendarArrow} onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
              <Ionicons name="chevron-forward" size={19} color={C.text} />
            </Pressable>
          </View>
          <View style={styles.weekRow}>{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <Text key={index} style={styles.weekDay}>{day}</Text>)}</View>
          <View style={styles.calendarGrid}>
            {days.map((day) => {
              const key = formatDateOnly(day);
              const inMonth = day.getMonth() === month.getMonth();
              const isToday = key === yyyyMmDd();
              return (
                <Pressable key={key} onPress={() => { onChange(key); setOpen(false); }} style={[styles.dayCell, key === value && styles.daySelected]}>
                  <Text style={[styles.dayText, !inMonth && styles.dayOutside, isToday && key !== value && styles.dayToday]}>{day.getDate()}</Text>
                  {isToday && <View style={styles.todayMark} />}
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.todayButton} onPress={() => { onChange(yyyyMmDd()); setOpen(false); }}>
            <Text style={styles.link}>Jump to today</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CalendarScreen({ transactions, onEdit }: { transactions: Transaction[]; onEdit: (transaction: Transaction) => void }) {
  const { colors: C, styles } = useAppTheme();
  const money = useMoneyFormatter();
  const today = yyyyMmDd();
  const [month, setMonth] = useState(() => {
    const current = parseDateOnly(today);
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1));
  const selectedTransactions = transactions.filter((transaction) => transaction.date === selectedDate)
    .sort((a, b) => a.type.localeCompare(b.type) || a.description.localeCompare(b.description));

  const moveMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    const selectedDay = parseDateOnly(selectedDate).getDate();
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setSelectedDate(formatDateOnly(new Date(next.getFullYear(), next.getMonth(), Math.min(selectedDay, lastDay))));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.pageTitle}>Financial Calendar</Text>
        <Ionicons name="calendar-outline" size={25} color={C.text} />
      </View>
      <Card>
        <View style={styles.calendarHeader}>
          <Pressable style={styles.calendarArrow} onPress={() => moveMonth(-1)}><Ionicons name="chevron-back" size={19} color={C.text} /></Pressable>
          <Text style={styles.sectionTitle}>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</Text>
          <Pressable style={styles.calendarArrow} onPress={() => moveMonth(1)}><Ionicons name="chevron-forward" size={19} color={C.text} /></Pressable>
        </View>
        <View style={styles.weekRow}>{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <Text key={index} style={styles.weekDay}>{day}</Text>)}</View>
        <View style={styles.calendarGrid}>
          {days.map((day) => {
            const key = formatDateOnly(day);
            const inMonth = day.getMonth() === month.getMonth();
            const dayTransactions = transactions.filter((item) => item.date === key);
            const hasIncome = dayTransactions.some((item) => item.type === "income");
            const hasExpense = dayTransactions.some((item) => item.type === "expense");
            return (
              <Pressable key={key} onPress={() => { setSelectedDate(key); if (!inMonth) setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); }} style={[styles.dayCell, key === selectedDate && styles.daySelected]}>
                <Text style={[styles.dayText, !inMonth && styles.dayOutside, key === today && key !== selectedDate && styles.dayToday]}>{day.getDate()}</Text>
                <View style={styles.dayMarks}>
                  {hasIncome && <View style={[styles.dayDot, { backgroundColor: C.green }]} />}
                  {hasExpense && <View style={[styles.dayDot, { backgroundColor: C.red }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={styles.inline}><View style={[styles.legendDot, { backgroundColor: C.green }]} /><Text style={styles.muted}>Income</Text></View>
          <View style={styles.inline}><View style={[styles.legendDot, { backgroundColor: C.red }]} /><Text style={styles.muted}>Expense</Text></View>
        </View>
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{dateLabel(selectedDate)}</Text>
          <Text style={styles.muted}>{selectedTransactions.length} {selectedTransactions.length === 1 ? "transaction" : "transactions"}</Text>
        </View>
        {selectedTransactions.length ? selectedTransactions.map((transaction) => (
          <Pressable key={transaction.id} onPress={() => onEdit(transaction)} style={styles.calendarTransaction}>
            <Text style={[styles.calendarDirection, { color: transaction.type === "income" ? C.green : C.red }]}>{transaction.type === "income" ? "↑" : "↓"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>{transaction.description}</Text>
              <Text style={styles.muted}>{transaction.type === "income" ? "Income" : "Expense"} · {transaction.category}</Text>
            </View>
            <Text style={[styles.listAmount, { color: transaction.type === "income" ? C.green : C.red }]}>{transaction.type === "income" ? "+" : "−"}{money(transaction.amount)}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </Pressable>
        )) : <Text style={[styles.muted, { marginTop: 14 }]}>No transactions on this date.</Text>}
      </Card>
    </ScrollView>
  );
}

function GoalsScreen({ goals, onCreate, onEdit, onDelete }: { goals: Goal[]; onCreate: () => void; onEdit: (goal: Goal) => void; onDelete: (goal: Goal) => void }) {
  const { colors: C, styles } = useAppTheme();
  const money = useMoneyFormatter();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.pageTitle}>Goals</Text>
        <IconButton icon="add-circle-outline" onPress={onCreate} />
      </View>

      {goals.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No goals yet. Create one to start saving intentionally.</Text>
        </Card>
      ) : (
        goals.map((goal) => {
          const progress = getGoalProgress(goal);
          return (
            <Card key={goal.id}>
              <View style={styles.inline}>
                <Text style={{ fontSize: 28 }}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{goal.name}</Text>
                  <Text style={styles.muted}>{money(goal.currentAmount)} / {money(goal.targetAmount)}</Text>
                </View>
                <Text style={styles.sectionTitle}>{Math.round(progress.percentage)}%</Text>
              </View>

              <Progress value={progress.percentage} color={C.primary} />

              <View style={styles.rowBetween}>
                <Text style={styles.muted}>{money(progress.remaining)} to go · {dateLabel(goal.deadline)}</Text>
                <View style={styles.inline}>
                  <Pressable onPress={() => onEdit(goal)}>
                    <Ionicons name="create-outline" size={18} color={C.text} />
                  </Pressable>
                  <Pressable onPress={() => onDelete(goal)}>
                    <Ionicons name="trash-outline" size={18} color={C.red} />
                  </Pressable>
                </View>
              </View>

              <Text style={styles.muted}>Required monthly save: {money(getRequiredMonthlySaving(goal))}</Text>
            </Card>
          );
        })
      )}

      <Pressable style={styles.primaryButton} onPress={onCreate}>
        <Text style={styles.primaryButtonText}>＋ Create a new goal</Text>
      </Pressable>
    </ScrollView>
  );
}

function TransactionsScreen({ transactions, onAdd, onEdit, onDelete }: { transactions: Transaction[]; onAdd: () => void; onEdit: (txn: Transaction) => void; onDelete: (txn: Transaction) => void }) {
  const { colors: C, styles } = useAppTheme();
  const money = useMoneyFormatter();
  const totalIncome = getTotalIncome(transactions);
  const totalExpenses = getTotalExpenses(transactions);
  const balance = getRemainingBalance(transactions);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}><Text style={styles.pageTitle}>Transactions</Text><IconButton icon="add-circle-outline" onPress={onAdd} /></View>
      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}><Text style={styles.metricLabel}>Income</Text><Text style={styles.metricValuePositive}>{money(totalIncome)}</Text></View>
        <View style={styles.metricBox}><Text style={styles.metricLabel}>Expenses</Text><Text style={styles.metricValueNegative}>{money(totalExpenses)}</Text></View>
        <View style={styles.metricBox}><Text style={styles.metricLabel}>Balance</Text><Text style={styles.metricValue}>{money(balance)}</Text></View>
      </View>

      {transactions.length ? transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((txn) => (
        <Card key={txn.id}>
          <View style={styles.listRow}>
            <View style={[styles.transactionIcon, txn.type === "income" ? { backgroundColor: "rgba(59,224,161,.12)" } : { backgroundColor: "rgba(255,100,124,.12)" }]}>
              <Ionicons name={txn.type === "income" ? "trending-up-outline" : "trending-down-outline"} size={18} color={txn.type === "income" ? C.green : C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>{txn.description}</Text>
              <Text style={styles.muted}>{txn.category} · {dateLabel(txn.date)}</Text>
              {(txn.paymentMethod || txn.recurrence) && <Text style={styles.muted}>{[txn.paymentMethod, txn.recurrence ? `Repeats ${txn.recurrence}` : undefined].filter(Boolean).join(" · ")}</Text>}
            </View>
            <Text style={[styles.listAmount, txn.type === "income" ? { color: C.green } : { color: C.red }]}>{txn.type === "income" ? "+" : "-"}{money(txn.amount)}</Text>
          </View>
          <View style={styles.transactionActions}>
            <Pressable onPress={() => onEdit(txn)} style={styles.minorAction}><Text style={styles.minorActionText}>Edit</Text></Pressable>
            <Pressable onPress={() => onDelete(txn)} style={[styles.minorAction, { borderColor: "rgba(255,100,124,.5)" }]}><Text style={[styles.minorActionText, { color: C.red }]}>Delete</Text></Pressable>
          </View>
        </Card>
      )) : <Card><Text style={styles.sectionTitle}>No transactions yet</Text><Text style={styles.muted}>Add your first income or expense to start tracking your finances.</Text></Card>}
    </ScrollView>
  );
}

function WhatIfScreen({ transactions }: { transactions: Transaction[] }) {
  const { styles } = useAppTheme();
  const money = useMoneyFormatter();
  const [values, setValues] = useState({ food: 15, transport: 10, rent: 0, entertainment: 0, income: -2000 });
  const currentMonthKey = yyyyMmDd().slice(0, 7);
  const monthExpenses = transactions.filter((item) => item.type === "expense" && item.date.slice(0, 7) === currentMonthKey);
  const monthIncome = transactions.filter((item) => item.type === "income" && item.date.slice(0, 7) === currentMonthKey).reduce((sum, item) => sum + item.amount, 0);
  const base = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const byCategory: Record<string, number> = {};
  monthExpenses.forEach((item) => {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + item.amount;
  });

  const projectedTotal = Math.max(
    base
      + (byCategory["Food"] ?? 0) * (values.food / 100)
      + (byCategory["Transport"] ?? 0) * (values.transport / 100)
      + (byCategory["Housing"] ?? 0) * (values.rent / 100)
      + (byCategory["Entertainment"] ?? 0) * (values.entertainment / 100),
    0,
  );
  const difference = projectedTotal - base;
  const estimatedSavings = monthIncome + values.income - projectedTotal;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>What-if Simulator</Text>
      <Card>
        <Text style={styles.cardLabel}>CURRENT MONTHLY SPENDING</Text>
        <Text style={styles.bigMoney}>{money(base)}</Text>
        <Text style={styles.muted}>Income this month: {money(monthIncome)}</Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Adjust key categories</Text>
        {[
          ["Food", "food", "%"],
          ["Transport", "transport", "%"],
          ["Rent", "rent", "₹"],
          ["Entertainment", "entertainment", "%"],
          ["Income", "income", "₹"],
        ].map(([label, key, suffix]) => (
          <View key={label} style={styles.simInputRow}>
            <Text style={styles.listMain}>{label}</Text>
            <TextInput value={String(values[key as keyof typeof values])} onChangeText={(text) => setValues((prev) => ({ ...prev, [key]: Number(text) || 0 }))} keyboardType="numeric" style={styles.simInput} />
            <Text style={styles.muted}>{suffix}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Projected result</Text>
        <Text style={styles.metricValue}>{money(projectedTotal)}</Text>
        <Text style={styles.muted}>Difference from current spending: {difference >= 0 ? "+" : "-"}{money(Math.abs(difference))}</Text>
        <Text style={styles.muted}>Estimated savings/deficit: {estimatedSavings >= 0 ? money(estimatedSavings) : `-${money(Math.abs(estimatedSavings))}`}</Text>
        <Text style={styles.muted}>Optional annual impact: {estimatedSavings >= 0 ? money(estimatedSavings * 12) : `-${money(Math.abs(estimatedSavings * 12))}`}</Text>
      </Card>
    </ScrollView>
  );
}

function CalculatorScreen() {
  const { styles } = useAppTheme();
  const [expression, setExpression] = useState("");
  const [display, setDisplay] = useState("0");
  const [error, setError] = useState("");

  const appendNumeric = (token: string) => {
    setError("");
    const next = expression + token;
    setExpression(next);
    setDisplay(next);
  };

  const appendOperator = (operator: string) => {
    if (!expression) return;
    const last = expression.slice(-1);
    if (["+", "-", "*", "/"].includes(last)) return;
    setError("");
    setExpression((prev) => prev + operator);
    setDisplay(operator);
  };

  const clearAll = () => {
    setExpression("");
    setDisplay("0");
    setError("");
  };

  const deleteOne = () => {
    const next = expression.slice(0, -1);
    setExpression(next);
    setDisplay(next || "0");
    setError("");
  };

  const evaluate = () => {
    if (!expression) return;
    const sanitized = expression.replace(/×/g, "*").replace(/÷/g, "/");
    if (!/^[0-9+\-*/.]+$/.test(sanitized)) {
      setError("Invalid calculation");
      return;
    }
    if (sanitized.includes("/0") || sanitized.includes("/0.")) {
      setError("Cannot divide by zero");
      return;
    }
    try {
      const result = Function(`"use strict"; return (${sanitized});`)();
      if (!Number.isFinite(result)) {
        setError("Invalid calculation");
        return;
      }
      setExpression(String(result));
      setDisplay(String(result));
      setError("");
    } catch {
      setError("Invalid calculation");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Calculator</Text>
      <Card style={styles.calculatorCard}>
        <Text style={styles.calculatorDisplay}>{error || display}</Text>
        <View style={styles.keypad}>
          {[
            ["C", "DEL", "÷", "×"],
            ["7", "8", "9", "/"],
            ["4", "5", "6", "*"],
            ["1", "2", "3", "-"],
            ["0", ".", "=", "+"],
          ].flat().map((key) => {
            const isOperator = ["+", "-", "*", "/", "÷", "×"].includes(key);
            const isAction = ["C", "DEL", "="].includes(key);
            return (
              <Pressable
                key={key}
                style={[styles.key, isOperator && styles.operatorKey, isAction && styles.actionKey]}
                onPress={() => {
                  if (key === "C") clearAll();
                  else if (key === "DEL") deleteOne();
                  else if (key === "=") evaluate();
                  else if (key === "÷") appendOperator("/");
                  else if (key === "×") appendOperator("*");
                  else if (["+", "-", "*", "/"].includes(key)) appendOperator(key);
                  else appendNumeric(key);
                }}
              >
                <Text style={[styles.keyText, isOperator && styles.keyOperatorText]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </ScrollView>
  );
}

function CurrencyConverterScreen() {
  const { colors: C, styles } = useAppTheme();
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const list = ["INR", "USD", "EUR", "GBP", "AED", "JPY", "SGD", "AUD"];

  useEffect(() => {
    let active = true;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        if (!payload.rates) throw new Error("rates missing");
        setRates(payload.rates);
        setError("");
      })
      .catch(() => {
        if (active) setError("Unable to load exchange rates right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const converted = useMemo(() => {
    if (!rates[fromCurrency] || !rates[toCurrency]) return 0;
    const numeric = Number(amount) || 0;
    return (numeric / rates[fromCurrency]) * rates[toCurrency];
  }, [amount, fromCurrency, rates, toCurrency]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Currency Converter</Text>
      <Card>
        <Text style={styles.cardLabel}>AMOUNT</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.amountInput} />

        <View style={styles.currencySelectorRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>FROM</Text>
            <View style={styles.currencyButtonGrid}>
              {list.map((currency) => (
                <Pressable key={currency} onPress={() => setFromCurrency(currency)} style={[styles.currencyButton, currency === fromCurrency && styles.currencyButtonSelected]}>
                  <Text style={styles.currencyButtonText}>{currency}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable style={styles.swapButton} onPress={() => { const nextFrom = toCurrency; setToCurrency(fromCurrency); setFromCurrency(nextFrom); }}>
            <Ionicons name="swap-horizontal-outline" size={18} color={C.text} />
          </Pressable>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.cardLabel}>TO</Text>
          <View style={styles.currencyButtonGrid}>
            {list.map((currency) => (
              <Pressable key={currency} onPress={() => setToCurrency(currency)} style={[styles.currencyButton, currency === toCurrency && styles.currencyButtonSelected]}>
                <Text style={styles.currencyButtonText}>{currency}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.muted}>Converted amount</Text>
        {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 12 }} /> : error ? <Text style={[styles.muted, { color: C.red, marginTop: 12 }]}>{error}</Text> : <Text style={styles.bigMoney}>{Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} {fromCurrency} = {converted.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {toCurrency}</Text>}
      </Card>
    </ScrollView>
  );
}

function RecurringPaymentsScreen({ payments, onAdd, onDelete }: { payments: RecurringPayment[]; onAdd: (draft: { name: string; amount: number; frequency: RecurringPayment["frequency"]; nextDate: string }) => void; onDelete: (payment: RecurringPayment) => void }) {
  const { colors: C, styles } = useAppTheme();
  const money = useMoneyFormatter();
  const [draft, setDraft] = useState({ name: "", amount: "", frequency: "monthly" as RecurringPayment["frequency"], nextDate: yyyyMmDd() });

  const submit = () => {
    const name = draft.name.trim();
    const amount = Number(draft.amount);
    if (!name || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid payment", "Please provide a valid name and amount.");
      return;
    }
    onAdd({ name, amount, frequency: draft.frequency, nextDate: draft.nextDate });
    setDraft({ name: "", amount: "", frequency: "monthly", nextDate: yyyyMmDd() });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Recurring Payments</Text>
      <Card>
        <Text style={styles.sectionTitle}>Add payment</Text>
        <TextInput value={draft.name} onChangeText={(text) => setDraft((prev) => ({ ...prev, name: text }))} placeholder="Payment name" placeholderTextColor={C.muted} style={styles.input} />
        <TextInput value={draft.amount} onChangeText={(text) => setDraft((prev) => ({ ...prev, amount: text }))} keyboardType="numeric" placeholder="Amount" placeholderTextColor={C.muted} style={styles.input} />
        <TextInput value={draft.nextDate} onChangeText={(text) => setDraft((prev) => ({ ...prev, nextDate: text }))} placeholder="Next payment date" placeholderTextColor={C.muted} style={styles.input} />
        <View style={styles.segmentChoice}>
          {(["weekly", "monthly", "yearly"] as const).map((freq) => (
            <Pressable key={freq} onPress={() => setDraft((prev) => ({ ...prev, frequency: freq }))} style={freq === draft.frequency ? styles.segmentChoiceActive : styles.segmentChoiceInactive}>
              <Text style={freq === draft.frequency ? styles.segmentActiveText : styles.segmentText}>{freq}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={submit}><Text style={styles.primaryButtonText}>Add recurring payment</Text></Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Upcoming payments</Text>
        {payments.length ? payments.map((payment) => (
          <View key={payment.id} style={styles.listRow}>
            <Text style={styles.listMain}>{payment.name}</Text>
            <Text style={styles.muted}>{payment.frequency}</Text>
            <Text style={styles.listAmount}>{money(payment.amount)}</Text>
            <Pressable onPress={() => onDelete(payment)}><Ionicons name="trash-outline" size={18} color={C.red} /></Pressable>
          </View>
        )) : <Text style={styles.muted}>No recurring payments yet.</Text>}
        <Text style={[styles.muted, { marginTop: 12 }]}>Approximate recurring monthly cost: {money(getRecurringMonthlyCost(payments))}</Text>
      </Card>
    </ScrollView>
  );
}

function ReceiptScannerScreen() {
  const { colors: C, styles } = useAppTheme();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Receipt Scanner</Text>
      <Card style={{ padding: 20 }}>
        <Ionicons name="scan-outline" size={40} color={C.primary} />
        <Text style={styles.sectionTitle}>Coming Soon</Text>
        <Text style={styles.muted}>Receipt scanning will eventually extract merchant and amount, suggest a category, and create a transaction automatically.</Text>
      </Card>
    </ScrollView>
  );
}

function Drawer({ visible, onClose, setTab, openAI, user, onLogout }: any) {
  const { colors: C, styles } = useAppTheme();
  const insets = useSafeAreaInsets();
  const go = (tab: Tab) => { onClose(); setTab(tab); };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.drawerBackdrop}>
        <View style={[styles.drawer, { paddingTop: insets.top + 12, paddingBottom: Math.max(12, insets.bottom + 8) }]}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}><Ionicons name="person" size={21} color={C.cyan} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{user.displayName}</Text>
              <Text style={styles.muted}>{user.email}</Text>
            </View>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={C.text} /></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
          <DrawerItem icon="home-outline" text="Home" onPress={() => go("Home")} />
          <DrawerItem icon="receipt-outline" text="Transactions" onPress={() => go("Transactions")} />
          <DrawerItem icon="wallet-outline" text="Budgets" onPress={onClose} />
          <DrawerItem icon="trophy-outline" text="Savings Goals" onPress={() => go("Goals")} />
          <Text style={styles.drawerSection}>ANALYZE</Text>
          <DrawerItem icon="stats-chart-outline" text="Insights" onPress={() => go("Insights")} />
          <DrawerItem icon="trending-up-outline" text="Spending Habits" onPress={() => go("SpendingHabits")} />
          <DrawerItem icon="analytics-outline" text="Forecasts" onPress={() => go("Forecasts")} />
          <DrawerItem icon="flask-outline" text="What-if Simulator" onPress={() => go("WhatIf")} />
          <Text style={styles.drawerSection}>PLAN</Text>
          <DrawerItem icon="calendar-outline" text="Upcoming Expenses" onPress={() => go("Calendar")} />
          <DrawerItem icon="repeat-outline" text="Recurring Payments" onPress={() => go("RecurringPayments")} />
          <Text style={styles.drawerSection}>TOOLS</Text>
          <DrawerItem icon="cash-outline" text="Currency Converter" onPress={() => go("CurrencyConverter")} />
          <DrawerItem icon="calculator-outline" text="Calculator" onPress={() => go("Calculator")} />
          <DrawerItem icon="scan-outline" text="Receipt Scanner" onPress={() => go("ReceiptScanner")} />
          <Text style={styles.drawerSection}>SERVICES</Text>
          <DrawerItem icon="sparkles-outline" text="AI Assistant" onPress={() => { onClose(); openAI(); }} />
          <DrawerItem icon="log-out-outline" text="Sign out" onPress={() => { onClose(); onLogout(); }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BottomSheet({ children }: { children: React.ReactNode }) {
  const { styles } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.modalSheet, { paddingBottom: Math.max(28, insets.bottom + 16) }]}>{children}</View>;
}

function DrawerItem({ icon, text, onPress }: { icon: any; text: string; onPress: () => void }) {
  const { colors: C, styles } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.drawerItem}>
      <Ionicons name={icon} size={20} color={C.text} />
      <Text style={styles.drawerText}>{text}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.muted} />
    </Pressable>
  );
}

function SettingsModal({ visible, onClose, onOpenProfile, onLogout }: { visible: boolean; onClose: () => void; onOpenProfile: () => void; onLogout: () => void }) {
  const { colors: C, styles } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <BottomSheet>
          <View style={styles.rowBetween}><Text style={styles.pageTitle}>Settings</Text><IconButton icon="close" onPress={onClose} /></View>
          {[
            ["person-outline", "Profile & Account"],
            ["shield-checkmark-outline", "Security & Privacy"],
            ["cash-outline", "Currency", "INR (₹)"],
            ["options-outline", "Units", "Metric"],
            ["moon-outline", "Theme", "Dark"],
            ["notifications-outline", "Notifications", "On"],
            ["cloud-outline", "Sync with Cloud", "On"],
          ].map(([icon, label, value]) => (
            <Pressable key={String(label)} onPress={label === "Profile & Account" ? onOpenProfile : undefined} style={styles.settingRow}>
              <Ionicons name={icon as any} size={21} color={C.muted} />
              <Text style={styles.listMain}>{label}</Text>
              {value ? <Text style={styles.muted}>{String(value)}</Text> : null}
              <Ionicons name="chevron-forward" size={17} color={C.muted} />
            </Pressable>
          ))}
          <Pressable onPress={onLogout} style={styles.settingRow}><Ionicons name="log-out-outline" size={21} color={C.red} /><Text style={styles.listMain}>Sign out</Text></Pressable>
        </BottomSheet>
      </View>
    </Modal>
  );
}

function AIModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: C, styles } = useAppTheme();
  const [question, setQuestion] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <BottomSheet>
          <View style={styles.rowBetween}><Text style={styles.pageTitle}>✦ AI Assistant</Text><IconButton icon="close" onPress={onClose} /></View>
          <Text style={styles.muted}>Ask about your finances, get insights, or plan ahead.</Text>
          {[
            "Can I afford ₹2,000 this week?",
            "Why did I spend more on food?",
            "How can I save ₹10,000?",
            "What's my next big expense?",
          ].map((item) => (
            <Pressable key={item} style={styles.prompt}><Text style={styles.promptText}>{item}</Text></Pressable>
          ))}
          <TextInput value={question} onChangeText={setQuestion} placeholder="Type your question..." placeholderTextColor={C.muted} style={styles.input} />
          <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Ask</Text></Pressable>
        </BottomSheet>
      </View>
    </Modal>
  );
}

function TransactionModal({ visible, existing, onClose, onSave }: { visible: boolean; existing: Transaction | null; onClose: () => void; onSave: (draft: Omit<Transaction, "id">) => void }) {
  const { colors: C, styles, currencyCode } = useAppTheme();
  const [type, setType] = useState<TransactionType>(existing?.type ?? "expense");
  const [amount, setAmount] = useState(String(existing?.amount ?? ""));
  const [category, setCategory] = useState(existing?.category ?? "Food");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [date, setDate] = useState(existing?.date ?? yyyyMmDd());
  const [paymentMethod, setPaymentMethod] = useState(existing?.paymentMethod ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [recurrence, setRecurrence] = useState<TransactionFrequency | null>(existing?.recurrence ?? null);

  useEffect(() => {
    setType(existing?.type ?? "expense");
    setAmount(existing ? String(existing.amount) : "");
    setCategory(existing?.category ?? "Food");
    setDescription(existing?.description ?? "");
    setDate(existing?.date ?? yyyyMmDd());
    setPaymentMethod(existing?.paymentMethod ?? "");
    setNotes(existing?.notes ?? "");
    setRecurrence(existing?.recurrence ?? null);
  }, [existing, visible]);

  const submit = () => {
    const parsed = Number(amount.replace(/,/g, "").trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Invalid transaction", "Amount must be greater than zero.");
      return;
    }
    if (!category.trim() || !description.trim() || description.trim().length > 160 || category.trim().length > 80 || notes.length > 1000) {
      Alert.alert("Missing details", "Please add a category and description.");
      return;
    }
    onSave({
      type,
      amount: parsed,
      category: category.trim(),
      description: description.trim(),
      date,
      paymentMethod: paymentMethod.trim() || undefined,
      notes: notes.trim() || undefined,
      recurrence: recurrence ?? undefined,
    });
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const changeType = (nextType: TransactionType) => {
    const previousCategories = type === "income" ? incomeCategories : expenseCategories;
    const nextCategories = nextType === "income" ? incomeCategories : expenseCategories;
    if (previousCategories.includes(category)) setCategory(nextCategories[0]);
    setType(nextType);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <BottomSheet>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.rowBetween}>
              <Text style={styles.pageTitle}>{existing ? `Edit ${type === "income" ? "Income" : "Expense"}` : `Add ${type === "income" ? "Income" : "Expense"}`}</Text>
              <IconButton icon="close" onPress={onClose} />
            </View>
            <View style={styles.segmentChoice}>
              <Pressable style={type === "expense" ? styles.segmentChoiceActive : styles.segmentChoiceInactive} onPress={() => changeType("expense")}>
                <Text style={type === "expense" ? styles.segmentActiveText : styles.segmentText}>↓  Expense</Text>
              </Pressable>
              <Pressable style={type === "income" ? styles.incomeSegmentActive : styles.segmentChoiceInactive} onPress={() => changeType("income")}>
                <Text style={type === "income" ? styles.segmentActiveText : styles.segmentText}>↑  Income</Text>
              </Pressable>
            </View>
            <Text style={styles.cardLabel}>AMOUNT</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.muted} style={styles.amountInput} />
            <Text style={styles.cardLabel}>{type === "income" ? "INCOME SOURCE" : "CATEGORY"}</Text>
            <View style={styles.choiceGroup}>
              {categories.map((item) => (
                <Pressable key={item} onPress={() => setCategory(item)} style={[styles.choiceChip, category === item && (type === "income" ? styles.incomeChoiceChipSelected : styles.choiceChipSelected)]}>
                  <Text style={[styles.choiceChipText, category === item && styles.choiceChipTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={category} onChangeText={setCategory} placeholder={type === "income" ? "Or enter another source" : "Or enter another category"} placeholderTextColor={C.muted} style={styles.input} />
            <Text style={styles.cardLabel}>{type === "income" ? "DESCRIPTION" : "DESCRIPTION"}</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder={type === "income" ? "What was this income for?" : "What was this expense for?"} placeholderTextColor={C.muted} style={styles.input} />
            <DatePicker label={type === "income" ? "DATE RECEIVED / EXPECTED" : "EXPENSE DATE"} value={date} onChange={setDate} />
            <Text style={[styles.cardLabel, { marginTop: 18 }]}>PAYMENT / ACCOUNT METHOD</Text>
            <View style={styles.choiceGroup}>
              {paymentMethods.map((method) => (
                <Pressable key={method} onPress={() => setPaymentMethod(method === "Other" ? "" : method)} style={[styles.choiceChip, paymentMethod === method && styles.methodChipSelected]}>
                  <Text style={[styles.choiceChipText, paymentMethod === method && styles.choiceChipTextSelected]}>{method}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Optional account or method" placeholderTextColor={C.muted} style={styles.input} />
            <View style={styles.rowBetween}>
              <View><Text style={styles.cardLabel}>REPEATS</Text><Text style={styles.muted}>For regular or scheduled transactions</Text></View>
              <Pressable style={[styles.toggle, recurrence && styles.toggleActive]} onPress={() => setRecurrence((current) => current ? null : "monthly")}>
                <View style={[styles.toggleKnob, recurrence && styles.toggleKnobActive]} />
              </Pressable>
            </View>
            {recurrence && <View style={styles.frequencyChoices}>
              {transactionFrequencies.map((frequency) => (
                <Pressable key={frequency} onPress={() => setRecurrence(frequency)} style={[styles.frequencyChoice, recurrence === frequency && styles.frequencyChoiceSelected]}>
                  <Text style={[styles.choiceChipText, recurrence === frequency && styles.choiceChipTextSelected]}>{frequency[0].toUpperCase() + frequency.slice(1)}</Text>
                </Pressable>
              ))}
            </View>}
            <Text style={[styles.cardLabel, { marginTop: 18 }]}>NOTES · OPTIONAL</Text>
            <TextInput value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder="Add a note" placeholderTextColor={C.muted} style={[styles.input, styles.notesInput]} />
            <Pressable style={[styles.primaryButton, type === "income" && styles.incomePrimaryButton]} onPress={submit}>
              <Text style={styles.primaryButtonText}>{existing ? "Save Changes" : `Add ${type === "income" ? "Income" : "Expense"}`}</Text>
            </Pressable>
          </ScrollView>
        </BottomSheet>
      </View>
    </Modal>
  );
}

function GoalModal({ visible, existing, onClose, onSave }: { visible: boolean; existing: Goal | null; onClose: () => void; onSave: (draft: { name: string; targetAmount: number; currentAmount: number; deadline: string }) => void }) {
  const { styles } = useAppTheme();
  const money = useMoneyFormatter();
  const [name, setName] = useState(existing?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(String(existing?.targetAmount ?? ""));
  const [currentAmount, setCurrentAmount] = useState(String(existing?.currentAmount ?? ""));
  const [deadline, setDeadline] = useState(existing?.deadline ?? formatDateOnly(new Date(Date.now() + 30 * 86400000)));

  useEffect(() => {
    setName(existing?.name ?? "");
    setTargetAmount(String(existing?.targetAmount ?? ""));
    setCurrentAmount(String(existing?.currentAmount ?? ""));
    setDeadline(existing?.deadline ?? formatDateOnly(new Date(Date.now() + 30 * 86400000)));
  }, [existing, visible]);

  const submit = () => {
    const cleanName = name.trim();
    const target = Number(targetAmount);
    const current = Number(currentAmount);
    if (!cleanName || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0 || !deadline) {
      Alert.alert("Invalid goal", "Please provide a valid goal name, amounts, and deadline.");
      return;
    }
    onSave({ name: cleanName, targetAmount: target, currentAmount: current, deadline });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <BottomSheet>
          <View style={styles.rowBetween}><Text style={styles.pageTitle}>{existing ? "Edit Goal" : "Create New Goal"}</Text><IconButton icon="close" onPress={onClose} /></View>
          <Text style={styles.cardLabel}>GOAL NAME</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} />
          <Text style={styles.cardLabel}>TARGET AMOUNT</Text>
          <TextInput value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" style={styles.input} />
          <Text style={styles.cardLabel}>CURRENT SAVED AMOUNT</Text>
          <TextInput value={currentAmount} onChangeText={setCurrentAmount} keyboardType="numeric" style={styles.input} />
          <Text style={styles.cardLabel}>TARGET / DEADLINE DATE</Text>
          <TextInput value={deadline} onChangeText={setDeadline} style={styles.input} />
          <Pressable style={styles.primaryButton} onPress={submit}><Text style={styles.primaryButtonText}>{existing ? "Save Goal" : "Create Goal"}</Text></Pressable>
        </BottomSheet>
      </View>
    </Modal>
  );
}

function BudgetModal({ visible, monthlyBudget, onClose, onSave }: { visible: boolean; monthlyBudget: number; onClose: () => void; onSave: (amount: number) => Promise<void> }) {
  const { colors: C, styles, currencyCode } = useAppTheme();
  const [amount, setAmount] = useState(String(monthlyBudget || ""));
  const [saving, setSaving] = useState(false);

  useEffect(() => setAmount(String(monthlyBudget || "")), [monthlyBudget, visible]);

  const save = async () => {
    const parsed = Number(amount.replace(/,/g, "").trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert("Invalid budget", "Enter a valid non-negative monthly budget.");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      onClose();
    } catch (error) {
      Alert.alert("Budget not saved", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <BottomSheet>
          <View style={styles.rowBetween}><Text style={styles.pageTitle}>Monthly budget</Text><IconButton icon="close" onPress={onClose} /></View>
          <Text style={styles.muted}>A budget is optional. Set it to calculate remaining and safe-to-spend amounts.</Text>
          <Text style={[styles.cardLabel, { marginTop: 18 }]}>AMOUNT · {currencyCode}</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.muted} style={styles.amountInput} />
          <Pressable disabled={saving} style={styles.primaryButton} onPress={() => void save()}><Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save budget"}</Text></Pressable>
        </BottomSheet>
      </View>
    </Modal>
  );
}

function AppContent() {
  const { user } = useAuth();
  const systemScheme = useColorScheme();
  const colors = resolveThemeColors(user?.theme ?? "system", systemScheme === "dark" ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <AppThemeProvider value={{ colors, styles, currencyCode: user?.currencyCode ?? "INR" }}>
      <AppContentBody />
    </AppThemeProvider>
  );
}

function AppContentBody() {
  const { colors: C, styles } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user, loading, signOut, updateProfile, setProfilePicture, getTransactions, saveTransaction: persistTransaction, deleteTransaction: persistDeleteTransaction } = useAuth();
  const [tab, setTab] = useState<Tab>("Home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsReady, setTransactionsReady] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionReload, setTransactionReload] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [transactionEditor, setTransactionEditor] = useState<Transaction | null>(null);
  const [goalEditor, setGoalEditor] = useState<Goal | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  useEffect(() => {
    const receiveUrl = (url: string) => {
      const parsed = Linking.parse(url);
      const candidate = parsed.queryParams?.token;
      if (parsed.path === "reset-password" && typeof candidate === "string") setResetToken(candidate);
    };
    const subscription = Linking.addEventListener("url", ({ url }) => receiveUrl(url));
    void Linking.getInitialURL().then((url) => {
      if (url) receiveUrl(url);
    }).catch(() => {});
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setTransactionsReady(false);
    setTransactionsError(null);
    void getTransactions().then((items) => {
      if (active) setTransactions(items);
    }).catch((error: unknown) => {
      if (active) setTransactionsError(error instanceof Error ? error.message : "Unable to load transactions.");
    }).finally(() => {
      if (active) setTransactionsReady(true);
    });
    return () => { active = false; };
  }, [user?.id, transactionReload]);

  const saveTransaction = async (draft: Omit<Transaction, "id">) => {
    const id = transactionEditor?.id ?? `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const saved = { id, ...draft };
    try {
      await persistTransaction(saved);
      setTransactions((previous) => transactionEditor
        ? previous.map((item) => item.id === id ? saved : item)
        : [saved, ...previous]);
      setTransactionEditor(null);
      setShowAddTransaction(false);
    } catch (error) {
      Alert.alert("Transaction not saved", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const deleteTransaction = (txn: Transaction) => {
    Alert.alert("Delete transaction?", `${txn.type === "income" ? "Income" : "Expense"}: ${txn.description}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        void persistDeleteTransaction(txn.id).then(() => {
          setTransactions((previous) => previous.filter((item) => item.id !== txn.id));
        }).catch((error: unknown) => {
          Alert.alert("Transaction not deleted", error instanceof Error ? error.message : "Please try again.");
        });
      } },
    ]);
  };

  const saveGoal = (draft: { name: string; targetAmount: number; currentAmount: number; deadline: string }) => {
    if (goalEditor) {
      setGoals((prev) => prev.map((item) => item.id === goalEditor.id ? { ...item, ...draft } : item));
      setGoalEditor(null);
    } else {
      setGoals((prev) => [{ id: `goal-${Date.now()}`, ...draft }, ...prev]);
    }
    setShowNewGoal(false);
  };

  const deleteGoal = (goal: Goal) => {
    setGoals((prev) => prev.filter((item) => item.id !== goal.id));
  };

  const saveMonthlyBudget = async (monthlyBudget: number) => {
    await updateProfile({ monthlyBudget });
  };

  const addRecurring = (draft: { name: string; amount: number; frequency: RecurringPayment["frequency"]; nextDate: string }) => {
    setPayments((prev) => [{ id: `rec-${Date.now()}`, ...draft }, ...prev]);
  };

  const deleteRecurring = (payment: RecurringPayment) => {
    setPayments((prev) => prev.filter((item) => item.id !== payment.id));
  };

  const screen = useMemo(() => {
    if (tab === "Home") return <HomeScreen transactions={transactions} setTab={setTab} onAdd={() => setShowAddTransaction(true)} onMenu={() => setDrawerOpen(true)} onSettings={() => setSettingsOpen(true)} onAccount={() => setProfileOpen(true)} userName={user?.displayName ?? "Student"} profilePictureUri={user?.profilePictureUri} monthlyBudget={user?.monthlyBudget ?? 0} onSetBudget={() => setBudgetModalOpen(true)} />;
    if (tab === "Insights") return <InsightsScreen transactions={transactions} />;
    if (tab === "Calendar") return <CalendarScreen transactions={transactions} onEdit={(transaction) => { setTransactionEditor(transaction); setShowAddTransaction(true); }} />;
    if (tab === "Transactions") return <TransactionsScreen transactions={transactions} onAdd={() => { setTransactionEditor(null); setShowAddTransaction(true); }} onEdit={(txn) => { setTransactionEditor(txn); setShowAddTransaction(true); }} onDelete={deleteTransaction} />;
    if (tab === "Goals") return <GoalsScreen goals={goals} onCreate={() => { setGoalEditor(null); setShowNewGoal(true); }} onEdit={(goal) => { setGoalEditor(goal); setShowNewGoal(true); }} onDelete={deleteGoal} />;
    if (tab === "SpendingHabits") return <SpendingHabitsScreen transactions={transactions} />;
    if (tab === "Forecasts") return <ForecastsScreen transactions={transactions} />;
    if (tab === "WhatIf") return <WhatIfScreen transactions={transactions} />;
    if (tab === "Calculator") return <CalculatorScreen />;
    if (tab === "CurrencyConverter") return <CurrencyConverterScreen />;
    if (tab === "RecurringPayments") return <RecurringPaymentsScreen payments={payments} onAdd={addRecurring} onDelete={deleteRecurring} />;
    if (tab === "ReceiptScanner") return <ReceiptScannerScreen />;
    return <HomeScreen transactions={transactions} setTab={setTab} onAdd={() => setShowAddTransaction(true)} onMenu={() => setDrawerOpen(true)} onSettings={() => setSettingsOpen(true)} onAccount={() => setProfileOpen(true)} userName={user?.displayName ?? "Student"} profilePictureUri={user?.profilePictureUri} monthlyBudget={user?.monthlyBudget ?? 0} onSetBudget={() => setBudgetModalOpen(true)} />;
  }, [goals, payments, tab, transactions, user?.displayName, user?.profilePictureUri, user?.monthlyBudget]);

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}><StatusBar style="light" /><View style={styles.loading}><Text style={styles.muted}>Loading your account...</Text></View></SafeAreaView>;
  }

  if (!user || resetToken) {
    return <AuthScreen initialResetToken={resetToken} onResetComplete={() => { setResetToken(null); void signOut().catch(() => {}); }} />;
  }

  if (!transactionsReady) {
    return <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}><StatusBar style="light" /><View style={styles.loading}><ActivityIndicator color={C.cyan} /><Text style={styles.muted}>Loading your transactions...</Text></View></SafeAreaView>;
  }

  if (transactionsError) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="light" />
        <View style={styles.loading}>
          <Text style={styles.sectionTitle}>Transactions unavailable</Text>
          <Text style={styles.errorText}>{transactionsError}</Text>
          <Pressable style={styles.primaryButton} onPress={() => setTransactionReload((current) => current + 1)}><Text style={styles.primaryButtonText}>Try again</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      {screen}
      <BottomNav tab={tab} setTab={setTab} onAdd={() => setShowAddTransaction(true)} bottomInset={insets.bottom} />
      <Pressable style={[styles.aiFab, { bottom: insets.bottom + 91 }]} onPress={() => setAiOpen(true)}>
        <Ionicons name="sparkles" size={23} color="#fff" />
      </Pressable>
      <TransactionModal visible={showAddTransaction} existing={transactionEditor} onClose={() => { setShowAddTransaction(false); setTransactionEditor(null); }} onSave={saveTransaction} />
      <GoalModal visible={showNewGoal} existing={goalEditor} onClose={() => { setShowNewGoal(false); setGoalEditor(null); }} onSave={saveGoal} />
      <BudgetModal visible={budgetModalOpen} monthlyBudget={user.monthlyBudget} onClose={() => setBudgetModalOpen(false)} onSave={saveMonthlyBudget} />
      <Drawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} setTab={setTab} openAI={() => setAiOpen(true)} user={user} onLogout={() => void signOut()} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenProfile={() => setProfileOpen(true)} onLogout={() => void signOut()} />
      <ProfileModal visible={profileOpen} user={user} onClose={() => setProfileOpen(false)} onSave={updateProfile} onChangePicture={setProfilePicture} onRemovePicture={() => setProfilePicture(null)} />
      <AIModal visible={aiOpen} onClose={() => setAiOpen(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: C.muted, fontSize: 13, textAlign: "center", marginTop: 10, marginHorizontal: 28 },
  content: { padding: 16, paddingTop: 18, paddingBottom: 120 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", gap: 3 },
  iconButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: C.muted, fontSize: 12 },
  title: { color: C.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: C.muted, fontSize: 11, marginTop: 4 },
  pageTitle: { color: C.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
  card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, marginBottom: 16 },
  cardLabel: { color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 4 },
  bigMoney: { color: C.text, fontSize: 31, fontWeight: "800", marginTop: 6 },
  muted: { color: C.muted, fontSize: 12 },
  progressTrack: { height: 7, backgroundColor: "#183047", borderRadius: 10, overflow: "hidden", marginTop: 12 },
  progressFill: { height: "100%", borderRadius: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  statValue: { color: C.text, fontSize: 14, fontWeight: "700", marginTop: 3 },
  pill: { backgroundColor: "#17344A", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  pillText: { color: C.muted, fontSize: 10 },
  inline: { flexDirection: "row", alignItems: "center", gap: 7 },
  alertTitle: { color: C.text, fontSize: 14, fontWeight: "600", lineHeight: 20, marginTop: 12, marginBottom: 8 },
  link: { color: "#78A7FF", fontSize: 12, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 10 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#122A3F" },
  date: { color: C.muted, fontSize: 11, width: 55 },
  listMain: { color: C.text, fontSize: 13, flex: 1 },
  listAmount: { color: C.text, fontSize: 13, fontWeight: "700" },
  positive: { color: C.green, fontSize: 11, fontWeight: "800" },
  miniChart: { height: 95, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", marginTop: 10 },
  bar: { width: 18, backgroundColor: C.primary, borderRadius: 6 },
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, height: 76, backgroundColor: "#071726", borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 5 },
  navItem: { alignItems: "center", justifyContent: "center", width: 65 },
  navLabel: { fontSize: 9, color: C.muted, marginTop: 3 },
  addButton: { width: 55, height: 55, borderRadius: 20, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginTop: -25, borderWidth: 4, borderColor: C.bg },
  aiFab: { position: "absolute", right: 18, bottom: 91, width: 52, height: 52, borderRadius: 18, backgroundColor: "#8A5CFF", alignItems: "center", justifyContent: "center", shadowOpacity: 0.3 },
  segment: { height: 42, borderRadius: 14, backgroundColor: "#10263D", flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 16, marginBottom: 18, padding: 4 },
  periodChoice: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", borderRadius: 10 },
  periodChoiceActive: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: C.primary },
  segmentChoice: { height: 42, borderRadius: 14, backgroundColor: "#10263D", flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginVertical: 12, padding: 4 },
  segmentChoiceActive: { backgroundColor: C.primary, flex: 1, paddingHorizontal: 22, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  incomeSegmentActive: { backgroundColor: "#177F66", flex: 1, paddingHorizontal: 22, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  segmentChoiceInactive: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  segmentActiveText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  segmentText: { color: C.muted, fontSize: 11, fontWeight: "700" },
  lineChart: { height: 120, marginTop: 15, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
  dotBar: { width: 8, backgroundColor: C.primary, borderRadius: 5 },
  flowChart: { height: 124, marginTop: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
  flowWeek: { width: "18%", height: 120, alignItems: "center", justifyContent: "flex-end" },
  flowBars: { height: 98, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  flowBar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  weekLabel: { color: C.muted, fontSize: 9, marginTop: 5 },
  categoryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 8 },
  categoryDot: { width: 9, height: 9, borderRadius: 5 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weekRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 18 },
  weekDay: { color: C.muted, fontSize: 10, fontWeight: "800", width: 34, textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  dayCell: { width: `${100 / 7}%`, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  dayCurrent: { backgroundColor: C.primary },
  dayText: { color: C.text, fontSize: 12 },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
  datePicker: { marginTop: 18 },
  datePickerButton: { height: 48, backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  datePickerValue: { color: C.text, fontSize: 14, fontWeight: "700", flex: 1 },
  datePickerPanel: { backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 8 },
  calendarArrow: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: C.panel2 },
  daySelected: { backgroundColor: C.primary },
  dayOutside: { color: "#536A7E" },
  dayToday: { color: C.cyan, fontWeight: "800" },
  todayMark: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.cyan, position: "absolute", bottom: 4 },
  dayMarks: { flexDirection: "row", minHeight: 7, gap: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  calendarTransaction: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  calendarDirection: { fontSize: 21, fontWeight: "800", width: 17, textAlign: "center" },
  todayButton: { alignItems: "flex-end", paddingTop: 10 },
  legend: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8, marginBottom: 12 },
  metricBox: { width: "48%", backgroundColor: C.panel2, borderRadius: 12, padding: 12, marginBottom: 8 },
  metricLabel: { color: C.muted, fontSize: 11, marginBottom: 6 },
  metricValue: { color: C.text, fontSize: 16, fontWeight: "800" },
  metricValuePositive: { color: C.green, fontSize: 16, fontWeight: "800" },
  metricValueNegative: { color: C.red, fontSize: 16, fontWeight: "800" },
  transactionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  transactionActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 },
  minorAction: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  minorActionText: { color: C.text, fontSize: 11, fontWeight: "700" },
  simInputRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  simInput: { flex: 1, height: 42, backgroundColor: C.panel, borderRadius: 10, borderWidth: 1, borderColor: C.border, color: C.text, paddingHorizontal: 12 },
  calculatorCard: { padding: 14 },
  calculatorDisplay: { color: C.text, fontSize: 30, fontWeight: "800", textAlign: "right", marginBottom: 18 },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  key: { width: "23%", height: 56, backgroundColor: C.panel2, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  operatorKey: { backgroundColor: "rgba(108,99,255,.25)" },
  actionKey: { backgroundColor: "rgba(255,100,124,.18)" },
  keyText: { color: C.text, fontSize: 22, fontWeight: "700" },
  keyOperatorText: { color: C.cyan },
  currencySelectorRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 18 },
  currencyButtonGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 8 },
  currencyButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
  currencyButtonSelected: { backgroundColor: C.primary, borderColor: C.primary },
  currencyButtonText: { color: C.text, fontSize: 12, fontWeight: "700" },
  swapButton: { width: 42, height: 42, backgroundColor: C.panel2, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginLeft: 10, marginBottom: 18 },
  amountInput: { backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, borderRadius: 14, color: C.text, fontSize: 26, fontWeight: "800", padding: 12, marginTop: 8 },
  choiceGroup: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  choiceChip: { backgroundColor: C.panel2, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  choiceChipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  incomeChoiceChipSelected: { backgroundColor: "#177F66", borderColor: "#177F66" },
  methodChipSelected: { backgroundColor: "#20547A", borderColor: C.blue },
  choiceChipText: { color: C.muted, fontSize: 11, fontWeight: "700" },
  choiceChipTextSelected: { color: "#fff" },
  toggle: { width: 48, height: 28, padding: 3, borderRadius: 16, backgroundColor: C.panel2, justifyContent: "center" },
  toggleActive: { backgroundColor: "#177F66" },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.muted },
  toggleKnobActive: { alignSelf: "flex-end", backgroundColor: "#fff" },
  frequencyChoices: { flexDirection: "row", gap: 8, marginTop: 10 },
  frequencyChoice: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  frequencyChoiceSelected: { backgroundColor: "#177F66", borderColor: "#177F66" },
  notesInput: { height: 88, paddingTop: 12, textAlignVertical: "top" },
  incomePrimaryButton: { backgroundColor: "#177F66" },
  primaryButton: { backgroundColor: C.primary, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.65)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: C.border, padding: 18, paddingBottom: 28, maxHeight: "92%" },
  settingRow: { height: 52, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", alignItems: "center", gap: 11 },
  prompt: { backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 11, marginTop: 9 },
  promptText: { color: C.text, fontSize: 12 },
  input: { height: 48, backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, borderRadius: 14, color: C.text, paddingHorizontal: 14, marginTop: 8, marginBottom: 8 },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.55)" },
  drawer: { width: "86%", height: "100%", backgroundColor: C.bg, paddingHorizontal: 18, paddingTop: 12, borderRightWidth: 1, borderRightColor: C.border },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 15 },
  avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: C.panel2, alignItems: "center", justifyContent: "center" },
  drawerSection: { color: C.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 16, marginBottom: 5 },
  drawerItem: { height: 43, flexDirection: "row", alignItems: "center", gap: 12 },
  drawerText: { color: C.text, fontSize: 13, flex: 1 },
  });
}
