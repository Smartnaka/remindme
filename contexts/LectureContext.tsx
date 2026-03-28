import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { Lecture, DayOfWeek } from '@/types/lecture';
import { Assignment } from '@/types/assignment';
import { 
  scheduleWeeklyNotification, 
  cancelNotification, 
  requestNotificationPermissions, 
  scheduleExactAlarmNotifications, 
  cancelMultipleNotifications,
  scheduleTwoHourReminder,
  scheduleStartNowNotification,
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
  rescheduleAllLectures: () => Promise<void>;
  
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
    if (!settings.hasOnboarded) return; // Wait for onboarding 
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
  }, [settings.dailySummaryTime, settings.dailySummaryEnabled, isSettingsLoading]);

  // Reschedule notifications once per day when the app is opened or comes to foreground.
  // This ensures Android's 4-week exact-alarm window stays fresh.
  const appState = useRef(AppState.currentState);
  const lecturesRef = useRef(lectures);
  const settingsRef = useRef(settings);

  // Keep refs up to date so the AppState listener always sees current values
  useEffect(() => { lecturesRef.current = lectures; }, [lectures]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Ref to the latest reschedule function to avoid stale closures in AppState listener
  const rescheduleRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (isSettingsLoading || !settings.hasOnboarded) return;

    const checkAndReschedule = async () => {
      const currentLectures = lecturesRef.current;
      const currentSettings = settingsRef.current;
      if (currentLectures.length === 0) return;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      if (currentSettings.lastNotificationCheckDate === today) return; // Already rescheduled today
      await rescheduleRef.current();
      await updateSettings({ lastNotificationCheckDate: today });
    };

    // Check on mount (covers fresh app launch)
    checkAndReschedule();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current !== 'active' && nextAppState === 'active') {
        // App came to foreground — reschedule if needed
        checkAndReschedule();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isSettingsLoading, settings.hasOnboarded]);

  // Handle Rescheduling when Notification Offsets or NotifyAtClassStart changes
  const prevOffsetRef = React.useRef(settings.lectureOffset);
  const prevNotifyRef = React.useRef(settings.notifyAtClassStart);

  useEffect(() => {
    if (isSettingsLoading || lectures.length === 0) return;
    
    const offsetChanged = prevOffsetRef.current !== settings.lectureOffset;
    const notifyChanged = prevNotifyRef.current !== settings.notifyAtClassStart;

    if (offsetChanged || notifyChanged) {
        prevOffsetRef.current = settings.lectureOffset;
        prevNotifyRef.current = settings.notifyAtClassStart;
        rescheduleAllLectures();
    }
  }, [settings.lectureOffset, settings.notifyAtClassStart, isSettingsLoading]);

  const schedulePrimaryLectureReminder = async (lecture: Lecture): Promise<Pick<Lecture, 'notificationId' | 'alarmNotificationIds'>> => {
    if (lecture.recurrence?.type === 'biweekly') {
      const biWeeklyIds = await scheduleBiWeeklyNotifications(lecture, settings.lectureOffset);
      return {
        notificationId: undefined,
        alarmNotificationIds: biWeeklyIds.length > 0 ? biWeeklyIds : undefined,
      };
    }

    if (Platform.OS === 'android') {
      const alarmIds = await scheduleExactAlarmNotifications(lecture, settings.lectureOffset);

      // Fallback: if exact alarms are unavailable, still schedule calendar-style weekly reminders.
      if (alarmIds.length === 0) {
        const weeklyId = await scheduleWeeklyNotification(lecture, settings.lectureOffset);
        return {
          notificationId: weeklyId || undefined,
          alarmNotificationIds: undefined,
        };
      }

      return {
        notificationId: undefined,
        alarmNotificationIds: alarmIds,
      };
    }

    const notificationId = await scheduleWeeklyNotification(lecture, settings.lectureOffset);
    return {
      notificationId: notificationId || undefined,
      alarmNotificationIds: undefined,
    };
  };

  const rescheduleAllLectures = async () => {
    if (lectures.length === 0) return;
    
    const updatedLectures = [];
    for (const oldLecture of lectures) {
        if (oldLecture.notificationId) await cancelNotification(oldLecture.notificationId);
        if (oldLecture.alarmNotificationIds) await cancelMultipleNotifications(oldLecture.alarmNotificationIds);
        if (oldLecture.twoHourReminderId) await cancelNotification(oldLecture.twoHourReminderId);
        if (oldLecture.startNowNotificationId) await cancelNotification(oldLecture.startNowNotificationId);

        const updatedLecture = { ...oldLecture };

        const primaryReminder = await schedulePrimaryLectureReminder(updatedLecture);
        updatedLecture.notificationId = primaryReminder.notificationId;
        updatedLecture.alarmNotificationIds = primaryReminder.alarmNotificationIds;

        const twoHourId = await scheduleTwoHourReminder(updatedLecture);
        updatedLecture.twoHourReminderId = twoHourId || undefined;

        if (settings.notifyAtClassStart) {
          const startNowId = await scheduleStartNowNotification(updatedLecture);
          updatedLecture.startNowNotificationId = startNowId || undefined;
        } else {
          updatedLecture.startNowNotificationId = undefined;
        }

        updatedLectures.push(updatedLecture);
    }
    
    saveLecturesMutation.mutate(updatedLectures);
  };

  // Update rescheduleRef on every render so the AppState listener always
  // calls the up-to-date closure with the latest `lectures` and `settings`.
  // Assigning to a ref during render is the recommended React pattern for
  // avoiding stale callbacks in stable event subscriptions.
  rescheduleRef.current = rescheduleAllLectures;

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

    const primaryReminder = await schedulePrimaryLectureReminder(newLecture);
    newLecture.notificationId = primaryReminder.notificationId;
    newLecture.alarmNotificationIds = primaryReminder.alarmNotificationIds;
    
    // 3. 2-Hour Reminder
    const twoHourId = await scheduleTwoHourReminder(newLecture);
    if (twoHourId) newLecture.twoHourReminderId = twoHourId;

    // 4. "Class starting NOW" notification
    if (settings.notifyAtClassStart) {
      const startNowId = await scheduleStartNowNotification(newLecture);
      if (startNowId) newLecture.startNowNotificationId = startNowId;
    }

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
    if (oldLecture.startNowNotificationId) await cancelNotification(oldLecture.startNowNotificationId);

    const updatedLecture = { ...oldLecture, ...updates };

    const primaryReminder = await schedulePrimaryLectureReminder(updatedLecture);
    updatedLecture.notificationId = primaryReminder.notificationId;
    updatedLecture.alarmNotificationIds = primaryReminder.alarmNotificationIds;

    const twoHourId = await scheduleTwoHourReminder(updatedLecture);
    if (twoHourId) {
        updatedLecture.twoHourReminderId = twoHourId;
    } else {
        updatedLecture.twoHourReminderId = undefined;
    }

    // "Class starting NOW" notification
    if (settings.notifyAtClassStart) {
      const startNowId = await scheduleStartNowNotification(updatedLecture);
      updatedLecture.startNowNotificationId = startNowId || undefined;
    } else {
      updatedLecture.startNowNotificationId = undefined;
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
    if (lecture?.startNowNotificationId) await cancelNotification(lecture.startNowNotificationId);

    const updatedLectures = lectures.filter(l => l.id !== id);
    saveLecturesMutation.mutate(updatedLectures);
  };

  const restoreLecture = async (lectureToRestore: Lecture): Promise<void> => {
    const updatedLecture = { ...lectureToRestore };

    const primaryReminder = await schedulePrimaryLectureReminder(updatedLecture);
    updatedLecture.notificationId = primaryReminder.notificationId;
    updatedLecture.alarmNotificationIds = primaryReminder.alarmNotificationIds;

    const twoHourId = await scheduleTwoHourReminder(updatedLecture);
    updatedLecture.twoHourReminderId = twoHourId || undefined;

    if (settings.notifyAtClassStart) {
      const startNowId = await scheduleStartNowNotification(updatedLecture);
      updatedLecture.startNowNotificationId = startNowId || undefined;
    } else {
      updatedLecture.startNowNotificationId = undefined;
    }

    const updatedLectures = [...lectures, updatedLecture];
    saveLecturesMutation.mutate(updatedLectures);
  };

  const clearLectures = async (): Promise<void> => {
    try {
      if (lectures.length > 0) {
        await Promise.all(lectures.flatMap(l => {
            const ids = [];
            if (l.notificationId) ids.push(cancelNotification(l.notificationId));
            if (l.twoHourReminderId) ids.push(cancelNotification(l.twoHourReminderId));
            if (l.startNowNotificationId) ids.push(cancelNotification(l.startNowNotificationId));
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
    const course = lectures.find(l => l.id === assignment.lectureId);
    if (!course) {
      throw new Error('Cannot add assignment: lecture not found');
    }

    const newAssignment: Assignment = {
      ...assignment,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    if (!assignment.isCompleted) {
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
    rescheduleAllLectures,
    
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

