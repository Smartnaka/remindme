import { Platform } from 'react-native';
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
    // We start with the "next occurrence" of the lecture to ensure we have a valid baseline date
    const nextMsg = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime);
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
      },
      trigger: {
        channelId: 'lecture-reminders',
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
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
      const nextOccurrence = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime);
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
          },
          trigger: {
            channelId: 'lecture-reminders',
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
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      alert("Permission not granted for notifications");
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification from the RemindMe app!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { seconds: 2 },
    });
  } catch (error) {
    console.error("Test notification failed", error);
  }
};

const getDayNumber = (dayOfWeek: string): number => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const index = days.findIndex(d => dayOfWeek === d);
  return index === -1 ? 1 : (index === 0 ? 1 : index + 1);
};
