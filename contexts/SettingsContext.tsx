import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors } from '@/constants/colors';
import { ColorTheme } from '@/types/theme';

const STORAGE_KEY = '@settings';

interface Settings {
    notificationOffset: number; // in minutes
    themeMode: 'automatic' | 'light' | 'dark';
    lastNotificationCheckDate?: string; // ISO date string YYYY-MM-DD
}

const defaultSettings: Settings = {
    notificationOffset: 15,
    themeMode: 'automatic',
    lastNotificationCheckDate: '',
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
                setSettings({ ...defaultSettings, ...parsed });
            }
        } catch (error) {
            console.error('[SettingsContext] Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<Settings>) => {
        try {
            const updatedSettings = { ...settings, ...newSettings };
            setSettings(updatedSettings);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
        } catch (error) {
            console.error('[SettingsContext] Error saving settings:', error);
        }
    };

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
