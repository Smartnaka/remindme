import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lecture, DayOfWeek } from '@/types/lecture';
import { scheduleWeeklyNotification, cancelNotification, requestNotificationPermissions, scheduleExactAlarmNotifications, cancelMultipleNotifications } from '@/utils/notifications';
import { getCurrentDayOfWeek } from '@/utils/dateTime';

const STORAGE_KEY = '@lectures';

const loadLectures = async (): Promise<Lecture[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    console.log('[LectureContext] Loaded lectures:', data);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[LectureContext] Error loading lectures:', error);
    return [];
  }
};

const saveLectures = async (lectures: Lecture[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lectures));
    console.log('[LectureContext] Saved lectures:', lectures.length);
  } catch (error) {
    console.error('[LectureContext] Error saving lectures:', error);
  }
};

interface LectureContextType {
  lectures: Lecture[];
  addLecture: (lecture: Omit<Lecture, 'id' | 'notificationId'>) => Promise<void>;
  updateLecture: (id: string, updates: Partial<Lecture>) => Promise<void>;
  deleteLecture: (id: string) => Promise<void>;
  clearLectures: () => Promise<void>;
  getLectureById: (id: string) => Lecture | undefined;
  isLoading: boolean;
  isSaving: boolean;
}

const LectureContext = createContext<LectureContextType | undefined>(undefined);

import { useSettings } from './SettingsContext';

export const LectureProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const { settings } = useSettings();

  const lecturesQuery = useQuery({
    queryKey: ['lectures'],
    queryFn: loadLectures,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (lecturesQuery.data) {
      setLectures(lecturesQuery.data);
    }
  }, [lecturesQuery.data]);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (newLectures: Lecture[]) => {
      await saveLectures(newLectures);
      return newLectures;
    },
    onSuccess: (data) => {
      setLectures(data);
      queryClient.setQueryData(['lectures'], data);
    },
  });

  const addLecture = async (lecture: Omit<Lecture, 'id' | 'notificationId'>): Promise<void> => {
    const newLecture: Lecture = {
      ...lecture,
      id: Date.now().toString(),
    };

    // Schedule calendar-based notification (iOS + Android fallback)
    const notificationId = await scheduleWeeklyNotification(newLecture, settings.notificationOffset);
    if (notificationId) {
      newLecture.notificationId = notificationId;
    }

    // Schedule alarm-based notifications (Android only, more reliable)
    const alarmIds = await scheduleExactAlarmNotifications(newLecture, settings.notificationOffset);
    if (alarmIds.length > 0) {
      newLecture.alarmNotificationIds = alarmIds;
    }

    const updatedLectures = [...lectures, newLecture];
    saveMutation.mutate(updatedLectures);
  };

  const updateLecture = async (id: string, updates: Partial<Lecture>): Promise<void> => {
    const lectureIndex = lectures.findIndex(l => l.id === id);
    if (lectureIndex === -1) return;

    const oldLecture = lectures[lectureIndex];

    // Cancel old calendar notification
    if (oldLecture.notificationId) {
      await cancelNotification(oldLecture.notificationId);
    }

    // Cancel old alarm notifications
    if (oldLecture.alarmNotificationIds && oldLecture.alarmNotificationIds.length > 0) {
      await cancelMultipleNotifications(oldLecture.alarmNotificationIds);
    }

    const updatedLecture = { ...oldLecture, ...updates };

    // Reschedule calendar notification
    const notificationId = await scheduleWeeklyNotification(updatedLecture, settings.notificationOffset);
    if (notificationId) {
      updatedLecture.notificationId = notificationId;
    }

    // Reschedule alarm notifications
    const alarmIds = await scheduleExactAlarmNotifications(updatedLecture, settings.notificationOffset);
    if (alarmIds.length > 0) {
      updatedLecture.alarmNotificationIds = alarmIds;
    }

    const updatedLectures = [...lectures];
    updatedLectures[lectureIndex] = updatedLecture;
    saveMutation.mutate(updatedLectures);
  };

  const deleteLecture = async (id: string): Promise<void> => {
    const lecture = lectures.find(l => l.id === id);

    // Cancel calendar notification
    if (lecture?.notificationId) {
      await cancelNotification(lecture.notificationId);
    }

    // Cancel alarm notifications
    if (lecture?.alarmNotificationIds && lecture.alarmNotificationIds.length > 0) {
      await cancelMultipleNotifications(lecture.alarmNotificationIds);
    }

    const updatedLectures = lectures.filter(l => l.id !== id);
    saveMutation.mutate(updatedLectures);
  };

  const getLectureById = (id: string): Lecture | undefined => {
    return lectures.find(l => l.id === id);
  };

  const clearLectures = async (): Promise<void> => {
    try {
      console.log('[LectureContext] Clearing all lectures...');
      if (lectures.length > 0) {
        // Cancel all notifications
        await Promise.all(lectures.map(l => l.notificationId && cancelNotification(l.notificationId)));
      }
      saveMutation.mutate([]);
      console.log('[LectureContext] Lectures cleared via mutation');
    } catch (error) {
      console.error("Failed to clear lectures", error);
    }
  };

  const value: LectureContextType = {
    lectures,
    addLecture,
    updateLecture,
    deleteLecture,
    clearLectures,
    getLectureById,
    isLoading: lecturesQuery.isLoading,
    isSaving: saveMutation.isPending,
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
