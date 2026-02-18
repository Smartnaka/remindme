
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ColorTheme } from '@/types/theme';

export default function AddAssignmentScreen() {
    const router = useRouter();
    const { lectureId } = useLocalSearchParams();
    const { addAssignment } = useLectures();
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
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
            Alert.alert("Validation Error", "Please enter an assignment title.");
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
            });
            
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (error) {
            console.error("Failed to save assignment", error);
            Alert.alert("Error", "Failed to save assignment");
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
    backButton: { padding: 8 },
    cancelText: { fontSize: 17, color: colors.primary },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textDark },
    saveButton: { padding: 8 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { fontSize: 17, fontWeight: '600', color: colors.primary },
    keyboardView: { flex: 1 },
    content: { padding: 20 },
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
    }
});
