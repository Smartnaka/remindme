import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { LightColors, DarkColors } from '@/constants/colors';
import { ColorTheme } from '@/types/theme';

const STORAGE_KEY = '@settings';

interface Settings {
    lectureOffset: number; // in minutes
    assignmentOffset: number; // in minutes
    examOffset: number; // in minutes
    dailySummaryTime: string; // "HH:MM" format
    dailySummaryNotificationId?: string;
    themeMode: 'automatic' | 'light' | 'dark';
    lastNotificationCheckDate?: string; // ISO date string YYYY-MM-DD
    quietHoursEnabled?: boolean;
    quietHoursStart?: string; // "HH:MM"
    quietHoursEnd?: string; // "HH:MM"
    semesterStart?: string; // ISO date string YYYY-MM-DD
    semesterEnd?: string; // ISO date string YYYY-MM-DD
    dailySummaryEnabled?: boolean;
    reduceMotion?: boolean;
    hasOnboarded?: boolean;
}

const defaultSettings: Settings = {
    lectureOffset: 15,
    assignmentOffset: 15,
    examOffset: 60,
    dailySummaryTime: "18:00",
    themeMode: 'automatic',
    lastNotificationCheckDate: '',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    dailySummaryEnabled: true,
    reduceMotion: false,
    hasOnboarded: false,
};

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    isLoading: boolean;
    colors: ColorTheme;
    toggleTheme: () => Promise<void>;
    theme: 'light' | 'dark'; // The actual resolved theme
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    const activeTheme = settings.themeMode === 'automatic'
        ? (systemColorScheme || 'light')
        : settings.themeMode;

    const colors = activeTheme === 'dark' ? DarkColors : LightColors;

    useEffect(() => {
        SystemUI.setBackgroundColorAsync(colors.background);
    }, [activeTheme, colors]);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                // Migrate old "theme" key to new "themeMode" key if exists
                if (parsed.theme && !parsed.themeMode) {
                    parsed.themeMode = parsed.theme;
                }
                
                // Migrate old notificationOffset to new individual offsets
                if (parsed.notificationOffset !== undefined) {
                    if (parsed.lectureOffset === undefined) parsed.lectureOffset = parsed.notificationOffset;
                    if (parsed.assignmentOffset === undefined) parsed.assignmentOffset = parsed.notificationOffset;
                    // For exams, maybe keep default or copy. Let's copy text.
                    if (parsed.examOffset === undefined) parsed.examOffset = parsed.notificationOffset;
                    delete parsed.notificationOffset;
                }
                
                // Set defaults for newly added fields if missing
                if (parsed.quietHoursEnabled === undefined) parsed.quietHoursEnabled = defaultSettings.quietHoursEnabled;
                if (parsed.quietHoursStart === undefined) parsed.quietHoursStart = defaultSettings.quietHoursStart;
                if (parsed.quietHoursEnd === undefined) parsed.quietHoursEnd = defaultSettings.quietHoursEnd;
                if (parsed.dailySummaryEnabled === undefined) parsed.dailySummaryEnabled = defaultSettings.dailySummaryEnabled;
                if (parsed.reduceMotion === undefined) parsed.reduceMotion = defaultSettings.reduceMotion;
                if (parsed.hasOnboarded === undefined) parsed.hasOnboarded = defaultSettings.hasOnboarded;

                setSettings({ ...defaultSettings, ...parsed });
            }
        } catch (error) {
            console.error('[SettingsContext] Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
        setSettings(prevSettings => {
            const updatedSettings = { ...prevSettings, ...newSettings };
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings)).catch(err => {
                console.error('[SettingsContext] Error saving settings:', err);
            });
            return updatedSettings;
        });
    }, []);

    const toggleTheme = async () => {
        // Cycle: Automatic -> Light -> Dark -> Automatic
        const modes: ('automatic' | 'light' | 'dark')[] = ['automatic', 'light', 'dark'];
        const currentIndex = modes.indexOf(settings.themeMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];

        await updateSettings({ themeMode: nextMode });
    }

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoading, colors, toggleTheme, theme: activeTheme }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
