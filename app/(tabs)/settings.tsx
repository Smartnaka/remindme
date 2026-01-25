import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { sendTestNotification } from '@/utils/notifications';
import { syncLecturesToCalendar } from '@/utils/calendar';
import { useLectures } from '@/contexts/LectureContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Switch } from '@/craftrn-ui/components/Switch';

const NOTIFICATION_OPTIONS = [5, 10, 15, 30, 45, 60];

export default function SettingsScreen() {
    const { settings, updateSettings, colors, toggleTheme } = useSettings();
    const { lectures, updateLecture, clearLectures } = useLectures();
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

    const handleCalendarSync = async () => {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        await syncLecturesToCalendar(lectures, settings.notificationOffset);
    };

    const handleTestNotification = async () => {
        if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await sendTestNotification();
            Alert.alert("Test Sent", "You should receive a notification in 2 seconds.");
        } else {
            alert("Test Notification sent!");
        }
    };

    const SectionHeader = ({ title, icon }: { title: string; icon?: any }) => (
        <View style={styles.sectionHeader}>
            {icon && <Ionicons name={icon} size={18} color={colors.textMuted} />}
            <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>

                {/* PREFERENCES SECTION */}
                <SectionHeader title="Preferences" />
                <View style={styles.groupedList}>
                    <View style={styles.row}>
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.textDark }]}>
                                <Ionicons name="moon" size={16} color={colors.background} />
                            </View>
                            <Text style={styles.rowLabel}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={settings.theme === 'dark'}
                            onValueChange={() => handleToggleTheme()}
                        />
                    </View>
                </View>

                {/* NOTIFICATIONS SECTION */}
                <SectionHeader title="Notifications" />
                <View style={styles.groupedList}>
                    <View style={styles.columnRow}>
                        <Text style={styles.rowLabel}>Reminder Time</Text>
                        <Text style={styles.rowSubLabel}>Notify me before class starts:</Text>
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

                    <View style={styles.separator} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={handleTestNotification}
                        activeOpacity={0.7}
                    >
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowLabel, { color: colors.primary }]}>Send Test Notification</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={handleRescheduleAll}
                        disabled={isRescheduling}
                    >
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Reschedule Notifications</Text>
                        </View>
                        {isRescheduling ? <Text style={styles.rowValue}>Updating...</Text> : <Ionicons name="chevron-forward" size={16} color={colors.textMuted + '80'} />}
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={handleCalendarSync}
                        activeOpacity={0.7}
                    >
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Sync to System Calendar</Text>
                        </View>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* DATA SECTION */}
                <SectionHeader title="Data Management" />
                <View style={styles.groupedList}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => {
                            Alert.alert(
                                "Clear All Data",
                                "Are you sure you want to delete all lectures? This cannot be undone.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Clear All",
                                        style: "destructive",
                                        onPress: async () => {
                                            await clearLectures();
                                            Alert.alert("Success", "All data cleared.");
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowLabel, { color: colors.error }]}>Clear All Data</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.versionText}>Lectures App v1.2.0</Text>
                </View>

            </ScrollView >
        </SafeAreaView >
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cardBackground === '#F8F9FA' ? '#F2F2F7' : '#000000',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: colors.textDark,
        letterSpacing: -0.5,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 16,
        paddingLeft: 12,
        gap: 6,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        letterSpacing: -0.2,
    },
    groupedList: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 50,
        backgroundColor: colors.cardBackground,
    },
    columnRow: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.cardBackground,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '500', // Standard iOS font weight for lists
        color: colors.textDark,
    },
    rowSubLabel: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 4,
        marginBottom: 12,
    },
    rowValue: {
        fontSize: 16,
        color: colors.textMuted,
    },
    separator: {
        height: 1,
        backgroundColor: colors.textMuted + '20',
        marginLeft: 16,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.textMuted + '30',
    },
    optionButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textDark,
    },
    optionTextActive: {
        color: colors.background === '#000000' ? '#000' : '#FFF',
    },
    infoSection: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 40,
    },
    versionText: {
        color: colors.textMuted,
        fontSize: 13,
    }
});
