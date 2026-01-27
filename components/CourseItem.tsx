import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lecture } from '@/types/lecture';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { DEFAULT_LECTURE_COLOR } from '@/constants/colors';

interface CourseItemProps {
    lecture: Lecture;
    onPress: () => void;
    isNext?: boolean;
}

export default function CourseItem({ lecture, onPress, isNext = false }: CourseItemProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Determine icon based on simple logic or random for variety
    const getIconName = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('math')) return 'calculator-outline';
        if (lower.includes('art')) return 'color-palette-outline';
        if (lower.includes('history')) return 'book-outline';
        if (lower.includes('computer') || lower.includes('code')) return 'terminal-outline';
        if (lower.includes('science')) return 'flask-outline';
        if (lower.includes('market') || lower.includes('business')) return 'megaphone-outline';
        return 'school-outline';
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Color Accent Bar */}
            <View style={[styles.colorAccent, { backgroundColor: lecture.color || DEFAULT_LECTURE_COLOR }]} />

            <View style={[styles.iconBox, isNext && styles.iconBoxNext]}>
                <Ionicons
                    name={getIconName(lecture.courseName)}
                    size={24}
                    color={isNext ? colors.primary : colors.textMuted}
                />
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.courseName} numberOfLines={1}>{lecture.courseName}</Text>
                    {isNext && (
                        <View style={styles.nextBadge}>
                            <Text style={styles.nextText}>NEXT</Text>
                        </View>
                    )}
                </View>

                <View style={styles.detailsRow}>
                    {lecture.location && (
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                            <Text style={styles.metaText} numberOfLines={1}>{lecture.location}</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.metaItem, { marginTop: 4 }]}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>
                        {formatTimeAMPM(lecture.startTime)} – {formatTimeAMPM(lecture.endTime)}
                    </Text>
                </View>
            </View>

            {isNext ? null : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ opacity: 0.5 }} />
            )}

            {isNext && (
                // If next, simpler visual or maybe a specific button if the design calls for it
                // but per design, just the badge is usually enough
                <View />
            )}
        </TouchableOpacity>
    );
}

import { ColorTheme } from '@/types/theme';

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        gap: 16,
        // Subtle shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    colorAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxNext: {
        backgroundColor: colors.primary + '15', // Light tint
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    courseName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textDark,
        flex: 1,
        marginRight: 8,
    },
    nextBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    nextText: {
        color: colors.primary === '#00ff00' ? '#000' : '#FFF', // Black text on neon green
        fontSize: 10,
        fontWeight: '800',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '500',
    }
});
