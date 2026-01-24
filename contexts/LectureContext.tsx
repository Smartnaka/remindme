import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lecture, DayOfWeek } from '@/types/lecture';
import { scheduleWeeklyNotification, cancelNotification, requestNotificationPermissions } from '@/utils/notifications';
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

    const notificationId = await scheduleWeeklyNotification(newLecture, settings.notificationOffset);
    if (notificationId) {
      newLecture.notificationId = notificationId;
    }

    const updatedLectures = [...lectures, newLecture];
    saveMutation.mutate(updatedLectures);
  };

  const updateLecture = async (id: string, updates: Partial<Lecture>): Promise<void> => {
    const lectureIndex = lectures.findIndex(l => l.id === id);
    if (lectureIndex === -1) return;

    const oldLecture = lectures[lectureIndex];

    if (oldLecture.notificationId) {
      await cancelNotification(oldLecture.notificationId);
    }

    const updatedLecture = { ...oldLecture, ...updates };

    // Use settings.notificationOffset for the reschedule
    const notificationId = await scheduleWeeklyNotification(updatedLecture, settings.notificationOffset);
    if (notificationId) {
      updatedLecture.notificationId = notificationId;
    }

    const updatedLectures = [...lectures];
    updatedLectures[lectureIndex] = updatedLecture;
    saveMutation.mutate(updatedLectures);
  };

  const deleteLecture = async (id: string): Promise<void> => {
    const lecture = lectures.find(l => l.id === id);
    if (lecture?.notificationId) {
      await cancelNotification(lecture.notificationId);
    }

    const updatedLectures = lectures.filter(l => l.id !== id);
    saveMutation.mutate(updatedLectures);
  };

  const getLectureById = (id: string): Lecture | undefined => {
    return lectures.find(l => l.id === id);
  };

  const value: LectureContextType = {
    lectures,
    addLecture,
    updateLecture,
    deleteLecture,
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
