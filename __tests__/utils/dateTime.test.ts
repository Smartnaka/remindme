
import { getDateForNextOccurrence, parseTime } from '../../utils/dateTime';

describe('parseTime', () => {
    it('parses a valid HH:MM string', () => {
        expect(parseTime('09:30')).toEqual({ hours: 9, minutes: 30 });
        expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
        expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });

    it('returns zeros for an empty string', () => {
        expect(parseTime('')).toEqual({ hours: 0, minutes: 0 });
    });

    it('returns zeros for a malformed string with no colon', () => {
        expect(parseTime('1230')).toEqual({ hours: 0, minutes: 0 });
    });

    it('returns zeros for a fully invalid string', () => {
        expect(parseTime('invalid')).toEqual({ hours: 0, minutes: 0 });
    });
});


describe('getDateForNextOccurrence', () => {
    // Mock Date to a fixed time: Wednesday, Jan 1, 2025, 10:00 AM
    // 2025-01-01 is a Wednesday
    const MOCK_DATE = new Date('2025-01-01T10:00:00');

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(MOCK_DATE);
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should return same day if time is in future', () => {
        // Wed 10AM -> Wed 2PM (14:00) same day
        const result = getDateForNextOccurrence('Wednesday', '14:00', 0);
        expect(result.getDay()).toBe(3); // Wed
        expect(result.getDate()).toBe(1); // 1st
        expect(result.getHours()).toBe(14);
    });

    it('should return next week if time is in past for today', () => {
        // Wed 10AM -> Wed 9AM (09:00) next week
        const result = getDateForNextOccurrence('Wednesday', '09:00', 0);
        expect(result.getDay()).toBe(3); // Wed
        expect(result.getDate()).toBe(8); // 8th (Next Wed)
    });

    it('should return tomorrow for next day', () => {
        // Wed 10AM -> Thu 10AM
        const result = getDateForNextOccurrence('Thursday', '10:00', 0);
        expect(result.getDay()).toBe(4); // Thu
        expect(result.getDate()).toBe(2); // 2nd
    });

    it('should return correct date for wrapping around week', () => {
        // Wed 10AM -> Mon 10AM
        const result = getDateForNextOccurrence('Monday', '10:00', 0);
        expect(result.getDay()).toBe(1); // Mon
        expect(result.getDate()).toBe(6); // 6th (Next Mon)
    });

    it('should handle offset forcing next week', () => {
        // Wed 10AM -> Wed 10:30AM with 60min offset
        // Trigger would be 9:30AM which is in PASTRY relative to 10:00AM
        // So it should schedule for NEXT MONTH/WEEK
        const result = getDateForNextOccurrence('Wednesday', '10:30', 60);
        
        // Target: Wed 1st 10:30
        // Trigger: Wed 1st 09:30 (Before now 10:00)
        // Should push target to Wed 8th
        
        expect(result.getDate()).toBe(8);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(30);
    });
    
    it('should return same day if offset is safe', () => {
        // Wed 10AM -> Wed 12:00PM with 60min offset
        // Trigger: 11:00AM (Future)
        const result = getDateForNextOccurrence('Wednesday', '12:00', 60);
        expect(result.getDate()).toBe(1);
    });
});
