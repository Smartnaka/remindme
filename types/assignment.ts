export interface Assignment {
  id: string;
  lectureId: string; // Links to the course/lecture ID
  title: string;
  description?: string;
  dueDate: string; // ISO String for date and time
  isCompleted: boolean;
  notificationId?: string; // ID for the scheduled reminder
  priority: 'low' | 'medium' | 'high';
}
