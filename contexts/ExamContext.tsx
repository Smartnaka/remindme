import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exam } from '@/types/exam';
import { useSettings } from './SettingsContext';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
      id: Date.now().toString(),
    };

    // Sort implementation
    const updatedExams = [...exams, newExam].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    await saveExams(updatedExams);

    // Schedule notification (e.g. 1 day before) - only on native platforms
    if (Platform.OS !== 'web') {
      const trigger = new Date(newExam.date);
      trigger.setHours(trigger.getHours() - 24); // 24 hours before

      if (trigger > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Exam Tomorrow! 📝',
            body: `Good luck on your ${newExam.courseName} exam.`,
          },
          trigger,
        });
      }
    }
  };

  const deleteExam = async (id: string) => {
    const updatedExams = exams.filter(e => e.id !== id);
    await saveExams(updatedExams);
  };

  const clearExams = async () => {
    try {
      // Clear from storage and state
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
