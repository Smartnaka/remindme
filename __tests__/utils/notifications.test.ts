
import { scheduleWeeklyNotification, scheduleTwoHourReminder, scheduleBiWeeklyNotifications } from '../../utils/notifications';
import { getDateForNextOccurrence } from '../../utils/dateTime';
import * as Notifications from 'expo-notifications';
import { Lecture } from '../../types/lecture';

// Mock dependencies
jest.mock('expo-notifications', () => ({
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('test-notification-id')),
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    AndroidNotificationPriority: { HIGH: 'high' },
    SchedulableTriggerInputTypes: { WEEKLY: 'weekly', DATE: 'date', DAILY: 'daily' }
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'ios' }, // Default to iOS for logic tests
    Alert: { alert: jest.fn() }
}));

// Mock dateTime util
// We mock it to return a predictable date so we don't depend on dateTime logic here
jest.mock('../../utils/dateTime', () => ({
    getDateForNextOccurrence: jest.fn(() => new Date('2025-01-01T10:00:00')), // Fixed future date
    parseTime: jest.fn(() => ({ hours: 10, minutes: 0 })),
}));

describe('Notifications Logic', () => {
    const mockLecture: Lecture = {
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
        await scheduleWeeklyNotification(mockLecture, 15);
        
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
        const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
        
        expect(callArgs.content.title).toBe('CS101');
        expect(callArgs.content.body).toContain('Starts in 15 minutes');
        expect(callArgs.trigger.type).toBe('weekly');
    });

    it('scheduleTwoHourReminder schedules with correct parameters', async () => {
        await scheduleTwoHourReminder(mockLecture);

        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
        const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];

        expect(callArgs.content.type).toBeUndefined(); 
        expect(callArgs.content.data.type).toBe('2hr-reminder');
        expect(callArgs.content.body).toContain('Class starts in 2 hours');
    });

    describe('scheduleBiWeeklyNotifications', () => {
        it('should schedule notifications every 2 weeks', async () => {
          const biWeeklyLecture: Lecture = {
            ...mockLecture,
            recurrence: {
              type: 'biweekly',
              interval: 2,
              startDate: new Date('2024-01-01T00:00:00.000Z').toISOString(),
              endDate: new Date('2024-02-15T00:00:00.000Z').toISOString(),
            }
          };
    
          // Mock system time to be BEFORE the classes
          // Jan 1 2024 is a Monday.
          // We set system time to Jan 1 2024, 08:00 AM.
          jest.useFakeTimers().setSystemTime(new Date('2024-01-01T08:00:00.000Z'));
    
          const ids = await scheduleBiWeeklyNotifications(biWeeklyLecture, 15);
          
          // Expected scheduling:
          // 1. Jan 1 2024, 10:00 AM (Trigger: 09:45 AM) -> Scheduled (since 9:45 > 8:00)
          // 2. Jan 15 2024, 10:00 AM -> Scheduled
          // 3. Jan 29 2024, 10:00 AM -> Scheduled
          // 4. Feb 12 2024, 10:00 AM -> Scheduled
          // 5. Feb 26 2024 -> After End Date (Feb 15) -> NOT Scheduled
          
          expect(ids).toHaveLength(4);
          expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);

          // Verify dates in triggers
          const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
          
          // First call date
          const firstTrigger = calls[0][0].trigger.date;
          // We expect it to be Jan 1st.
          expect(firstTrigger.getDate()).toBe(1);
          // We expect time to be 9:45 (10:00 - 15m)
          expect(firstTrigger.getHours()).toBe(9);
          expect(firstTrigger.getMinutes()).toBe(45);
          
          // Last call date should be Feb 12
          const lastTrigger = calls[3][0].trigger.date;
          expect(lastTrigger.getDate()).toBe(12);
          expect(lastTrigger.getMonth()).toBe(1); // Feb is 1
          expect(lastTrigger.getHours()).toBe(9);

          jest.useRealTimers();
        });
    
        it('should not schedule if recurrence type is not biweekly', async () => {
            const weeklyLecture: Lecture = {
                ...mockLecture,
                recurrence: { type: 'weekly', interval: 1, startDate: '', endDate: '' }
            };
            const ids = await scheduleBiWeeklyNotifications(weeklyLecture);
            expect(ids).toHaveLength(0);
            expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
        });
      });
});
