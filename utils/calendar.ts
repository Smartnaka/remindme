import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { Lecture } from '@/types/lecture';
import { getDateForNextOccurrence } from './dateTime';

const CALENDAR_NAME = 'RemindMe Lectures';

export const requestCalendarPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
        // requestRemindersPermissionsAsync is iOS-only
        if (Platform.OS === 'ios') {
            const { status: reminderStatus } = await Calendar.requestRemindersPermissionsAsync();
            return reminderStatus === 'granted';
        }
        return true; // Android only needs calendar permission
    }
    return false;
};

const getAndroidCalendarSource = async (): Promise<Calendar.Source> => {
    // 1. Try to find an existing Google account or Exchange account
    const sources = await Calendar.getSourcesAsync();

    // Prioritize Google accounts, then Exchange
    let validSource = sources.find(source => source.name === 'com.google');
    if (!validSource) {
        validSource = sources.find(source => source.type === Calendar.SourceType.LOCAL);
    }
    if (!validSource) {
        // Fallback to the first available source that isn't read-only if possible
        // (Simplified for now, taking first available)
        validSource = sources[0];
    }

    // If no source behaves, we can try creating a local one, but usually sources[] is populated.
    if (!validSource) {
        // Last resort: Create a new local source (this might fail on some OEMs)
        return { isLocalAccount: true, name: 'RemindMe', type: Calendar.SourceType.LOCAL, id: 'undefined-shim' };
    }

    return validSource;
}

const createCalendar = async (): Promise<string> => {
    let source: Calendar.Source;

    if (Platform.OS === 'ios') {
        const defaultCalendar = await Calendar.getDefaultCalendarAsync();
        source = defaultCalendar.source;
    } else {
        source = await getAndroidCalendarSource();
    }

    // Prepare creation details
    const newCalendarDetails: Partial<Calendar.Calendar> = {
        title: CALENDAR_NAME,
        color: '#00C896', // Primary Brand Color
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: source.id,
        source: source,
        name: 'remindme_lectures',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
    };

    // Android requires specific source handling sometimes
    if (Platform.OS === 'android') {
        // Ensure we are using the correct source ID
        if (source.isLocalAccount) {
            delete newCalendarDetails.sourceId; // Local accounts might not need sourceId explicitly if creating a new one? 
            // Actually, standard practice on Android is to attaching to an EXISTING source.
        }
    }

    const newCalendarID = await Calendar.createCalendarAsync(newCalendarDetails);
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
            // Use the improved logic that accounts for offset to ensure we get a valid future date
            const nextDate = getDateForNextOccurrence(lecture.dayOfWeek, lecture.startTime, offsetMinutes);

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

        // Check if it's an Expo Go limitation error
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('not available on android') || errorMessage.includes('getSourcesAsync')) {
            Alert.alert(
                "Feature Not Available in Expo Go",
                "Calendar sync requires a development build and is not available in Expo Go.\n\nTo use this feature, you'll need to build the app with EAS Build or create a development build.",
                [{ text: "OK" }]
            );
        } else {
            Alert.alert("Sync Failed", "An error occurred while syncing to calendar.");
        }
    }
};
