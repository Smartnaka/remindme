import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors } from '@/constants/colors';

const STORAGE_KEY = '@settings';

interface Settings {
    notificationOffset: number; // in minutes
    theme: 'light' | 'dark';
}

const defaultSettings: Settings = {
    notificationOffset: 15,
    theme: 'light',
};

type ColorsType = typeof LightColors;

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    isLoading: boolean;
    colors: ColorsType;
    toggleTheme: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);



export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [settings, setSettings] = useState<Settings>({
        ...defaultSettings,
        theme: (systemColorScheme === 'dark' ? 'dark' : 'light')
    });
    const [isLoading, setIsLoading] = useState(true);

    const colors = settings.theme === 'dark' ? DarkColors : LightColors;

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                // Merge loaded settings with defaults to handle new keys (like theme)
                setSettings({ ...defaultSettings, ...JSON.parse(data) });
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
        const newTheme = settings.theme === 'light' ? 'dark' : 'light';
        await updateSettings({ theme: newTheme });
    }

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoading, colors, toggleTheme }}>
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
