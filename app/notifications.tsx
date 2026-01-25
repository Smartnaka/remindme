import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { useLectures } from '@/contexts/LectureContext';
import { getCurrentDayOfWeek } from '@/utils/dateTime';
import { ColorTheme } from '@/types/theme';

export default function NotificationsScreen() {
    const router = useRouter();
    const { colors } = useSettings();
    const { lectures } = useLectures();

    const styles = useMemo(() => createStyles(colors), [colors]);

    // For this demo, let's just generate some "notifications" based on upcoming lectures
    // In a real app, this might come from a separate notifications store or push notification history
    const notifications = useMemo(() => {
        const today = getCurrentDayOfWeek();
        const todayLectures = lectures.filter(l => l.dayOfWeek === today);

        // Sort by time
        todayLectures.sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
        });

        return todayLectures.map(lecture => ({
            id: lecture.id,
            title: 'Upcoming Class',
            message: `${lecture.courseName} starts at ${lecture.startTime}`,
            time: 'Today',
            type: 'upcoming',
            lectureId: lecture.id
        }));
    }, [lectures]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {notifications.length > 0 ? (
                    notifications.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.notificationCard}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/lecture/${item.lectureId}`)}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name="time" size={24} color={colors.primary} />
                            </View>
                            <View style={styles.textContainer}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                    <Text style={styles.timeText}>{item.time}</Text>
                                </View>
                                <Text style={styles.cardMessage}>{item.message}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyText}>No new notifications</Text>
                        <Text style={styles.emptySubtext}>You're all caught up!</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBackground,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.cardBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textDark,
    },
    content: {
        padding: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 16,
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15', // 15% opacity
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textDark,
    },
    timeText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    cardMessage: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textDark,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textMuted,
    },
});
