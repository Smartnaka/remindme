import { getUpcomingAssignments } from '../../utils/assignmentUtils';
import { Assignment } from '../../types/assignment';

describe('getUpcomingAssignments', () => {
  const mockAssignments: Assignment[] = [
    {
      id: '1',
      lectureId: 'l1',
      title: 'Past Assignment',
      dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      isCompleted: false,
      priority: 'medium',
    },
    {
      id: '2',
      lectureId: 'l1',
      title: 'Completed Assignment',
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      isCompleted: true, // Completed
      priority: 'high',
    },
    {
      id: '3',
      lectureId: 'l1',
      title: 'Future Assignment 1',
      dueDate: new Date(Date.now() + 100000).toISOString(), // Soon
      isCompleted: false,
      priority: 'high',
    },
    {
      id: '4',
      lectureId: 'l1',
      title: 'Future Assignment 2',
      dueDate: new Date(Date.now() + 200000).toISOString(), // Later
      isCompleted: false,
      priority: 'low',
    },
    {
      id: '5',
      lectureId: 'l1',
      title: 'Future Assignment 3',
      dueDate: new Date(Date.now() + 300000).toISOString(), // Even later
      isCompleted: false,
      priority: 'medium',
    },
    {
      id: '6',
      lectureId: 'l1',
      title: 'Future Assignment 4',
      dueDate: new Date(Date.now() + 400000).toISOString(), // Last
      isCompleted: false,
      priority: 'medium',
    },
  ];

  it('should filter out past assignments', () => {
    const result = getUpcomingAssignments(mockAssignments);
    expect(result.find(a => a.id === '1')).toBeUndefined();
  });

  it('should filter out completed assignments', () => {
    const result = getUpcomingAssignments(mockAssignments);
    expect(result.find(a => a.id === '2')).toBeUndefined();
  });

  it('should return assignments sorted by due date', () => {
    const result = getUpcomingAssignments(mockAssignments);
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('4');
    expect(result[2].id).toBe('5');
  });

  it('should limit the results', () => {
    const result = getUpcomingAssignments(mockAssignments, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('4');
  });
});
