export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Lecture {
  id: string;
  courseName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  location?: string;
  lecturer?: string; // Name of the lecturer
  files?: CourseFile[]; // Attached files for the course
  color?: string; // Hex color code for visual organization
  notificationId?: string; // Calendar-based notification ID
  alarmNotificationIds?: string[]; // Alarm-based notification IDs (for 4 weeks)
  calendarEventId?: string; // Store calendar event ID for sync management
  recurrence?: Recurrence; // New recurrence settings
}

export interface Recurrence {
  type: 'weekly' | 'biweekly' | 'custom';
  interval: number; // 1 = weekly, 2 = biweekly
  startDate: string; // ISO Date of first occurrence
  endDate?: string; // ISO Date of last occurrence
}

export interface CourseFile {
  id: string;
  name: string;
  uri: string;
  type: 'image' | 'pdf' | 'other';
  mimeType?: string;
}

export interface TimeSlot {
  hours: number;
  minutes: number;
}
