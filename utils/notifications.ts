import { Platform } from 'react-native';
import { Lecture } from '@/types/lecture';
import { Assignment } from '@/types/assignment';
import { getDateForNextOccurrence, parseTime } from './dateTime';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditional logger — only logs in development builds
const log = __DEV__ ? console.log : () => {};

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const canUseExactAlarmScheduling = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !Notifications) return false;

  const androidVersion =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);

  // On Android < 12, exact alarm special access is not required.
  if (androidVersion < 31) return true;

  try {
    const permissions = await Notifications.getPermissionsAsync();
    const canScheduleExactNotifications =
      'canScheduleExactNotifications' in permissions
        ? Boolean((permissions as any).canScheduleExactNotifications)
        : false;

    log('[Notifications] canUseExactAlarmScheduling:', canScheduleExactNotifications);
    return canScheduleExactNotifications;
  } catch (error) {
    log('[Notifications] Failed to read exact alarm capability:', error);
    return false;
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
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    log('[Notifications] Permission status:', finalStatus);

    // Android 12+ (API 31+) requires explicit permission for exact alarms
    if (Platform.OS === 'android') {
      const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
      if (androidVersion >= 31) {
        try {
          const canScheduleExactNotifications = await canUseExactAlarmScheduling();
          log('[Notifications] Android 12+ canScheduleExactNotifications:', canScheduleExactNotifications);

          if (!canScheduleExactNotifications) {
            // Intentionally non-blocking: avoid repeatedly interrupting users
            // with an alert on screens that frequently trigger permission checks.
            log('[Notifications] Exact alarms disabled in system settings');
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
          if (!(await isNotificationAllowed(triggerDate, cachedSettings))) {
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
    const canUseExactAlarms = await canUseExactAlarmScheduling();
    if (!canUseExactAlarms) {
      // Returning [] is intentional: LectureContext falls back to weekly repeating reminders,
      // which are more reliable than delayed inexact date alarms in preview/dev scenarios.
      log('[Alarms] Exact alarms unavailable - forcing fallback to weekly scheduling');
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

// Schedule a "class is starting NOW" notification at exact start time
export const scheduleStartNowNotification = async (lecture: Lecture): Promise<string | null> => {
  if (Platform.OS === 'web' || !Notifications) return null;

  try {
    await ensureNotificationChannel();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // offset = 0 means fire at the exact class start time
    const nextOccurrence = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime, 0);
    const triggerDate = nextOccurrence; // No offset subtraction

    if (!(await isNotificationAllowed(triggerDate))) {
      log('[Notifications] Start-now reminder blocked by quiet hours or semester limits');
      return null;
    }

    if (Platform.OS === 'android') {
      // Android: use exact date trigger (more reliable)
      const now = new Date();
      if (triggerDate <= now) {
        // Already passed this week, schedule for next week
        triggerDate.setDate(triggerDate.getDate() + 7);
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${lecture.courseName} is starting NOW`,
          body: `${lecture.location ? `${lecture.location} • ` : ''}Tap to mark attendance`,
          data: { lectureId: lecture.id, type: 'start-now' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'reminder',
        },
        trigger: {
          channelId: 'lecture-reminders',
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      log(`[Notifications] Scheduled start-now for ${lecture.courseName} at ${triggerDate.toLocaleTimeString()}`);
      return notificationId;
    } else {
      // iOS: use weekly repeating trigger
      const triggerWeekday = triggerDate.getDay() + 1;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${lecture.courseName} is starting NOW`,
          body: `${lecture.location ? `${lecture.location} • ` : ''}Tap to mark attendance`,
          data: { lectureId: lecture.id, type: 'start-now' },
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
      log(`[Notifications] Scheduled start-now for ${lecture.courseName} at ${triggerDate.toLocaleTimeString()}`);
      return notificationId;
    }
  } catch (error) {
    log('[Notifications] Error scheduling start-now: ' + error);
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

        // Build dynamic body from stored data
        let body = '';

        try {
            const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = DAYS[new Date().getDay()];

            // --- Lectures for today ---
            const lecturesStr = await AsyncStorage.getItem('@lectures');
            const lectures: any[] = lecturesStr ? JSON.parse(lecturesStr) : [];
            const todayLectures = lectures
                .filter((l: any) => l.dayOfWeek === today)
                .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));

            // --- Assignments due today ---
            const assignmentsStr = await AsyncStorage.getItem('@assignments');
            const allAssignments: any[] = assignmentsStr ? JSON.parse(assignmentsStr) : [];
            const todayStr = getLocalDateKey(new Date()); // YYYY-MM-DD local
            const dueToday = allAssignments.filter((a: any) => {
                if (a.isCompleted) return false;
                if (!a.dueDate) return false;
                return getLocalDateKey(new Date(a.dueDate)) === todayStr;
            });

            // --- Exams today ---
            const examsStr = await AsyncStorage.getItem('@exams');
            const allExams: any[] = examsStr ? JSON.parse(examsStr) : [];
            const examsToday = allExams.filter((e: any) => {
                if (!e.date) return false;
                return getLocalDateKey(new Date(e.date)) === todayStr;
            });

            // Build body parts
            const parts: string[] = [];

            // Exam alert (highest priority, shown first)
            if (examsToday.length > 0) {
                const examNames = examsToday.map((e: any) => {
                    const time = new Date(e.date);
                    const h = time.getHours();
                    const m = time.getMinutes();
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    const timeStr = m > 0 ? `${h12}:${m.toString().padStart(2, '0')}${ampm}` : `${h12}${ampm}`;
                    return `${e.courseName} at ${timeStr}`;
                });
                parts.push(`🚨 EXAM TODAY: ${examNames.join(', ')}`);
            }

            // Classes
            if (todayLectures.length > 0) {
                const classNames = todayLectures.map((l: any) => {
                    const [h, m] = (l.startTime || '00:00').split(':').map(Number);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    const timeStr = m > 0 ? `${h12}:${m.toString().padStart(2, '0')}${ampm}` : `${h12}${ampm}`;
                    return `${l.courseName} at ${timeStr}`;
                });
                parts.push(`${todayLectures.length} class${todayLectures.length > 1 ? 'es' : ''} today: ${classNames.join(', ')}`);
            } else {
                parts.push('No classes today — enjoy your day!');
            }

            // Assignments
            if (dueToday.length > 0) {
                parts.push(`${dueToday.length} assignment${dueToday.length > 1 ? 's' : ''} due`);
            }

            body = parts.join('. ') + '.';
        } catch (dataError) {
            log('[Notifications] Could not build dynamic summary, using fallback:', dataError);
            body = "Check your schedule for today's classes and assignments.";
        }

        // Update title for exams
        const titleSuffix = " — Your Day Ahead";

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: `${greeting}${titleSuffix}`,
                body,
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
        
        log(`[Notifications] Scheduled daily summary for ${timeStr} — body: "${body}" (ID: ${notificationId})`);
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
    const snoozeMinutes = 10;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: `Snoozed — reminder in ${snoozeMinutes} minutes`,
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
    return null;
  } else if (actionIdentifier === 'dismiss') {
    log('[Notifications] Dismissed notification');
    return null;
  } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    // This is the default tap on the notification
    log('[Notifications] Default action triggered, returning data for navigation');
    return content.data;
  }
  
  return null;
};
