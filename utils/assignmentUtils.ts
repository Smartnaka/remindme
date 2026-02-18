import { Assignment } from '../types/assignment';

export const getUpcomingAssignments = (assignments: Assignment[], limit: number = 3): Assignment[] => {
  const now = new Date();
  return assignments
    .filter(a => !a.isCompleted && new Date(a.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, limit);
};
