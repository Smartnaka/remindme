export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Lecture {
  id: string;
  courseName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string; // Hex color code for visual organization
  notificationId?: string; // Calendar-based notification ID
  alarmNotificationIds?: string[]; // Alarm-based notification IDs (for 4 weeks)
  calendarEventId?: string; // Store calendar event ID for sync management
}

export interface TimeSlot {
  hours: number;
  minutes: number;
}
