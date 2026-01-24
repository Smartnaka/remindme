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
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    const { hours, minutes } = parseTime(lecture.startTime);
    const notificationTime = new Date();
    // Wrap around handled by Date object automatically (e.g. going back to previous day)
    // determining the day of week for trigger is slightly complex if it wraps days, 
    // but for simplicity assuming same day for now or trusting expo trigger logic 
    // actually, if we substract 15 mins from 00:00 it becomes 23:45 of previous day.
    // The calendar trigger in Expo takes weekday, hour, minute.
    // If the time shift changes the day, we need to adjust the weekday too.

    // Set arbitrary date to calculate valid hour/minute
    notificationTime.setHours(hours, minutes, 0, 0);
    notificationTime.setMinutes(notificationTime.getMinutes() - offsetMinutes);

    let notificationWeekday = getDayNumber(lecture.dayOfWeek);

    // Check if we rolled back to previous day
    // This simple check works if we assume we are setting it on a hypothetical "today" 
    // and checking if hours wrapped. 
    // Improved logic:
    // Create a date for the "Next Occurrence" of this lecture then subtract offset.

    const nextMsg = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime);
    const triggerDate = new Date(nextMsg.getTime() - offsetMinutes * 60000); // subtract offset in ms

    const triggerWeekday = triggerDate.getDay() + 1; // getDay is 0-6 (Sun-Sat), we need 1-7

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${lecture.courseName}`,
        body: `Starts in ${offsetMinutes} minutes${lecture.location ? ` at ${lecture.location}` : ''}`,
        data: { lectureId: lecture.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: triggerWeekday,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      },
    });

    console.log(`[Notifications] Scheduled notification for ${lecture.courseName} at ${triggerDate.toLocaleTimeString()} (${offsetMinutes} min before)`);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    return null;
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
};

const getDayNumber = (dayOfWeek: string): number => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const index = days.findIndex(d => dayOfWeek === d);
  return index === -1 ? 1 : (index === 0 ? 1 : index + 1);
};
