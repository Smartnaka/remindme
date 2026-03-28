export interface Exam {
  id: string;
  courseName: string;
  date: string; // ISO string for date and time
  location?: string;
  notes?: string;
  color?: string; // Optional color for the card
  notificationId?: string; // Scheduled exam reminder notification ID
}

export type ExamSortOption = 'date' | 'course';
