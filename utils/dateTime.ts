import { DayOfWeek, TimeSlot } from '@/types/lecture';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const getDayIndex = (day: DayOfWeek): number => {
  return DAYS_OF_WEEK.indexOf(day);
};

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const today = new Date().getDay();
  const dayIndex = today === 0 ? 6 : today - 1;
  return DAYS_OF_WEEK[dayIndex];
};

export const parseTime = (timeString: string): TimeSlot => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
};

export const formatTime = (timeSlot: TimeSlot): string => {
  const hours = timeSlot.hours.toString().padStart(2, '0');
  const minutes = timeSlot.minutes.toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatTimeAMPM = (timeString: string): string => {
  const { hours, minutes } = parseTime(timeString);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
};

export const isLectureNow = (startTime: string, endTime: string): boolean => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const start = parseTime(startTime);
  const startMinutes = start.hours * 60 + start.minutes;

  const end = parseTime(endTime);
  const endMinutes = end.hours * 60 + end.minutes;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};

export const getNextLectureTime = (startTime: string): string => {
  const start = parseTime(startTime);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;

  const diff = startMinutes - currentMinutes;

  if (diff <= 0) return '';
  if (diff < 60) return `in ${diff} min`;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (minutes === 0) return `in ${hours}h`;
  return `in ${hours}h ${minutes}m`;
};

export const getDateForNextOccurrence = (dayOfWeek: DayOfWeek, time: string, offsetMinutes: number = 0): Date => {
  const now = new Date();
  const targetDayIndex = getDayIndex(dayOfWeek);
  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const { hours, minutes } = parseTime(time);

  // Create a candidate date for "this week"
  let daysUntilTarget = targetDayIndex - currentDayIndex;

  // If the target day is earlier in the week (e.g. today is Wed, target is Mon), move to next week
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);
  targetDate.setHours(hours, minutes, 0, 0);

  // CRITICAL FIX: Check if the *notification trigger time* (date - offset) has passed
  // If it has passed, we MUST schedule for next week.
  const triggerDate = new Date(targetDate.getTime() - offsetMinutes * 60000);

  if (triggerDate <= now) {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  return targetDate;
};
