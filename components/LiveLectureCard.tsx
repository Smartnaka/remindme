import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lecture } from '@/types/lecture';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { ColorTheme } from '@/types/theme';

interface LiveLectureCardProps {
    lecture: Lecture;
    onPress: () => void;
}

export default function LiveLectureCard({ lecture, onPress }: LiveLectureCardProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.header}>
                <View style={styles.badge}>
                    <Ionicons name="radio-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.badgeText}>LIVE NOW</Text>
                </View>
                <View style={styles.iconContainer}>
                    <Ionicons name="school" size={24} color={colors.primary} />
                </View>
            </View>

            <Text style={styles.courseName} numberOfLines={2}>
                {lecture.courseName}
            </Text>

            <View style={styles.detailsContainer}>
                {lecture.location && (
                    <View style={styles.row}>
                        <Ionicons name="location-sharp" size={18} color={colors.textDark} style={{ opacity: 0.7 }} />
                        <Text style={styles.detailText}>{lecture.location}</Text>
                    </View>
                )}

                <View style={styles.row}>
                    <Ionicons name="time" size={18} color={colors.textDark} style={{ opacity: 0.7 }} />
                    <Text style={styles.detailText}>
                        {formatTimeAMPM(lecture.startTime)} – {formatTimeAMPM(lecture.endTime)}
                    </Text>
                </View>
            </View>

            {/* Decorative circle */}
            <View style={styles.decorativeCircle} />
        </TouchableOpacity>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        backgroundColor: colors.primary + '15', // Ultra light green background (15% opacity)
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.primary,
        overflow: 'hidden',
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    badge: {
        backgroundColor: colors.primary, // Solid green
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeText: {
        color: colors.background === '#000000' ? '#000' : '#FFF', // Contrast text
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    iconContainer: {
        width: 44,
        height: 44,
        backgroundColor: '#FFFFFF', // Constant white for cleanliness in light/dark
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    courseName: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textDark,
        marginBottom: 20,
        lineHeight: 30,
    },
    detailsContainer: {
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailText: {
        fontSize: 16,
        color: colors.textDark,
        fontWeight: '500',
        opacity: 0.9,
    },
    decorativeCircle: {
        position: 'absolute',
        bottom: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.primary,
        opacity: 0.1,
        zIndex: -1,
    }
});
