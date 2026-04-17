import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lecture } from '@/types/lecture';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { ColorTheme } from '@/types/theme';
import { DEFAULT_LECTURE_COLOR } from '@/constants/colors';

// Design tokens
const GRADIENT_END_ALPHA = 'CC'; // 80% opacity
const LIVE_BORDER_ALPHA = '55';  // 33% opacity
const PRESS_SCALE = 0.97;

interface LiveLectureCardProps {
    lecture: Lecture;
    onPress: () => void;
}

export default function LiveLectureCard({ lecture, onPress }: LiveLectureCardProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const accentColor = lecture.color || DEFAULT_LECTURE_COLOR;
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => sub.remove();
    }, []);

    // Pulsing dot animation (disabled when reduce motion is on)
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (reduceMotion) {
            pulseAnim.setValue(1);
            return;
        }
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [reduceMotion]);

    // Press scale animation
    const pressScale = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => {
        Animated.timing(pressScale, { toValue: PRESS_SCALE, duration: 120, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    };

    return (
        <Animated.View style={[styles.outerWrapper, { transform: [{ scale: pressScale }] }]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <LinearGradient
                    colors={[colors.cardBackground, colors.cardBackground + GRADIENT_END_ALPHA]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.container}
                >
                    {/* Left color accent stripe */}
                    <View style={[styles.stripe, { backgroundColor: accentColor }]} />

                    <View style={styles.body}>
                        {/* Live badge row */}
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                                <Animated.View style={[styles.pulseDot, { backgroundColor: colors.background, transform: [{ scale: pulseAnim }] }]} />
                                <Text style={styles.badgeText}>LIVE NOW</Text>
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
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    outerWrapper: {
        borderRadius: 18,
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.22,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    container: {
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        minHeight: 90,
        borderWidth: 1.5,
        borderColor: colors.primary + LIVE_BORDER_ALPHA,
    },
    stripe: {
        width: 5,
        alignSelf: 'stretch',
    },
    body: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 16,
        gap: 7,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    pulseDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 0.6,
        color: '#FFF',
    },
    courseName: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: colors.textDark,
        lineHeight: 25,
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
        opacity: 0.85,
    },
    detailSeparator: {
        fontSize: 13,
        color: colors.textMuted,
        marginHorizontal: 2,
    },
    chevron: {
        marginRight: 16,
        opacity: 0.35,
    },
});
