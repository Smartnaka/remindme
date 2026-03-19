import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { Lecture, DayOfWeek } from '@/types/lecture';
import { Assignment } from '@/types/assignment';
import { 
  scheduleWeeklyNotification, 
  cancelNotification, 
  requestNotificationPermissions, 
  scheduleExactAlarmNotifications, 
  cancelMultipleNotifications,
  scheduleTwoHourReminder,
  manageDailySummaryNotification,
  scheduleBiWeeklyNotifications,
  scheduleAssignmentNotification
} from '@/utils/notifications';
import { getCurrentDayOfWeek } from '@/utils/dateTime';

const LECTURE_STORAGE_KEY = '@lectures';
const ASSIGNMENT_STORAGE_KEY = '@assignments';

const loadLectures = async (): Promise<Lecture[]> => {
  try {
    const data = await AsyncStorage.getItem(LECTURE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[LectureContext] Error loading lectures:', error);
    return [];
  }
};

const loadAssignments = async (): Promise<Assignment[]> => {
  try {
    const data = await AsyncStorage.getItem(ASSIGNMENT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[LectureContext] Error loading assignments:', error);
    return [];
  }
};

const saveLectures = async (lectures: Lecture[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(LECTURE_STORAGE_KEY, JSON.stringify(lectures));
  } catch (error) {
    console.error('[LectureContext] Error saving lectures:', error);
  }
};

const saveAssignments = async (assignments: Assignment[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignments));
  } catch (error) {
    console.error('[LectureContext] Error saving assignments:', error);
  }
};

interface LectureContextType {
  lectures: Lecture[];
  addLecture: (lecture: Omit<Lecture, 'id' | 'notificationId'>) => Promise<void>;
  updateLecture: (id: string, updates: Partial<Lecture>) => Promise<void>;
  deleteLecture: (id: string) => Promise<void>;
  clearLectures: () => Promise<void>;
  restoreLecture: (lecture: Lecture) => Promise<void>;
  getLectureById: (id: string) => Lecture | undefined;
  
  assignments: Assignment[];
  addAssignment: (assignment: Omit<Assignment, 'id'>) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  clearAssignments: () => Promise<void>;
  getAssignmentsByLectureId: (lectureId: string) => Assignment[];
  
  isLoading: boolean;
  isSaving: boolean;
}

const LectureContext = createContext<LectureContextType | undefined>(undefined);

import { useSettings } from './SettingsContext';

export const LectureProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const { settings, updateSettings, isLoading: isSettingsLoading } = useSettings();

  // Load Lectures
  const lecturesQuery = useQuery({
    queryKey: ['lectures'],
    queryFn: loadLectures,
    staleTime: Infinity,
  });

  // Load Assignments
  const assignmentsQuery = useQuery({
    queryKey: ['assignments'],
    queryFn: loadAssignments,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (lecturesQuery.data) setLectures(lecturesQuery.data);
  }, [lecturesQuery.data]);

  useEffect(() => {
    if (assignmentsQuery.data) setAssignments(assignmentsQuery.data);
  }, [assignmentsQuery.data]);

  useEffect(() => {
    if (isSettingsLoading) return; // Wait for settings to load properly
    if (!settings.dailySummaryEnabled) return; // Only schedule if enabled

    requestNotificationPermissions().then((hasPermission) => {
       if (!hasPermission) return;
       
       manageDailySummaryNotification(settings.dailySummaryTime, settings.dailySummaryNotificationId)
         .then(newId => {
            if (newId && newId !== settings.dailySummaryNotificationId) {
               updateSettings({ dailySummaryNotificationId: newId });
            }
         });
    });
  }, [settings.dailySummaryTime, settings.dailySummaryEnabled, isSettingsLoading, updateSettings, lectures, assignments]);

  const saveLecturesMutation = useMutation({
    mutationFn: async (newLectures: Lecture[]) => {
      await saveLectures(newLectures);
      return newLectures;
    },
    onSuccess: (data) => {
      setLectures(data);
      queryClient.setQueryData(['lectures'], data);
    },
  });

  const saveAssignmentsMutation = useMutation({
    mutationFn: async (newAssignments: Assignment[]) => {
      await saveAssignments(newAssignments);
      return newAssignments;
    },
    onSuccess: (data) => {
      setAssignments(data);
      queryClient.setQueryData(['assignments'], data);
    },
  });

  const addLecture = async (lecture: Omit<Lecture, 'id' | 'notificationId'>): Promise<void> => {
    const newLecture: Lecture = {
      ...lecture,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    // 1. Recurring Reminders
    if (newLecture.recurrence?.type === 'biweekly') {
       // Bi-weekly: Schedule individual notifications
       const biWeeklyIds = await scheduleBiWeeklyNotifications(newLecture, settings.lectureOffset);
       // We'll store these in alarmNotificationIds for now, or we could add a new field. 
       // Sticking to alarmNotificationIds as a general "list of scheduled IDs".
       newLecture.alarmNotificationIds = biWeeklyIds;
    } else {
       // Weekly (Standard): one system per platform to avoid duplicate firing
       if (Platform.OS === 'android') {
           // Android: exact alarms bypass battery optimisation and are more reliable
           const alarmIds = await scheduleExactAlarmNotifications(newLecture, settings.lectureOffset);
           if (alarmIds.length > 0) newLecture.alarmNotificationIds = alarmIds;
       } else {
           // iOS: calendar-based weekly trigger
           const notificationId = await scheduleWeeklyNotification(newLecture, settings.lectureOffset);
           if (notificationId) newLecture.notificationId = notificationId;
       }
    }
    
    // 3. 2-Hour Reminder
    const twoHourId = await scheduleTwoHourReminder(newLecture);
    if (twoHourId) newLecture.twoHourReminderId = twoHourId;

    const updatedLectures = [...lectures, newLecture];
    saveLecturesMutation.mutate(updatedLectures);
  };

  const updateLecture = async (id: string, updates: Partial<Lecture>): Promise<void> => {
    const lectureIndex = lectures.findIndex(l => l.id === id);
    if (lectureIndex === -1) return;

    const oldLecture = lectures[lectureIndex];

    // Cleanup old notifications
    if (oldLecture.notificationId) await cancelNotification(oldLecture.notificationId);
    if (oldLecture.alarmNotificationIds) await cancelMultipleNotifications(oldLecture.alarmNotificationIds);
    if (oldLecture.twoHourReminderId) await cancelNotification(oldLecture.twoHourReminderId);

    const updatedLecture = { ...oldLecture, ...updates };

    // Reschedule
    // Reschedule
    if (updatedLecture.recurrence?.type === 'biweekly') {
       const biWeeklyIds = await scheduleBiWeeklyNotifications(updatedLecture, settings.lectureOffset);
       updatedLecture.alarmNotificationIds = biWeeklyIds;
       updatedLecture.notificationId = undefined; // Clear weekly ID if switching types
    } else {
       // Weekly (Standard): one system per platform to avoid duplicate firing
       if (Platform.OS === 'android') {
           const alarmIds = await scheduleExactAlarmNotifications(updatedLecture, settings.lectureOffset);
           if (alarmIds.length > 0) updatedLecture.alarmNotificationIds = alarmIds;
           updatedLecture.notificationId = undefined; // clear any stale iOS id
       } else {
           const notificationId = await scheduleWeeklyNotification(updatedLecture, settings.lectureOffset);
           if (notificationId) updatedLecture.notificationId = notificationId;
           updatedLecture.alarmNotificationIds = undefined; // clear any stale Android ids
       }
    }

    const twoHourId = await scheduleTwoHourReminder(updatedLecture);
    if (twoHourId) {
        updatedLecture.twoHourReminderId = twoHourId;
    } else {
        updatedLecture.twoHourReminderId = undefined;
    }

    const updatedLectures = [...lectures];
    updatedLectures[lectureIndex] = updatedLecture;
    saveLecturesMutation.mutate(updatedLectures);
  };

  const deleteLecture = async (id: string): Promise<void> => {
    const lecture = lectures.find(l => l.id === id);

    if (lecture?.notificationId) await cancelNotification(lecture.notificationId);
    if (lecture?.alarmNotificationIds) await cancelMultipleNotifications(lecture.alarmNotificationIds);
    if (lecture?.twoHourReminderId) await cancelNotification(lecture.twoHourReminderId);

    const updatedLectures = lectures.filter(l => l.id !== id);
    saveLecturesMutation.mutate(updatedLectures);
  };

  const restoreLecture = async (lectureToRestore: Lecture): Promise<void> => {
    // Re-schedule alarms
    const alarmIds: string[] = [];
    if (lectureToRestore.recurrence) {
        // We simplified recurrence, so just attempt one
        const newIds = await scheduleBiWeeklyNotifications(lectureToRestore, settings.lectureOffset);
        if (newIds.length > 0) alarmIds.push(...newIds);
    } else {
        const primaryIds = await scheduleExactAlarmNotifications(lectureToRestore, settings.lectureOffset);
        if (primaryIds.length > 0) alarmIds.push(...primaryIds);
    }
    
    // Notification logic
    let notificationId: string | undefined;
    if (Platform.OS !== 'web') {
        // Minimal logic, relies on alarm anyway
    }

    const twoHourId = await scheduleTwoHourReminder(lectureToRestore);

    const Restored: Lecture = {
        ...lectureToRestore,
        alarmNotificationIds: alarmIds.length > 0 ? alarmIds : undefined,
        notificationId: notificationId,
        twoHourReminderId: twoHourId || undefined,
    };

    const updatedLectures = [...lectures, Restored];
    saveLecturesMutation.mutate(updatedLectures);
  };

  const clearLectures = async (): Promise<void> => {
    try {
      if (lectures.length > 0) {
        await Promise.all(lectures.flatMap(l => {
            const ids = [];
            if (l.notificationId) ids.push(cancelNotification(l.notificationId));
            if (l.twoHourReminderId) ids.push(cancelNotification(l.twoHourReminderId));
            if (l.alarmNotificationIds) ids.push(cancelMultipleNotifications(l.alarmNotificationIds));
            return ids;
        }));
      }
      saveLecturesMutation.mutate([]);
    } catch (error) {
      console.error("Failed to clear", error);
    }
  };

  // --- Assignment Logic ---

  const addAssignment = async (assignment: Omit<Assignment, 'id'>): Promise<void> => {
    const newAssignment: Assignment = {
      ...assignment,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    const course = lectures.find(l => l.id === assignment.lectureId);
    if (course && !assignment.isCompleted) {
        const notifId = await scheduleAssignmentNotification(newAssignment, course.courseName, settings.assignmentOffset);
        if (notifId) newAssignment.notificationId = notifId;
    }

    const updatedAssignments = [...assignments, newAssignment];
    saveAssignmentsMutation.mutate(updatedAssignments);
  };

  const updateAssignment = async (id: string, updates: Partial<Assignment>): Promise<void> => {
    const index = assignments.findIndex(a => a.id === id);
    if (index === -1) return;

    const oldAssignment = assignments[index];
    if (oldAssignment.notificationId) {
        await cancelNotification(oldAssignment.notificationId);
    }

    const updatedAssignments = [...assignments];
    const updatedAssignment = { ...oldAssignment, ...updates };

    const course = lectures.find(l => l.id === updatedAssignment.lectureId);
    if (course && !updatedAssignment.isCompleted) {
        const notifId = await scheduleAssignmentNotification(updatedAssignment, course.courseName, settings.assignmentOffset);
        if (notifId) {
           updatedAssignment.notificationId = notifId;
        } else {
           updatedAssignment.notificationId = undefined;
        }
    } else {
        updatedAssignment.notificationId = undefined;
    }

    updatedAssignments[index] = updatedAssignment;
    saveAssignmentsMutation.mutate(updatedAssignments);
  };

  const deleteAssignment = async (id: string): Promise<void> => {
    const assignment = assignments.find(a => a.id === id);
    if (assignment?.notificationId) {
        await cancelNotification(assignment.notificationId);
    }

    const updatedAssignments = assignments.filter(a => a.id !== id);
    saveAssignmentsMutation.mutate(updatedAssignments);
  };

  const clearAssignments = async (): Promise<void> => {
    try {
      if (assignments.length > 0) {
        await Promise.all(assignments.map(a => a.notificationId && cancelNotification(a.notificationId)));
      }
      saveAssignmentsMutation.mutate([]);
    } catch (error) {
      console.error("Failed to clear assignments", error);
    }
  };

  const getAssignmentsByLectureId = (lectureId: string) => {
    return assignments.filter(a => a.lectureId === lectureId);
  };


  const value: LectureContextType = {
    lectures,
    addLecture,
    updateLecture,
    deleteLecture,
    clearLectures,
    restoreLecture,
    getLectureById: (id) => lectures.find(l => l.id === id),
    
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    clearAssignments,
    getAssignmentsByLectureId,

    isLoading: lecturesQuery.isLoading || assignmentsQuery.isLoading,
    isSaving: saveLecturesMutation.isPending || saveAssignmentsMutation.isPending,
  };

  return (
    <LectureContext.Provider value={value}>
      {children}
    </LectureContext.Provider>
  );
};

export const useLectures = (): LectureContextType => {
  const context = useContext(LectureContext);
  if (context === undefined) {
    throw new Error('useLectures must be used within a LectureProvider');
  }
  return context;
};

export const useTodayLectures = () => {
  const { lectures } = useLectures();
  const today = getCurrentDayOfWeek();

  return useMemo(() => {
    return lectures
      .filter((lecture: Lecture) => lecture.dayOfWeek === today)
      .sort((a: Lecture, b: Lecture) => a.startTime.localeCompare(b.startTime));
  }, [lectures, today]);
};

export const useLecturesByDay = (day: DayOfWeek) => {
  const { lectures } = useLectures();

  return useMemo(() => {
    return lectures
      .filter((lecture: Lecture) => lecture.dayOfWeek === day)
      .sort((a: Lecture, b: Lecture) => a.startTime.localeCompare(b.startTime));
  }, [lectures, day]);
};

