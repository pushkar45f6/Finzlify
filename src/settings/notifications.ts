import * as Notifications from "expo-notifications";

import { parseDateOnly, type Transaction } from "../data/finance";

export async function getNotificationPermission(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;
  await Notifications.setNotificationChannelAsync("finance-reminders", {
    name: "Finance reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: "#25D9C2",
  });
  return true;
}

export async function syncTransactionReminders(transactions: Transaction[], enabled: boolean): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || !(await getNotificationPermission())) return;

  await Notifications.setNotificationChannelAsync("finance-reminders", {
    name: "Finance reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: "#25D9C2",
  });

  const now = new Date();
  const upcoming = transactions
    .filter((transaction) => transaction.date > new Date().toLocaleDateString("en-CA"))
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 30);

  for (const transaction of upcoming) {
    const reminderDate = parseDateOnly(transaction.date);
    reminderDate.setHours(9, 0, 0, 0);
    if (reminderDate.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: transaction.type === "income" ? "Expected income" : "Upcoming expense",
        body: `${transaction.description} · ${transaction.category}`,
        data: { transactionId: transaction.id, type: transaction.type },
        // channelId: "finance-reminders",
      },
      trigger: {channelId: "finance-reminders", type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
    });
  }
}