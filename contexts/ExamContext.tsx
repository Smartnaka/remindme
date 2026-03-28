import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exam } from '@/types/exam';
import { useSettings } from './SettingsContext';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { requestNotificationPermissions } from '@/utils/notifications';

const EXAM_STORAGE_KEY = '@exams';

interface ExamContextType {
  exams: Exam[];
  addExam: (exam: Omit<Exam, 'id'>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  clearExams: () => Promise<void>;
  isLoading: boolean;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider = ({ children }: { children: React.ReactNode }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const data = await AsyncStorage.getItem(EXAM_STORAGE_KEY);
      if (data) {
        // Sort by date automatically
        const parsed: Exam[] = JSON.parse(data);
        parsed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setExams(parsed);
      }
    } catch (error) {
      console.error('Failed to load exams', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveExams = async (newExams: Exam[]) => {
    try {
      await AsyncStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(newExams));
      setExams(newExams);
    } catch (error) {
      console.error('Failed to save exams', error);
    }
  };

  const addExam = async (examData: Omit<Exam, 'id'>) => {
    const newExam: Exam = {
      ...examData,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    // Schedule notification based on examOffset - only on native platforms
    if (Platform.OS !== 'web') {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        const updatedExams = [...exams, newExam].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        await saveExams(updatedExams);
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('lecture-reminders', {
          name: 'Lecture Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00C896',
          sound: 'default',
          enableVibrate: true,
        });
      }

      const trigger = new Date(newExam.date);
      trigger.setMinutes(trigger.getMinutes() - settings.examOffset);

      if (trigger > new Date()) {
        try {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Upcoming Exam! 📝',
              body: `You have an exam for ${newExam.courseName} in ${settings.examOffset >= 1440 ? Math.floor(settings.examOffset / 1440) + ' days' : settings.examOffset + ' minutes'}.`,
              data: { examId: newExam.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: trigger,
              channelId: 'lecture-reminders',
            },
          });
          // Persist the notification ID so it can be cancelled on delete
          newExam.notificationId = notificationId;
        } catch (error) {
          console.error('Failed to schedule exam notification', error);
        }
      }
    }

    // Sort implementation
    const updatedExams = [...exams, newExam].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    await saveExams(updatedExams);
  };

  const deleteExam = async (id: string) => {
    const exam = exams.find(e => e.id === id);
    if (exam?.notificationId && Platform.OS !== 'web') {
      try {
        await Notifications.cancelScheduledNotificationAsync(exam.notificationId);
      } catch (error) {
        console.error('Failed to cancel exam notification', error);
      }
    }
    const updatedExams = exams.filter(e => e.id !== id);
    await saveExams(updatedExams);
  };

  const clearExams = async () => {
    try {
      // Cancel all scheduled exam notifications
      if (Platform.OS !== 'web' && exams.length > 0) {
        await Promise.all(
          exams
            .filter(e => e.notificationId)
            .map(e => Notifications.cancelScheduledNotificationAsync(e.notificationId!).catch(err => {
              console.error('Failed to cancel exam notification', err);
            }))
        );
      }
      await AsyncStorage.removeItem(EXAM_STORAGE_KEY);
      setExams([]);
    } catch (error) {
      console.error('Failed to clear exams', error);
    }
  };

  return (
    <ExamContext.Provider value={{ exams, addExam, deleteExam, clearExams, isLoading }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExams = () => {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExams must be used within an ExamProvider');
  }
  return context;
};
