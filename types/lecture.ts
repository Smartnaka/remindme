export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Lecture {
  id: string;
  courseName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  location?: string;
  notificationId?: string;
}

export interface TimeSlot {
  hours: number;
  minutes: number;
}
