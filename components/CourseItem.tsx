import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lecture } from '@/types/lecture';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { DEFAULT_LECTURE_COLOR } from '@/constants/colors';
import { ColorTheme } from '@/types/theme';

interface CourseItemProps {
    lecture: Lecture;
    onPress: () => void;
    onLongPress?: () => void;
    isNext?: boolean;
}

export default memo(function CourseItem({ lecture, onPress, onLongPress, isNext = false }: CourseItemProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.6}
        >
            {/* Color dot indicator */}
            <View style={[styles.colorDot, { backgroundColor: lecture.color || DEFAULT_LECTURE_COLOR }]} />

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.courseName} numberOfLines={1}>{lecture.courseName}</Text>
                    <Text style={styles.timeText}>
                        {formatTimeAMPM(lecture.startTime)}
                    </Text>
                </View>

                <View style={styles.subtitleRow}>
                    {lecture.location ? (
                        <Text style={styles.subtitleText} numberOfLines={1}>
                            {lecture.location} · {formatTimeAMPM(lecture.startTime)}–{formatTimeAMPM(lecture.endTime)}
                        </Text>
                    ) : (
                        <Text style={styles.subtitleText}>
                            {formatTimeAMPM(lecture.startTime)}–{formatTimeAMPM(lecture.endTime)}
                        </Text>
                    )}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
        </TouchableOpacity>
    );
});

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 14,
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        flexShrink: 0,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    courseName: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: colors.textDark,
        flex: 1,
        marginRight: 8,
    },
    timeText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: colors.textMuted,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subtitleText: {
        fontSize: 13,
        color: colors.textMuted,
        fontFamily: 'Inter_400Regular',
    },
    chevron: {
        opacity: 0.3,
    },
});
