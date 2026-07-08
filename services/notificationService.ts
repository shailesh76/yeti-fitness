import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Dynamically import expo-notifications only on native platforms to avoid
// Metro bundler crash on web (expo-notifications has no web support).
let Notifications: any = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (token && userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', userId);

      if (error) throw error;
    }

    return token;
  } catch (error) {
    console.error('Error registering push notifications:', error);
    return null;
  }
}

export async function scheduleDailyReminder(hour: number = 8, minute: number = 0) {
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your workout! 🏋️',
        body: 'Keep the streak alive and log your sets today, dude!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
  }
}

export async function sendLocalNotification(title: string, body: string) {
  if (Platform.OS === 'web' || !Notifications) {
    console.log(`[Notification Mock] Title: ${title}, Body: ${body}`);
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.error("Local notification failed:", e);
  }
}
