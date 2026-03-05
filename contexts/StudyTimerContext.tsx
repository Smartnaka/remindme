import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

interface StudyTimerState {
  mode: TimerMode;
  secondsLeft: number;
  isRunning: boolean;
  sessions: number;
  selectedCourse: string | null;
}

interface StudyTimerContextType extends StudyTimerState {
  /** Start or pause the timer */
  toggleTimer: () => void;
  /** Reset timer to current mode's duration */
  resetTimer: () => void;
  /** Switch to a specific mode */
  switchMode: (mode: TimerMode) => void;
  /** Select a course to study */
  setSelectedCourse: (course: string | null) => void;
  /** Timer duration constants */
  DURATIONS: Record<TimerMode, number>;
  /** Mode label strings */
  LABELS: Record<TimerMode, string>;
}

const StudyTimerContext = createContext<StudyTimerContextType | null>(null);

export function StudyTimerProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 300, 200, 300]);
    }

    if (mode === 'focus') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      const nextMode = newSessions % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setSecondsLeft(TIMER_DURATIONS[nextMode]);
    } else {
      setMode('focus');
      setSecondsLeft(TIMER_DURATIONS.focus);
    }
  }, [mode, sessions]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isRunning, handleTimerComplete]);

  const switchMode = useCallback((newMode: TimerMode) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode(newMode);
    setSecondsLeft(TIMER_DURATIONS[newMode]);
    setIsRunning(false);
  }, []);

  const toggleTimer = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(prev => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(TIMER_DURATIONS[mode]);
  }, [mode]);

  return (
    <StudyTimerContext.Provider
      value={{
        mode,
        secondsLeft,
        isRunning,
        sessions,
        selectedCourse,
        toggleTimer,
        resetTimer,
        switchMode,
        setSelectedCourse,
        DURATIONS: TIMER_DURATIONS,
        LABELS: MODE_LABELS,
      }}
    >
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const context = useContext(StudyTimerContext);
  if (!context) {
    throw new Error('useStudyTimer must be used within a StudyTimerProvider');
  }
  return context;
}
