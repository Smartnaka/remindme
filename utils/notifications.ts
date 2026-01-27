import { Platform, Alert } from 'react-native';
import { Lecture } from '@/types/lecture';
import { getDateForNextOccurrence, parseTime } from './dateTime';

let Notifications: any = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.log('[Notifications] expo-notifications not available:', error);
  }
}

const ensureNotificationChannel = async () => {
  if (Platform.OS === 'android' && Notifications) {
    await Notifications.setNotificationChannelAsync('lecture-reminders', {
      name: 'Lecture Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00C896',
      sound: 'default', // Ensure sound is enabled
      enableVibrate: true,
    });
  }
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !Notifications) {
    console.log('[Notifications] Notifications not available, skipping permissions');
    return true;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    console.log('[Notifications] Permission status:', finalStatus);

    // Android 12+ requires explicit permission for exact alarms
    if (Platform.OS === 'android') {
      const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
      if (androidVersion >= 31) {
        try {
          // Check if we can schedule exact alarms
          const canScheduleExactAlarms = await Notifications.getPermissionsAsync();
          console.log('[Notifications] Android 12+ exact alarm check:', canScheduleExactAlarms);

          // On Android 12+, guide user to enable exact alarms in settings
          if (finalStatus === 'granted') {
            console.log('[Notifications] ⚠️ IMPORTANT: On Android 12+, you must manually enable "Alarms & Reminders" permission in app settings for notifications to work when the app is closed.');
          }
        } catch (error) {
          console.log('[Notifications] Could not check exact alarm permission:', error);
        }
      }
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
};

export const scheduleWeeklyNotification = async (lecture: Lecture, offsetMinutes: number = 15): Promise<string | null> => {
  if (Platform.OS === 'web' || !Notifications) {
    console.log('[Notifications] Notifications not available, skipping scheduling');
    return null;
  }

  try {
    await ensureNotificationChannel();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // Correctly calculate the trigger date by subtracting the offset
    // We pass the offset to ensure getDateForNextOccurrence returns a date where (date - offset) is in the future
    const nextMsg = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime, offsetMinutes);
    const triggerDate = new Date(nextMsg.getTime() - offsetMinutes * 60000);

    // Expo Calendar Trigger requires 1-7 for Sunday-Saturday
    // triggerDate.getDay() returns 0-6 (Sun-Sat)
    const triggerWeekday = triggerDate.getDay() + 1;

    console.log(`[Notifications] Scheduling param: Weekday ${triggerWeekday}, Hour ${triggerDate.getHours()}, Minute ${triggerDate.getMinutes()}`);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${lecture.courseName}`,
        body: `Starts in ${offsetMinutes} minutes${lecture.location ? ` at ${lecture.location}` : ''}`,
        data: { lectureId: lecture.id },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sticky: true, // Makes notification persistent (can't swipe away)
        autoDismiss: false, // Notification stays until manually dismissed or class starts
      },
      trigger: {
        channelId: 'lecture-reminders',
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: triggerWeekday,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      },
    });

    console.log(`[Notifications] Scheduled notification for ${lecture.courseName} at ${triggerDate.toLocaleTimeString()} (Offset: ${offsetMinutes}m)`);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    return null;
  }
};

// New: Schedule exact-time alarm notifications for the next 4 weeks (Android only)
export const scheduleExactAlarmNotifications = async (lecture: Lecture, offsetMinutes: number = 15): Promise<string[]> => {
  if (Platform.OS !== 'android' || !Notifications) {
    console.log('[Alarms] Exact alarms only available on Android, skipping');
    return [];
  }

  try {
    await ensureNotificationChannel();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('[Alarms] Permission not granted');
      return [];
    }

    const notificationIds: string[] = [];
    const now = new Date();

    // Schedule for the next 4 occurrences (4 weeks)
    for (let week = 0; week < 4; week++) {
      // Pass offsetMinutes here too so the base date handling remains correct
      const nextOccurrence = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime, offsetMinutes);
      const triggerDate = new Date(nextOccurrence.getTime() - offsetMinutes * 60000);

      // Add weeks to the trigger date
      triggerDate.setDate(triggerDate.getDate() + (week * 7));

      // Only schedule if in the future
      if (triggerDate > now) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${lecture.courseName}`,
            body: `Starts in ${offsetMinutes} minutes${lecture.location ? ` at ${lecture.location}` : ''}`,
            data: {
              lectureId: lecture.id,
              isAlarmBased: true,
              week: week
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            sticky: true, // Persistent notification
            autoDismiss: false, // Can't swipe away
          },
          trigger: {
            channelId: 'lecture-reminders',
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });

        notificationIds.push(notificationId);
        console.log(`[Alarms] Scheduled alarm ${week + 1}/4 for ${lecture.courseName} at ${triggerDate.toLocaleString()}`);
      }
    }

    console.log(`[Alarms] Total alarms scheduled: ${notificationIds.length}`);
    return notificationIds;
  } catch (error) {
    console.error('[Alarms] Error scheduling exact alarms:', error);
    return [];
  }
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[Notifications] Cancelled notification:', notificationId);
  } catch (error) {
    console.error('[Notifications] Error cancelling notification:', error);
  }
}

// Cancel multiple notifications (for alarm-based system)
export const cancelMultipleNotifications = async (notificationIds: string[]): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    await Promise.all(notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    console.log(`[Notifications] Cancelled ${notificationIds.length} notifications`);
  } catch (error) {
    console.error('[Notifications] Error cancelling multiple notifications:', error);
  }
}


export const sendTestNotification = async (): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) {
    console.log('[Test] Notifications not available on web');
    return;
  }

  try {
    console.log('[Test] Requesting notification permissions...');
    const hasPermission = await requestNotificationPermissions();

    if (!hasPermission) {
      console.log('[Test] ❌ Permission DENIED');
      Alert.alert(
        "Permission Required",
        "Please enable notifications in your device settings to receive reminders.",
        [{ text: "OK" }]
      );
      return;
    }

    console.log('[Test] ✅ Permission granted, scheduling test notification...');
    await ensureNotificationChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Test Notification",
        body: "This notification will work even when the app is closed!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { test: true },
      },
      trigger: { seconds: 2 },
    });

    console.log('[Test] ✅ Test notification scheduled for 2 seconds from now');
    Alert.alert(
      "Test Scheduled",
      "You should receive a test notification in 2 seconds. You can close the app and it will still appear!",
      [{ text: "OK" }]
    );
  } catch (error) {
    console.error('[Test] ❌ Test notification failed:', error);
    Alert.alert(
      "Test Failed",
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      [{ text: "OK" }]
    );
  }
};

const getDayNumber = (dayOfWeek: string): number => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const index = days.findIndex(d => dayOfWeek === d);
  return index === -1 ? 1 : (index === 0 ? 1 : index + 1);
};
