
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Share } from 'react-native';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import AssignmentProgressBar from '@/components/AssignmentProgressBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { ColorTheme } from '@/types/theme';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useCustomAlert } from '@/contexts/AlertContext';

export default function LectureDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getLectureById, deleteLecture, updateLecture, assignments, addAssignment, updateAssignment, deleteAssignment, getAssignmentsByLectureId } = useLectures();
    const { colors, settings } = useSettings();
    const { showAlert } = useCustomAlert();
    const [showConfetti, setShowConfetti] = useState(false);
    const [lastAttendanceAction, setLastAttendanceAction] = useState<'attended' | 'missed' | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-hide undo button after 5 seconds
    useEffect(() => {
        if (lastAttendanceAction) {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            undoTimerRef.current = setTimeout(() => setLastAttendanceAction(null), 5000);
        }
        return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
    }, [lastAttendanceAction]);

    const lecture = getLectureById(id as string);
    const lectureAssignments = getAssignmentsByLectureId(id as string);

    const accentColor = lecture?.color || colors.primary;
    const styles = useMemo(() => createStyles(colors, accentColor), [colors, accentColor]);

    if (!lecture) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.errorText}>Lecture not found</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                         <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const handleBack = () => router.back();
    const handleEdit = () => router.push(`/add-lecture?id=${lecture.id}`);

    const handleDelete = () => {
        showAlert(
            "Delete Lecture",
            "Are you sure you want to delete this lecture? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        await deleteLecture(lecture.id);
                        router.back();
                    }
                }
            ]
        );
    };

    const handleOpenFile = async (fileUri: string) => {
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(fileUri);
            } else {
                showAlert("Error", "Sharing is not available on this device.");
            }
        } catch (error) {
            console.error("Error opening file", error);
            showAlert("Error", "Could not open file");
        }
    };
    
    const handleAddAssignment = () => {
         router.push({ pathname: "/add-assignment", params: { lectureId: lecture.id }});
    };

    const toggleAssignment = (assignmentId: string, currentStatus: boolean) => {
        const isCompleting = !currentStatus;

        if (Platform.OS !== 'web') {
            if (isCompleting) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.selectionAsync();
            }
        }

        updateAssignment(assignmentId, { isCompleted: !currentStatus });

        if (isCompleting && !settings.reduceMotion) {
            setShowConfetti(true);
        }
    };

    // Attendance helpers
    const totalClasses = lecture.totalClasses || 0;
    const attendedClasses = lecture.attendedClasses || 0;
    const attendancePercent = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
    const attendanceColor = totalClasses === 0 ? colors.textMuted
        : attendancePercent >= 75 ? colors.primary
        : attendancePercent >= 50 ? '#FFD700'
        : colors.error;

    const handleAttended = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateLecture(lecture.id, {
            totalClasses: totalClasses + 1,
            attendedClasses: attendedClasses + 1,
        });
        setLastAttendanceAction('attended');
    };

    const handleMissed = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateLecture(lecture.id, {
            totalClasses: totalClasses + 1,
        });
        setLastAttendanceAction('missed');
    };

    const handleUndoAttendance = () => {
        if (!lastAttendanceAction || totalClasses <= 0) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (lastAttendanceAction === 'attended') {
            updateLecture(lecture.id, {
                totalClasses: Math.max(0, totalClasses - 1),
                attendedClasses: Math.max(0, attendedClasses - 1),
            });
        } else {
            updateLecture(lecture.id, {
                totalClasses: Math.max(0, totalClasses - 1),
            });
        }
        setLastAttendanceAction(null);
    };

    const handleResetAttendance = () => {
        showAlert(
            'Reset Attendance',
            'This will reset all attendance data for this course to zero. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        updateLecture(lecture.id, { totalClasses: 0, attendedClasses: 0 });
                        setLastAttendanceAction(null);
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
             <Stack.Screen options={{ headerShown: false }} />
             
             {/* Custom Header with color accent */}
             <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                     <TouchableOpacity onPress={handleEdit} style={styles.iconBtn}>
                        <Ionicons name="create-outline" size={20} color={colors.textDark} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={[styles.iconBtn, styles.deleteBtn]}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>
             </View>

             <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Hero — Course Name + Badges */}
                <View style={styles.hero}>
                    <View style={[styles.colorBar, { backgroundColor: accentColor }]} />
                    <View style={styles.heroContent}>
                        <Text style={styles.courseName}>{lecture.courseName}</Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: accentColor + '18' }]}>
                                <Ionicons name="calendar" size={13} color={accentColor} />
                                <Text style={[styles.badgeText, { color: accentColor }]}>
                                    {lecture.dayOfWeek}
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: colors.textMuted + '15' }]}>
                                <Ionicons name="time" size={13} color={colors.textMuted} />
                                <Text style={styles.badgeTextMuted}>
                                    {formatTimeAMPM(lecture.startTime)} – {formatTimeAMPM(lecture.endTime)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Info Card — Lecturer + Location combined */}
                {(lecture.lecturer || lecture.location) && (
                    <View style={styles.infoCard}>
                        {lecture.lecturer && (
                            <View style={styles.infoRow}>
                                <View style={[styles.infoIcon, { backgroundColor: accentColor + '15' }]}>
                                    <Ionicons name="person" size={16} color={accentColor} />
                                </View>
                                <View>
                                    <Text style={styles.infoLabel}>Lecturer</Text>
                                    <Text style={styles.infoValue}>{lecture.lecturer}</Text>
                                </View>
                            </View>
                        )}
                        {lecture.lecturer && lecture.location && <View style={styles.infoSeparator} />}
                        {lecture.location && (
                            <View style={styles.infoRow}>
                                <View style={[styles.infoIcon, { backgroundColor: accentColor + '15' }]}>
                                    <Ionicons name="location" size={16} color={accentColor} />
                                </View>
                                <View>
                                    <Text style={styles.infoLabel}>Location</Text>
                                    <Text style={styles.infoValue}>{lecture.location}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Attendance Tracker */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ATTENDANCE</Text>
                    <View style={styles.attendanceCard}>
                        <View style={styles.attendanceTop}>
                            <View style={[styles.attendanceRing, { borderColor: attendanceColor, backgroundColor: attendanceColor + '10' }]}>
                                <Text style={[styles.attendancePercent, { color: attendanceColor }]}>
                                    {totalClasses > 0 ? `${attendancePercent}%` : '—'}
                                </Text>
                            </View>
                            <View style={styles.attendanceMeta}>
                                <Text style={styles.attendanceCount}>
                                    {attendedClasses} of {totalClasses}
                                </Text>
                                <Text style={styles.attendanceSubtext}>classes attended</Text>
                                {totalClasses > 0 && (
                                    <Text style={[styles.attendanceMood, { color: attendanceColor }]}>
                                        {attendancePercent >= 75 ? '🔥 Great!'
                                            : attendancePercent >= 50 ? '⚠️ Could improve'
                                            : '😬 Needs work'}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <View style={styles.attendanceActions}>
                            <TouchableOpacity
                                style={[styles.attendanceBtn, styles.attendBtnGreen]}
                                onPress={handleAttended}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                                <Text style={[styles.attendanceBtnText, { color: colors.primary }]}>Attended</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.attendanceBtn, styles.attendBtnRed]}
                                onPress={handleMissed}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close-circle" size={18} color={colors.error} />
                                <Text style={[styles.attendanceBtnText, { color: colors.error }]}>Missed</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Undo bar — appears for 5 seconds after tapping */}
                        {lastAttendanceAction && (
                            <TouchableOpacity style={styles.undoBar} onPress={handleUndoAttendance} activeOpacity={0.7}>
                                <Ionicons name="arrow-undo" size={16} color={colors.primary} />
                                <Text style={styles.undoText}>
                                    Marked as {lastAttendanceAction} — tap to undo
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Reset option — only show when there's data */}
                        {totalClasses > 0 && (
                            <TouchableOpacity style={styles.resetRow} onPress={handleResetAttendance} activeOpacity={0.6}>
                                <Ionicons name="refresh" size={14} color={colors.textMuted} />
                                <Text style={styles.resetText}>Reset attendance</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Resources */}
                {lecture.files && lecture.files.length > 0 && (
                     <View style={styles.section}>
                        <Text style={styles.sectionTitle}>RESOURCES</Text>
                        <View style={styles.cardGroup}>
                            {lecture.files.map((file, index) => (
                                <TouchableOpacity 
                                    key={file.id} 
                                    style={[styles.fileRow, index > 0 && styles.borderTop]}
                                    onPress={() => handleOpenFile(file.uri)}
                                    activeOpacity={0.6}
                                >
                                     <View style={[styles.fileIconBg, { backgroundColor: accentColor + '12' }]}>
                                        <Ionicons 
                                            name={file.type === 'image' ? 'image' : file.type === 'pdf' ? 'document-text' : 'document'} 
                                            size={18} 
                                            color={accentColor} 
                                        />
                                     </View>
                                     <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                                     <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                     </View>
                )}

                {/* Assignments */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                         <Text style={styles.sectionTitle}>ASSIGNMENTS</Text>
                         <TouchableOpacity onPress={handleAddAssignment} style={styles.addBtn}>
                             <Ionicons name="add" size={18} color={colors.primary} />
                             <Text style={styles.addBtnText}>Add</Text>
                         </TouchableOpacity>
                    </View>

                    {lectureAssignments.length === 0 ? (
                        <TouchableOpacity style={styles.emptyState} onPress={handleAddAssignment} activeOpacity={0.7}>
                            <Ionicons name="clipboard-outline" size={28} color={colors.textMuted} />
                            <Text style={styles.emptyStateText}>No assignments yet</Text>
                            <Text style={styles.emptyStateHint}>Tap to add one</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.cardGroup}>
                            {lectureAssignments.map((assignment, index) => (
                                <View key={assignment.id} style={[styles.assignmentCard, index > 0 && styles.borderTop]}>
                                    <TouchableOpacity 
                                        style={styles.checkbox} 
                                        onPress={() => toggleAssignment(assignment.id, assignment.isCompleted)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons 
                                            name={assignment.isCompleted ? "checkbox" : "square-outline"} 
                                            size={22} 
                                            color={assignment.isCompleted ? colors.primary : colors.textMuted} 
                                        />
                                    </TouchableOpacity>
                                    <View style={styles.assignmentContent}>
                                        <View style={styles.assignmentHeader}>
                                            <Text style={[styles.assignmentTitle, assignment.isCompleted && styles.completedText]} numberOfLines={2}>
                                                {assignment.title}
                                            </Text>
                                            {assignment.priority && assignment.priority !== 'medium' && (
                                                <View style={[
                                                    styles.priorityBadge,
                                                    { backgroundColor: assignment.priority === 'high' ? '#FF4757' : '#3498db' }
                                                ]}>
                                                    <Text style={styles.priorityBadgeText}>
                                                        {assignment.priority === 'high' ? '!' : '↓'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {assignment.dueDate && (
                                            <AssignmentProgressBar
                                                dueDate={assignment.dueDate}
                                                isCompleted={assignment.isCompleted}
                                            />
                                        )}
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => {
                                             Alert.alert(
                                                "Delete Assignment",
                                                "Delete this assignment?",
                                                [
                                                    { text: "Cancel" },
                                                    { text: "Delete", style: 'destructive', onPress: () => deleteAssignment(assignment.id) }
                                                ]
                                             )
                                        }}
                                        style={styles.deleteAssignmentBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close" size={16} color={colors.textMuted + '80'} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={{height: 40}} />

             </ScrollView>

            {/* Confetti celebration overlay */}
            <ConfettiCelebration
                visible={showConfetti}
                onComplete={() => setShowConfetti(false)}
            />
        </SafeAreaView>
    );
}

const createStyles = (colors: ColorTheme, accent: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cardBackground === '#F8F9FA' ? '#F2F2F7' : '#000000',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    errorText: {
        fontSize: 17,
        color: colors.textMuted,
    },
    backButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: colors.primary,
        borderRadius: 20,
        marginTop: 8,
    },
    backButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
    },
    deleteBtn: {
        backgroundColor: colors.error + '12',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },

    // Hero
    hero: {
        flexDirection: 'row',
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    colorBar: {
        width: 5,
    },
    heroContent: {
        flex: 1,
        padding: 18,
    },
    courseName: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textDark,
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 5,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    badgeTextMuted: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '500',
    },

    // Info Card
    infoCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textDark,
        marginTop: 1,
    },
    infoSeparator: {
        height: 1,
        backgroundColor: colors.textMuted + '15',
        marginHorizontal: 12,
    },

    // Sections
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        marginBottom: 8,
        letterSpacing: 0.8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },

    // Attendance
    attendanceCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        padding: 16,
    },
    attendanceTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 14,
    },
    attendanceRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attendancePercent: {
        fontSize: 17,
        fontWeight: '800',
    },
    attendanceMeta: {
        flex: 1,
    },
    attendanceCount: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textDark,
    },
    attendanceSubtext: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 1,
    },
    attendanceMood: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    attendanceActions: {
        flexDirection: 'row',
        gap: 10,
    },
    attendanceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    attendBtnGreen: {
        backgroundColor: colors.primary + '12',
    },
    attendBtnRed: {
        backgroundColor: colors.error + '12',
    },
    attendanceBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Cards
    cardGroup: {
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        overflow: 'hidden',
    },
    borderTop: {
        borderTopWidth: 1,
        borderTopColor: colors.textMuted + '12',
    },

    // Files
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    fileIconBg: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileName: {
        flex: 1,
        fontSize: 15,
        color: colors.textDark,
        fontWeight: '500',
    },

    // Assignments
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: colors.primary + '12',
    },
    addBtnText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        gap: 6,
    },
    emptyStateText: {
        color: colors.textMuted,
        fontSize: 15,
        fontWeight: '500',
    },
    emptyStateHint: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    assignmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    checkbox: {
        marginRight: 10,
    },
    assignmentContent: {
        flex: 1,
    },
    assignmentTitle: {
        fontSize: 15,
        color: colors.textDark,
        fontWeight: '500',
        flex: 1,
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: colors.textMuted,
    },
    deleteAssignmentBtn: {
        padding: 6,
        marginLeft: 4,
    },
    assignmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    priorityBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priorityBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    undoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: colors.primary + '10',
        borderRadius: 10,
    },
    undoText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    resetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    resetText: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '500',
    },
});
