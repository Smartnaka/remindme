import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lecture } from '@/types/lecture';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { ColorTheme } from '@/types/theme';
import { DEFAULT_LECTURE_COLOR } from '@/constants/colors';

interface LiveLectureCardProps {
    lecture: Lecture;
    onPress: () => void;
}

export default function LiveLectureCard({ lecture, onPress }: LiveLectureCardProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const accentColor = lecture.color || DEFAULT_LECTURE_COLOR;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.75}
        >
            {/* Left color accent stripe */}
            <View style={[styles.stripe, { backgroundColor: accentColor }]} />

            <View style={styles.body}>
                {/* Live badge row */}
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: accentColor + '20' }]}>
                        <View style={[styles.pulseDot, { backgroundColor: accentColor }]} />
                        <Text style={[styles.badgeText, { color: accentColor }]}>LIVE NOW</Text>
                    </View>
                </View>

                {/* Course name */}
                <Text style={styles.courseName} numberOfLines={2}>{lecture.courseName}</Text>

                {/* Details */}
                <View style={styles.detailsRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.detailText}>
                        {formatTimeAMPM(lecture.startTime)} – {formatTimeAMPM(lecture.endTime)}
                    </Text>
                    {lecture.location ? (
                        <>
                            <Text style={styles.detailSeparator}>·</Text>
                            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailText}>{lecture.location}</Text>
                        </>
                    ) : null}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
        </TouchableOpacity>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        minHeight: 80,
    },
    stripe: {
        width: 4,
        alignSelf: 'stretch',
    },
    body: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 6,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        gap: 5,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 0.4,
    },
    courseName: {
        fontSize: 17,
        fontFamily: 'Inter_700Bold',
        color: colors.textDark,
        lineHeight: 22,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    detailText: {
        fontSize: 13,
        color: colors.textMuted,
        fontFamily: 'Inter_400Regular',
    },
    detailSeparator: {
        fontSize: 13,
        color: colors.textMuted,
        marginHorizontal: 2,
    },
    chevron: {
        marginRight: 14,
        opacity: 0.4,
    },
});
