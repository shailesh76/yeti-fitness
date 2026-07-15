import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationHistoryStore } from '../store/useNotificationHistoryStore';
import { supabase } from '../lib/supabase';

// Set global notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestPushPermissions = async () => {
  if (Platform.OS === 'web') return false;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

export const registerPushToken = async (userId: string) => {
  if (Platform.OS === 'web') return;
  
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Get the Expo push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(`Push token for user ${userId}:`, token);
    
    if (token) {
      const { error } = await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', userId);
      
      if (error) throw error;
    }
  } catch (e) {
    console.warn('Could not register push token', e);
  }
};

export const scheduleWorkoutReminder = async (dayString: string, hour: number, minute: number) => {
  if (Platform.OS === 'web') return;
  
  const title = "Time to crush it! 💪";
  const body = `Your ${dayString} workout is waiting.`;
  
  useNotificationHistoryStore.getState().addNotification({
    type: 'reminder',
    title,
    body,
    deepLink: '/workouts'
  });

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
};

export const scheduleRestTimerComplete = async (seconds: number) => {
  if (Platform.OS === 'web') return;
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Rest complete! 🔔",
      body: "Get back to work. Next set starts now.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
};

export const triggerRankChangeNotification = async (newRank: number, challengeName: string) => {
  if (Platform.OS === 'web') return;
  
  const title = "Leaderboard Update 🏆";
  const body = `You just moved to rank #${newRank} in ${challengeName}! Keep it up.`;

  useNotificationHistoryStore.getState().addNotification({
    type: 'challenge',
    title,
    body,
    deepLink: '/challenges'
  });

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // Send immediately
  });
};

export const triggerCoachMessageNotification = async (coachName: string) => {
  if (Platform.OS === 'web') return;
  
  const title = `Message from Coach ${coachName}`;
  const body = "Check your inbox for a new update on your plan.";

  useNotificationHistoryStore.getState().addNotification({
    type: 'coach',
    title,
    body,
    deepLink: '/profile' // Or messages if a route existed
  });

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
};
