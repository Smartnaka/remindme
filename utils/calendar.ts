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

        // 1. Find or Create our dedicated calendar
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        let calendarId = calendars.find(c => c.title === CALENDAR_NAME)?.id;

        if (!calendarId) {
            calendarId = await createCalendar();
        }

        // 2. Get existing events from our calendar to track what we've created
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Look back 1 year
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1); // Look ahead 1 year

        const existingEvents = await Calendar.getEventsAsync(
            [calendarId],
            startDate,
            endDate
        );

        // Create a map of existing event IDs that belong to our app
        const appEventIds = new Set(
            existingEvents
                .filter(event => event.notes?.includes('Created by RemindMe App'))
                .map(event => event.id)
        );

        // 3. Sync Events - Update existing or create new
        const lectureIds = new Set(lectures.map(l => l.id));
        let createdCount = 0;
        let updatedCount = 0;

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

            const eventData = {
                title: lecture.courseName,
                startDate: nextDate,
                endDate: endDate,
                location: lecture.location || 'Unknown Location',
                notes: 'Created by RemindMe App',
                alarms: [{ relativeOffset: -offsetMinutes }],
                recurrenceRule: {
                    frequency: Calendar.Frequency.WEEKLY,
                    interval: 1,
                },
            };

            // Check if we already have a calendar event for this lecture
            if (lecture.calendarEventId) {
                try {
                    // Try to update existing event
                    await Calendar.updateEventAsync(lecture.calendarEventId, eventData);
                    updatedCount++;
                    appEventIds.delete(lecture.calendarEventId);
                } catch (error) {
                    // Event might have been deleted, create a new one
                    console.log(`[Calendar] Event ${lecture.calendarEventId} not found, creating new one`);
                    const newEventId = await Calendar.createEventAsync(calendarId, eventData);
                    // Note: We should update the lecture with new calendarEventId, but that requires
                    // updating the lecture in the context. For now, we'll just create it.
                    createdCount++;
                }
            } else {
                // Create new event
                const eventId = await Calendar.createEventAsync(calendarId, eventData);
                createdCount++;
                // Note: Ideally we'd update the lecture with calendarEventId here
                // This would require passing updateLecture function or returning event IDs
            }
        }

        // 4. Clean up orphaned events (events in calendar but not in our lectures)
        // Only delete events that we created (have our notes marker)
        for (const eventId of appEventIds) {
            try {
                await Calendar.deleteEventAsync(eventId);
            } catch (error) {
                console.error(`[Calendar] Failed to delete event ${eventId}:`, error);
            }
        }

        const totalSynced = createdCount + updatedCount;

        Alert.alert(
            "Success",
            `Synced ${totalSynced} lecture${totalSynced !== 1 ? 's' : ''} to your "${CALENDAR_NAME}" calendar.`
        );

    } catch (error) {
        console.error('[Calendar] Error syncing:', error);
        Alert.alert("Sync Failed", "An error occurred while syncing to calendar.");
    }
};
