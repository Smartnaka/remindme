
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { ColorTheme } from '@/types/theme';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

export default function LectureDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getLectureById, deleteLecture, assignments, addAssignment, updateAssignment, deleteAssignment, getAssignmentsByLectureId } = useLectures();
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const lecture = getLectureById(id as string);
    const lectureAssignments = getAssignmentsByLectureId(id as string);

    if (!lecture) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Lecture not found</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                         <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const handleBack = () => {
        router.back();
    };

    const handleEdit = () => {
        router.push(`/add-lecture?id=${lecture.id}`);
    };

    const handleDelete = () => {
        Alert.alert(
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
                Alert.alert("Error", "Sharing is not available on this device.");
            }
        } catch (error) {
            console.error("Error opening file", error);
            Alert.alert("Error", "Could not open file");
        }
    };
    
    const handleAddAssignment = () => {
         router.push({ pathname: "/add-assignment", params: { lectureId: lecture.id }});
    };

    const toggleAssignment = (assignmentId: string, currentStatus: boolean) => {
        if(Platform.OS !== 'web') Haptics.selectionAsync();
        updateAssignment(assignmentId, { isCompleted: !currentStatus });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
             <Stack.Screen options={{ headerShown: false }} />
             
             {/* Header */}
             <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                     <TouchableOpacity onPress={handleEdit} style={styles.iconBtn}>
                        <Ionicons name="pencil" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                </View>
             </View>

             <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                
                {/* Title & Info */}
                <View style={styles.titleSection}>
                    <Text style={styles.courseName}>{lecture.courseName}</Text>
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: lecture.color || colors.primary + '20' }]}>
                            <Text style={[styles.badgeText, { color: lecture.color ? '#FFF' : colors.primary }]}>
                                {lecture.dayOfWeek}
                            </Text>
                        </View>
                        <View style={styles.badge}>
                            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.badgeTextMuted}>
                                {formatTimeAMPM(lecture.startTime)} - {formatTimeAMPM(lecture.endTime)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Lecturer Info */}
                {lecture.lecturer && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>LECTURER</Text>
                        <View style={styles.card}>
                             <View style={styles.row}>
                                <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                                <Text style={styles.cardText}>{lecture.lecturer}</Text>
                             </View>
                        </View>
                    </View>
                )}

                {/* Location */}
                {lecture.location && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>LOCATION</Text>
                         <View style={styles.card}>
                             <View style={styles.row}>
                                <Ionicons name="location-outline" size={24} color={colors.primary} />
                                <Text style={styles.cardText}>{lecture.location}</Text>
                             </View>
                        </View>
                    </View>
                )}

                {/* Files */}
                {lecture.files && lecture.files.length > 0 && (
                     <View style={styles.section}>
                        <Text style={styles.sectionTitle}>RESOURCES</Text>
                        <View style={styles.cardGroups}>
                            {lecture.files.map((file, index) => (
                                <TouchableOpacity 
                                    key={file.id} 
                                    style={[styles.fileCard, index > 0 && styles.borderTop]}
                                    onPress={() => handleOpenFile(file.uri)}
                                >
                                     <Ionicons 
                                        name={file.type === 'image' ? 'image-outline' : file.type === 'pdf' ? 'document-text-outline' : 'document-outline'} 
                                        size={22} 
                                        color={colors.primary} 
                                      />
                                     <Text style={styles.fileName}>{file.name}</Text>
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
                         <TouchableOpacity onPress={handleAddAssignment}>
                             <Text style={styles.addBtnText}>+ Add</Text>
                         </TouchableOpacity>
                    </View>

                    {lectureAssignments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No assignments yet</Text>
                        </View>
                    ) : (
                        <View style={styles.cardGroups}>
                            {lectureAssignments.map((assignment, index) => (
                                <View key={assignment.id} style={[styles.assignmentCard, index > 0 && styles.borderTop]}>
                                    <TouchableOpacity 
                                        style={styles.checkbox} 
                                        onPress={() => toggleAssignment(assignment.id, assignment.isCompleted)}
                                    >
                                        <Ionicons 
                                            name={assignment.isCompleted ? "checkbox" : "square-outline"} 
                                            size={24} 
                                            color={assignment.isCompleted ? colors.primary : colors.textMuted} 
                                        />
                                    </TouchableOpacity>
                                    <View style={styles.assignmentContent}>
                                        <Text style={[styles.assignmentTitle, assignment.isCompleted && styles.completedText]}>
                                            {assignment.title}
                                        </Text>
                                        {assignment.dueDate && (
                                            <Text style={styles.assignmentDate}>
                                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                            </Text>
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
                                    >
                                        <Ionicons name="close" size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={{height: 40}} />

             </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 18,
        color: colors.textDark,
        marginBottom: 16,
    },
    backButton: {
        padding: 10,
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
    },
    backButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    titleSection: {
        marginBottom: 24,
    },
    courseName: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textDark,
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.cardBackground,
        gap: 4,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    badgeTextMuted: {
        fontSize: 13,
        color: colors.textMuted,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 16,
    },
    cardGroups: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardText: {
        fontSize: 16,
        color: colors.textDark,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    fileName: {
        flex: 1,
        fontSize: 16,
        color: colors.textDark,
    },
    borderTop: {
        borderTopWidth: 1,
        borderTopColor: colors.textMuted + '20',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    addBtnText: {
        fontSize: 15,
        color: colors.primary,
        fontWeight: '600',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.textMuted + '40',
    },
    emptyStateText: {
        color: colors.textMuted,
        fontSize: 14,
    },
    assignmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    checkbox: {
        marginRight: 12,
    },
    assignmentContent: {
        flex: 1,
    },
    assignmentTitle: {
        fontSize: 16,
        color: colors.textDark,
        marginBottom: 2,
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: colors.textMuted,
    },
    assignmentDate: {
        fontSize: 12,
        color: colors.primary,
    },
    deleteAssignmentBtn: {
        padding: 4,
    }
});
