import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lecture } from '@/types/lecture';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { LinearGradient } from 'expo-linear-gradient';

interface NextLectureCardProps {
    lecture: Lecture;
    onPress: () => void;
}

export default function NextLectureCard({ lecture, onPress }: NextLectureCardProps) {
    const { colors } = useSettings();
    const [timeUntil, setTimeUntil] = useState('');
    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        const updateTimeUntil = () => {
            const now = new Date();
            const [hours, minutes] = lecture.startTime.split(':').map(Number);
            const lectureTime = new Date();
            lectureTime.setHours(hours, minutes, 0, 0);

            const diff = lectureTime.getTime() - now.getTime();
            const diffMinutes = Math.floor(diff / 60000);
            const diffHours = Math.floor(diffMinutes / 60);

            if (diffMinutes < 60) {
                setTimeUntil(`Starts in ${diffMinutes} min`);
            } else {
                const remainingMins = diffMinutes % 60;
                setTimeUntil(`Starts in ${diffHours}h ${remainingMins}m`);
            }
        };

        updateTimeUntil();
        const interval = setInterval(updateTimeUntil, 60000);
        return () => clearInterval(interval);
    }, [lecture.startTime]);

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={styles.shadowContainer}
        >
            <LinearGradient
                colors={[colors.primary, '#00A87E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                <View style={styles.header}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>UP NEXT</Text>
                    </View>
                    <Text style={styles.timeUntil}>{timeUntil}</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.courseName} numberOfLines={1}>
                        {lecture.courseName}
                    </Text>

                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.detailText}>
                                {formatTimeAMPM(lecture.startTime)} - {formatTimeAMPM(lecture.endTime)}
                            </Text>
                        </View>

                        {lecture.location && (
                            <View style={styles.detailItem}>
                                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.detailText} numberOfLines={1}>
                                    {lecture.location}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.arrowContainer}>
                    <Ionicons name="arrow-forward" size={24} color="#FFF" />
                </View>

            </LinearGradient>
        </TouchableOpacity>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    shadowContainer: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
        marginBottom: 24,
        marginTop: 4,
    },
    container: {
        borderRadius: 24,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    timeUntil: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        marginBottom: 8,
    },
    courseName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },
    detailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '500',
    },
    arrowContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        padding: 8,
    }
});
