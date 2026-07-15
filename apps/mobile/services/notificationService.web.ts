// Web stub - expo-notifications is not supported on web.
// These are no-op implementations to prevent crashes on web.

export async function registerForPushNotifications(_userId: string): Promise<string | null> {
  return null;
}

export async function scheduleDailyReminder(_hour: number = 8, _minute: number = 0): Promise<void> {
  // No-op on web
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  console.log(`[Notification Mock] Title: ${title}, Body: ${body}`);
}
