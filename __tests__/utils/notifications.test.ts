
import { scheduleWeeklyNotification, scheduleTwoHourReminder } from '../../utils/notifications';
import { getDateForNextOccurrence } from '../../utils/dateTime';
import * as Notifications from 'expo-notifications';

// Mock dependencies
jest.mock('expo-notifications', () => ({
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('test-notification-id')),
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    AndroidNotificationPriority: { HIGH: 'high' },
    SchedulableTriggerInputTypes: { WEEKLY: 'weekly' }
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'ios' }, // Default to iOS for logic tests
    Alert: { alert: jest.fn() }
}));

// Mock dateTime util
// We mock it to return a predictable date so we don't depend on dateTime logic here
jest.mock('../../utils/dateTime', () => ({
    getDateForNextOccurrence: jest.fn(() => new Date('2025-01-01T10:00:00')), // Fixed future date
}));

describe('Notifications Logic', () => {
    const mockLecture = {
        id: '1',
        courseName: 'CS101',
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:00',
        location: 'Room 101'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('scheduleWeeklyNotification schedules with correct parameters', async () => {
        await scheduleWeeklyNotification(mockLecture as any, 15);
        
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
        const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
        
        expect(callArgs.content.title).toBe('CS101');
        expect(callArgs.content.body).toContain('Starts in 15 minutes');
        expect(callArgs.trigger.type).toBe('weekly');
    });

    it('scheduleTwoHourReminder schedules with correct parameters', async () => {
        await scheduleTwoHourReminder(mockLecture as any);

        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
        const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];

        expect(callArgs.content.type).toBeUndefined(); // content type isn't a top level field in expo mock usually but checking payload
        expect(callArgs.content.data.type).toBe('2hr-reminder');
        expect(callArgs.content.body).toContain('Class starts in 2 hours');
    });
});
