import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { Lecture } from '@/types/lecture';
import { getDateForNextOccurrence } from './dateTime';

const CALENDAR_NAME = 'RemindMe Lectures';

export const requestCalendarPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
        const { status: reminderStatus } = await Calendar.requestRemindersPermissionsAsync();
        return reminderStatus === 'granted';
    }
    return false;
};

const getDefaultCalendarSource = async () => {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.source;
};

const createCalendar = async (): Promise<string> => {
    const defaultCalendarSource =
        Platform.OS === 'ios'
            ? await getDefaultCalendarSource()
            : { isLocalAccount: true, name: 'RemindMe', type: Calendar.CalendarType.LOCAL };

    const newCalendarID = await Calendar.createCalendarAsync({
        title: CALENDAR_NAME,
        color: '#007AFF', // Primary Blue
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendarSource.id,
        source: defaultCalendarSource,
        name: 'remindme_lectures',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return newCalendarID;
};

export const syncLecturesToCalendar = async (lectures: Lecture[], offsetMinutes: number = 15): Promise<void> => {
    if (Platform.OS === 'web') {
        alert("Calendar sync is not available on web.");
        return;
    }

    try {
        const hasPermission = await requestCalendarPermissions();
        if (!hasPermission) {
            Alert.alert("Permission Denied", "We need access to your calendar to sync lectures.");
            return;
        }

        // 1. Find or Create our dedicate calendar
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        let calendarId = calendars.find(c => c.title === CALENDAR_NAME)?.id;

        if (!calendarId) {
            calendarId = await createCalendar();
        } else {
            // Clear existing events to prevent duplicates (simple sync strategy)
            // Note: For a production app, we might check diffs, but for now wiping and re-adding is safer/simpler
            // However, wiping requires finding all events. 
            // Let's just create new ones or maybe we should store eventId in lecture?
            // For this iteration: "Sync" will just add them.
            // Actually, to avoid duplicates, let's delete the calendar and recreate it? 
            // Aggressive but ensures cleanliness.
            await Calendar.deleteCalendarAsync(calendarId);
            calendarId = await createCalendar();
        }

        // 2. Add Events
        for (const lecture of lectures) {
            const nextDate = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime);

            // End date calculation
            const [endHours, endMinutes] = lecture.endTime.split(':').map(Number);
            const endDate = new Date(nextDate);
            endDate.setHours(endHours, endMinutes, 0, 0);

            // Handle overnight classes if any (end time < start time)
            if (endDate < nextDate) {
                endDate.setDate(endDate.getDate() + 1);
            }

            await Calendar.createEventAsync(calendarId, {
                title: lecture.courseName,
                startDate: nextDate,
                endDate: endDate,
                location: lecture.location || 'Unknown Location',
                notes: 'Created by RemindMe App',
                alarms: [{ relativeOffset: -offsetMinutes }], // Alarm offsetMinutes before
                recurrenceRule: {
                    frequency: Calendar.Frequency.WEEKLY,
                    interval: 1,
                },
            });
        }

        Alert.alert("Success", `Synced ${lectures.length} lectures to your "${CALENDAR_NAME}" calendar.`);

    } catch (error) {
        console.error('[Calendar] Error syncing:', error);
        Alert.alert("Sync Failed", "An error occurred while syncing to calendar.");
    }
};
