
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Animated, StatusBar, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ColorTheme } from '@/types/theme';
import { useCustomAlert } from '@/contexts/AlertContext';

export default function AddAssignmentScreen() {
    const router = useRouter();
    const { lectureId } = useLocalSearchParams();
    const { addAssignment, lectures } = useLectures();
    const { colors } = useSettings();
    const { showAlert } = useCustomAlert();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const course = lectures.find(l => l.id === lectureId);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            showAlert("Validation Error", "Please enter an assignment title.");
            return;
        }

        setIsSaving(true);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await addAssignment({
                lectureId: lectureId as string,
                title: title.trim(),
                description: description.trim(),
                dueDate: date.toISOString(),
                isCompleted: false,
                priority,
            });
            
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            if (course) {
               DeviceEventEmitter.emit('showSuccessToast', { message: `Added to "${course.courseName}"` });
            }
            
            router.back();
        } catch (error) {
            console.error("Failed to save assignment", error);
            showAlert("Error", "Failed to save assignment");
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
             <Stack.Screen options={{ headerShown: false }} />
             <StatusBar barStyle={colors.cardBackground === '#F8F9FA' ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

             <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Assignment</Text>
                <TouchableOpacity 
                    onPress={handleSave} 
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    
                    {course && (
                        <View style={styles.courseBadgeContainer}>
                            <View style={[styles.courseBadge, { backgroundColor: course.color || colors.primary + '20' }]}>
                                <Ionicons name="folder-outline" size={16} color={course.color ? '#FFF' : colors.primary} style={{ marginRight: 6 }} />
                                <Text style={[styles.courseBadgeText, { color: course.color ? '#FFF' : colors.primary }]}>
                                    {course.courseName}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Assignment Title"
                            placeholderTextColor={colors.textMuted}
                            value={title}
                            onChangeText={setTitle}
                            autoFocus
                        />
                         <View style={styles.separator} />
                         <TextInput
                            style={styles.descInput}
                            placeholder="Description (Optional)"
                            placeholderTextColor={colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </View>

                    <Text style={styles.label}>PRIORITY</Text>
                    <Text style={styles.priorityHint}>Higher priority assignments appear first in your list</Text>
                    <View style={styles.priorityContainer}>
                        {(['low', 'medium', 'high'] as const).map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.priorityChip,
                                    priority === p && (styles as any)[`priorityChip_${p}`],
                                ]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                                    setPriority(p);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.priorityText,
                                        priority === p && styles.priorityTextActive,
                                    ]}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ marginBottom: 24 }} />

                    <Text style={styles.label}>DUE DATE</Text>
                    <View style={styles.inputGroup}>
                        {Platform.OS === 'web' ? (
                            <View style={styles.pickerRow}>
                                <Text style={styles.rowLabel}>Date</Text>
                                <input 
                                    type="date" 
                                    value={date.toISOString().split('T')[0]} 
                                    onChange={(e) => setDate(new Date(e.target.value))}
                                    style={{ border: 'none', background: 'transparent', fontSize: 16, color: colors.primary }}
                                />
                            </View>
                        ) : (
                             <>
                                <TouchableOpacity 
                                    style={styles.pickerRow} 
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.rowLabel}>Due Date</Text>
                                    <Text style={styles.pickerValue}>{date.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                {(showDatePicker || (Platform.OS === 'ios' && showDatePicker)) && (
                                     <View style={styles.datePickerContainer}>
                                        <DateTimePicker
                                            value={date}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={handleDateChange}
                                            textColor={colors.textDark}
                                            style={styles.datePicker}
                                        />
                                        {Platform.OS === 'ios' && (
                                            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                                                <Text style={styles.doneText}>Done</Text>
                                            </TouchableOpacity>
                                        )}
                                     </View>
                                )}
                             </>
                        )}
                    </View>

                    {/* Past-date warning */}
                    {date < new Date(new Date().setHours(0,0,0,0)) && (
                        <View style={styles.pastDateWarning}>
                            <Ionicons name="warning" size={16} color="#FF9500" />
                            <Text style={styles.pastDateText}>This date has already passed — no reminder will be sent.</Text>
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cardBackground === '#F8F9FA' ? '#F2F2F7' : '#000000',
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: colors.textMuted + '20',
    },
    backButton: { padding: 14 },
    cancelText: { fontSize: 17, color: colors.primary },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textDark },
    saveButton: { padding: 14 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { fontSize: 17, fontWeight: '600', color: colors.primary },
    keyboardView: { flex: 1 },
    content: { padding: 20 },
    courseBadgeContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    courseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    courseBadgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    inputGroup: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
    },
    titleInput: {
        fontSize: 17,
        color: colors.textDark,
        padding: 16,
    },
    separator: {
        height: 1,
        backgroundColor: colors.textMuted + '20',
        marginLeft: 16,
    },
    descInput: {
        fontSize: 17,
        color: colors.textDark,
        padding: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
        marginLeft: 16,
    },
    priorityContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
    },
    priorityChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.textMuted + '30',
        minWidth: 80,
        alignItems: 'center',
    },
    priorityChip_low: {
        backgroundColor: '#3498db', // Blue
        borderColor: '#3498db',
    },
    priorityChip_medium: {
        backgroundColor: '#f39c12', // Orange
        borderColor: '#f39c12',
    },
    priorityChip_high: {
        backgroundColor: '#e74c3c', // Red
        borderColor: '#e74c3c',
    },
    priorityText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textDark,
    },
    priorityTextActive: {
        color: '#ffffff',
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: colors.cardBackground,
    },
    rowLabel: {
        fontSize: 17,
        color: colors.textDark,
    },
    pickerValue: {
        fontSize: 17,
        color: colors.primary,
    },
    datePickerContainer: {
        backgroundColor: colors.cardBackground,
        paddingBottom: 10,
    },
    datePicker: {
        alignSelf: 'center',
    },
    doneBtn: {
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: colors.textMuted + '20',
    },
    doneText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 17,
    },
    priorityHint: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 8,
        marginTop: -4,
        marginHorizontal: 4,
    },
    pastDateWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF950015',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    pastDateText: {
        color: '#D97706',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    }
});
