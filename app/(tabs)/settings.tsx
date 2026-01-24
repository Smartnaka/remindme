import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { useLectures } from '@/contexts/LectureContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Switch } from '@/craftrn-ui/components/Switch';

const NOTIFICATION_OPTIONS = [5, 10, 15, 30, 45, 60];

export default function SettingsScreen() {
    const { settings, updateSettings, colors, toggleTheme } = useSettings();
    const { lectures, updateLecture } = useLectures();
    const [isRescheduling, setIsRescheduling] = useState(false);

    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleToggleTheme = () => {
        toggleTheme();
    };

    const handleOffsetChange = (minutes: number) => {
        updateSettings({ notificationOffset: minutes });
    };

    const handleRescheduleAll = async () => {
        if (lectures.length === 0) {
            Alert.alert("No Lectures", "There are no lectures to reschedule.");
            return;
        }

        setIsRescheduling(true);
        if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            // Trigger update on all lectures to reschedule notifications with new offset
            await Promise.all(lectures.map(l => updateLecture(l.id, {})));
            Alert.alert("Success", "All notifications have been rescheduled.");
        } catch (error) {
            console.error("Reschedule error:", error);
            Alert.alert("Error", "Failed to reschedule notifications.");
        } finally {
            setIsRescheduling(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.cardTitle}>Dark Mode</Text>
                            <Text style={styles.cardDescription}>
                                Enable dark color scheme
                            </Text>
                        </View>
                        <Switch
                            value={settings.theme === 'dark'}
                            onValueChange={() => handleToggleTheme()}
                        />
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Notifications</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Reminder Time</Text>
                    <Text style={styles.cardDescription}>
                        Receive a notification before your class starts.
                    </Text>

                    <View style={styles.optionsGrid}>
                        {NOTIFICATION_OPTIONS.map((minutes) => (
                            <TouchableOpacity
                                key={minutes}
                                style={[
                                    styles.optionButton,
                                    settings.notificationOffset === minutes && styles.optionButtonActive
                                ]}
                                onPress={() => handleOffsetChange(minutes)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.optionText,
                                    settings.notificationOffset === minutes && styles.optionTextActive
                                ]}>
                                    {minutes}m
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleRescheduleAll}
                    disabled={isRescheduling}
                >
                    <Ionicons name="reload-circle-outline" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText}>
                        {isRescheduling ? "Updating..." : "Apply to Existing Lectures"}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <View style={styles.infoSection}>
                    <Text style={styles.versionText}>Lectures App v1.2.0</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBackground, // Subtle separator
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.textDark,
    },
    content: {
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textDark,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textDark,
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 0,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    optionButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.textMuted + '40', // Semi-transparent border
        minWidth: 70,
        alignItems: 'center',
    },
    optionButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textDark,
    },
    optionTextActive: {
        color: colors.background === '#000000' ? '#000' : '#FFF', // Ensure contrast
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textDark,
    },
    infoSection: {
        alignItems: 'center',
        marginTop: 20,
    },
    versionText: {
        color: colors.textMuted,
        fontSize: 12,
    }
});
