import { Platform, Alert } from 'react-native';
import { Lecture } from '@/types/lecture';
import { Assignment } from '@/types/assignment';
import { getDateForNextOccurrence, parseTime } from './dateTime';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditional logger — only logs in development builds
const log = __DEV__ ? console.log : () => {};

if (Platform.OS !== 'web') {
  try {
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
    log('[Notifications] expo-notifications not available:', error);
  }
}

const ensureNotificationChannel = async () => {
  log('[Notifications] ensureNotificationChannel execution');
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

const registerNotificationCategories = async () => {
  if (Platform.OS === 'web' || !Notifications) return;

  // Guard: setNotificationCategoryAsync may not exist in all Expo SDK versions
  if (typeof Notifications.setNotificationCategoryAsync !== 'function') {
    log('[Notifications] setNotificationCategoryAsync not available, skipping category registration');
    return;
  }

  await Notifications.setNotificationCategoryAsync('reminder', [
    {
      identifier: 'snooze-10',
      buttonTitle: 'Snooze 10m',
      options: {
        opensAppToForeground: false,
      },
      textInput: {
          placeholder: 'Minutes',
          submitButtonTitle: 'Snooze',
      },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: {
        isDestructive: true,
        opensAppToForeground: false,
      },
    },
  ]);
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !Notifications) {
    log('[Notifications] Notifications not available, skipping permissions');
    return true;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    log('[Notifications] Permission status:', finalStatus);

    // Android 12+ requires explicit permission for exact alarms
    if (Platform.OS === 'android') {
      const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
      if (androidVersion >= 31) {
        try {
          // Check if we can schedule exact alarms
          const canScheduleExactAlarms = await Notifications.getPermissionsAsync();
          log('[Notifications] Android 12+ exact alarm check:', canScheduleExactAlarms);

          // On Android 12+, guide user to enable exact alarms in settings
          if (finalStatus === 'granted') {
            log('[Notifications] ⚠️ IMPORTANT: On Android 12+, you must manually enable "Alarms & Reminders" permission in app settings for notifications to work when the app is closed.');
          }
        } catch (error) {
          log('[Notifications] Could not check exact alarm permission:', error);
        }
      }
    }

    if (finalStatus === 'granted') {
      await registerNotificationCategories();
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
};

const isNotificationAllowed = async (triggerDate: Date, cachedSettings?: any): Promise<boolean> => {
  try {
    let settings = cachedSettings;
    if (!settings) {
      const settingsStr = await AsyncStorage.getItem('@settings');
      if (!settingsStr) return true;
      settings = JSON.parse(settingsStr);
    }

    // Check Semester Limits
    if (settings.semesterStart) {
      const semStart = new Date(settings.semesterStart);
      if (triggerDate < semStart) return false;
    }
    if (settings.semesterEnd) {
      const semEnd = new Date(settings.semesterEnd);
      semEnd.setHours(23, 59, 59, 999);
      if (triggerDate > semEnd) return false;
    }

    // Check Quiet Hours
    if (settings.quietHoursEnabled && settings.quietHoursStart && settings.quietHoursEnd) {
      const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
      const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);
      
      const triggerH = triggerDate.getHours();
      const triggerM = triggerDate.getMinutes();

      const triggerMinutes = triggerH * 60 + triggerM;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      // Guard: if start === end, the range is invalid — don't block
      if (startMinutes === endMinutes) return true;

      if (startMinutes > endMinutes) {
        // Crosses midnight (e.g. 22:00 to 07:00)
        if (triggerMinutes >= startMinutes || triggerMinutes < endMinutes) return false;
      } else {
        // Same day (e.g. 08:00 to 12:00)
        if (triggerMinutes >= startMinutes && triggerMinutes < endMinutes) return false;
      }
    }

    return true;
  } catch (e) {
    return true; // fail open
  }
};

export const scheduleWeeklyNotification = async (lecture: Lecture, offsetMinutes: number = 15): Promise<string | null> => {
  if (Platform.OS === 'web' || !Notifications) {
    log('[Notifications] Notifications not available, skipping scheduling');
    return null;
  }

  try {
    await ensureNotificationChannel();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      log('[Notifications] Permission not granted');
      return null;
    }

    // Correctly calculate the trigger date by subtracting the offset
    // We pass the offset to ensure getDateForNextOccurrence returns a date where (date - offset) is in the future
    const nextMsg = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime, offsetMinutes);
    const triggerDate = new Date(nextMsg.getTime() - offsetMinutes * 60000);

    if (!(await isNotificationAllowed(triggerDate))) {
      log('[Notifications] Blocked by Quiet Hours or Semester limits');
      return null;
    }

    // Expo Calendar Trigger requires 1-7 for Sunday-Saturday
    // triggerDate.getDay() returns 0-6 (Sun-Sat)
    const triggerWeekday = triggerDate.getDay() + 1;

    log(`[Notifications] Scheduling param: Weekday ${triggerWeekday}, Hour ${triggerDate.getHours()}, Minute ${triggerDate.getMinutes()}`);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${lecture.courseName}`,
        body: `Starts in ${offsetMinutes} minutes${lecture.location ? ` at ${lecture.location}` : ''}`,
        data: { lectureId: lecture.id },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'reminder',
      },
      trigger: {
        channelId: 'lecture-reminders',
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: triggerWeekday,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
      },
    });

    log(`[Notifications] Scheduled notification for ${lecture.courseName} at ${triggerDate.toLocaleTimeString()} (Offset: ${offsetMinutes}m)`);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    return null;
  }
};

export const scheduleBiWeeklyNotifications = async (lecture: Lecture, offsetMinutes: number = 15): Promise<string[]> => {
  log('[Notifications] scheduleBiWeeklyNotifications called');
  if (Platform.OS === 'web' || !Notifications) return [];

  try {
    await ensureNotificationChannel();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return [];

    const notificationIds: string[] = [];
    const recurrence = lecture.recurrence;

    if (!recurrence || recurrence.type !== 'biweekly') {
        log('[Notifications] Bi-weekly recurrence not configured, skipping');
        return [];
    }

    const startDate = new Date(recurrence.startDate);
    if (isNaN(startDate.getTime())) {
      console.error('[Notifications] Invalid bi-weekly startDate:', recurrence.startDate);
      return [];
    }
    const endDate = recurrence.endDate ? new Date(recurrence.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 6));
    const now = new Date();

    // Pre-read settings once for the entire loop instead of reading per-occurrence
    const settingsStr = await AsyncStorage.getItem('@settings');
    const cachedSettings = settingsStr ? JSON.parse(settingsStr) : null;

    // Align start date to the correct time from lecture.startTime
    const { hours, minutes } = parseTime(lecture.startTime);
    startDate.setHours(hours, minutes, 0, 0);

    // Iterate every 2 weeks (14 days)
    let currentDate = new Date(startDate);
    
    // Safety limit: Schedule max 10 occurrences to avoid iOS 64 limit
    let limit = 0;
    const MAX_OCCURRENCES = 10;
    
    log(`[Notifications] Bi-weekly: ${startDate.toISOString()} → ${endDate.toISOString()}, max ${MAX_OCCURRENCES} occurrences`);

    while (currentDate.getTime() <= endDate.getTime() && limit < MAX_OCCURRENCES) {
       const triggerDate = new Date(currentDate.getTime() - offsetMinutes * 60000);

       if (triggerDate > now) {
          if (!(await isNotificationAllowed(triggerDate))) {
            log(`[Notifications] Bi-weekly occurrence blocked by limits for ${lecture.courseName} at ${triggerDate.toLocaleString()}`);
            // Skip this occurrence if not allowed
          } else {
            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `${lecture.courseName}`,
                body: `Starts in ${offsetMinutes} minutes${lecture.location ? ` at ${lecture.location}` : ''}`,
                data: { lectureId: lecture.id, type: 'biweekly-reminder' },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                categoryIdentifier: 'reminder',
              },
              trigger: {
                channelId: 'lecture-reminders',
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
              },
            });
            notificationIds.push(notificationId);
            log(`[Notifications] Scheduled bi-weekly for ${lecture.courseName} at ${triggerDate.toLocaleString()}`);
          }
       }

       // Add 14 days
       currentDate.setDate(currentDate.getDate() + 14);
       limit++;
    }

    return notificationIds;
  } catch (error) {
    console.error('[Notifications] Error scheduling bi-weekly:', error);
    return [];
  }
};

// Schedule exact-time alarm notifications for the next 4 weeks (Android only)
export const scheduleExactAlarmNotifications = async (lecture: Lecture, offsetMinutes: number = 15): Promise<string[]> => {
  if (Platform.OS !== 'android' || !Notifications) {
    log('[Alarms] Exact alarms only available on Android, skipping');
    return [];
  }

  try {
    await ensureNotificationChannel();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      log('[Alarms] Permission not granted');
      return [];
    }

    const notificationIds: string[] = [];
    const now = new Date();

    // Pre-cache settings for the loop
    const settingsStr = await AsyncStorage.getItem('@settings');
    const cachedSettings = settingsStr ? JSON.parse(settingsStr) : null;

    // Compute the base trigger date once, then offset by weeks
    const baseOccurrence = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime, offsetMinutes);
    const baseTrigger = new Date(baseOccurrence.getTime() - offsetMinutes * 60000);

    for (let week = 0; week < 4; week++) {
      const triggerDate = new Date(baseTrigger.getTime() + week * 7 * 24 * 60 * 60 * 1000);

      if (triggerDate > now) {
        if (!(await isNotificationAllowed(triggerDate, cachedSettings))) {
          log(`[Alarms] Occurrence ${week + 1} blocked by limits`);
          continue;
        }

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
            categoryIdentifier: 'reminder',
          },
          trigger: {
            channelId: 'lecture-reminders',
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });

        notificationIds.push(notificationId);
        log(`[Alarms] Scheduled ${week + 1}/4 for ${lecture.courseName} at ${triggerDate.toLocaleString()}`);
      }
    }

    log(`[Alarms] Total scheduled: ${notificationIds.length}`);
    return notificationIds;
  } catch (error) {
    log('[Alarms] Error scheduling exact alarms: ' + error);
    return [];
  }
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    log('[Notifications] Cancelled notification:', notificationId);
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
    log(`[Notifications] Cancelled ${notificationIds.length} notifications`);
  } catch (error) {
    console.error('[Notifications] Error cancelling multiple notifications:', error);
  }
}

// Schedule a reminder 2 hours before the class
export const scheduleTwoHourReminder = async (lecture: Lecture): Promise<string | null> => {
  if (Platform.OS === 'web' || !Notifications) return null;

  try {
    const offsetMinutes = 120;
    const nextMsg = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime, offsetMinutes);
    const triggerDate = new Date(nextMsg.getTime() - offsetMinutes * 60000);

    // Check quiet hours and semester bounds
    if (!(await isNotificationAllowed(triggerDate))) {
      log('[Notifications] 2hr reminder blocked by quiet hours or semester limits');
      return null;
    }

    const triggerWeekday = triggerDate.getDay() + 1;

    const notificationId = await Notifications.scheduleNotificationAsync({
       content: {
        title: `Upcoming: ${lecture.courseName}`,
        body: `Class starts in 2 hours${lecture.location ? ` at ${lecture.location}` : ''}. Don't forget your materials!`,
        data: { lectureId: lecture.id, type: '2hr-reminder' },
        sound: true,
        categoryIdentifier: 'reminder',
      },
      trigger: {
        channelId: 'lecture-reminders',
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: triggerWeekday,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
      },
    });
    log(`[Notifications] Scheduled 2hr reminder for ${lecture.courseName} at ${triggerDate.toLocaleTimeString()}`);
    return notificationId;
  } catch (error) {
    log('[Notifications] Error scheduling 2hr reminder: ' + error);
    return null;
  }
};

export const manageDailySummaryNotification = async (timeStr: string, existingId?: string): Promise<string | null> => {
    if (Platform.OS === 'web' || !Notifications) return null;

    try {
        if (existingId) {
            await Notifications.cancelScheduledNotificationAsync(existingId);
        }

        const [hours, minutes] = timeStr.split(':').map(Number);
        
        let greeting = "Hello!";
        if (hours >= 5 && hours < 12) greeting = "Good Morning! ☀️";
        else if (hours >= 12 && hours < 17) greeting = "Good Afternoon! 🌤️";
        else if (hours >= 17 && hours < 21) greeting = "Good Evening! 🌙";
        else greeting = "Late Night Reminder! 🦉";

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: greeting,
                body: "Check your schedule for today's classes and assignments.",
                sound: true,
                categoryIdentifier: 'reminder',
            },
            trigger: {
                channelId: 'lecture-reminders',
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes || 0,
            },
        });
        
        log(`[Notifications] Scheduled daily summary for ${timeStr} with greeting '${greeting}' (ID: ${notificationId})`);
        return notificationId;
    } catch (e) {
        console.error("Error scheduling daily summary", e);
        return existingId || null;
    }
}

export const scheduleAssignmentNotification = async (assignment: Assignment, courseName: string, offsetMinutes: number = 1440): Promise<string | null> => {
   if (Platform.OS === 'web' || !Notifications) return null;

   try {
     const hasPermission = await requestNotificationPermissions();
     if (!hasPermission) return null;

     const dueDate = new Date(assignment.dueDate);
     const triggerDate = new Date(dueDate.getTime() - offsetMinutes * 60000);
     const now = new Date();

     if (triggerDate > now) {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: `Upcoming Assignment: ${courseName}`,
                body: `'${assignment.title}' is due in ${offsetMinutes >= 1440 ? Math.floor(offsetMinutes / 1440) + ' days' : offsetMinutes + ' minutes'}.`,
                data: { assignmentId: assignment.id },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                channelId: 'lecture-reminders',
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
            },
        });
        log(`[Notifications] Scheduled assignment reminder for ${assignment.title} at ${triggerDate.toLocaleString()}`);
        return notificationId;
     }
     
     return null;
   } catch (error) {
     console.error('[Notifications] Error scheduling assignment notification:', error);
     return null;
   }
};


export const sendTestNotification = async (): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) {
    log('[Test] Notifications not available on web');
    return;
  }

  try {
    log('[Test] Requesting notification permissions...');
    const hasPermission = await requestNotificationPermissions();

    if (!hasPermission) {
      log('[Test] ❌ Permission DENIED');
      Alert.alert(
        "Permission Required",
        "Please enable notifications in your device settings to receive reminders.",
        [{ text: "OK" }]
      );
      return;
    }

    log('[Test] ✅ Permission granted, scheduling test notification...');
    await ensureNotificationChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Test Notification",
        body: "This notification will work even when the app is closed!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { test: true },
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2 
      },
    });

    log('[Test] ✅ Test notification scheduled for 2 seconds from now');
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
  if (index === -1) throw new Error(`[Notifications] Invalid dayOfWeek: "${dayOfWeek}"`);
  return index + 1; // Expo: 1=Sunday ... 7=Saturday
};

export const handleNotificationResponse = async (response: any) => {
  const actionIdentifier = response.actionIdentifier;
  const content = response.notification.request.content;

  if (actionIdentifier === 'snooze-10') {
    // Read custom minutes from user text input, fallback to 10
    const customMinutes = parseInt(response.userText, 10);
    const snoozeMinutes = (!isNaN(customMinutes) && customMinutes > 0 && customMinutes <= 120)
      ? customMinutes
      : 10;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
        sound: true,
        categoryIdentifier: 'reminder',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * snoozeMinutes,
      },
    });
    log(`[Notifications] Snoozed notification for ${snoozeMinutes} minutes`);
  } else if (actionIdentifier === 'dismiss') {
    log('[Notifications] Dismissed notification');
  }
};
