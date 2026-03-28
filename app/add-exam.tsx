import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useNavigation, useLocalSearchParams } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { useExams } from '@/contexts/ExamContext';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ColorTheme } from '@/types/theme';
import { useCustomAlert } from '@/contexts/AlertContext';
import { validateCourseName, validateLocation, validateNotes } from '@/utils/validation';

export default function AddExamScreen() {
    const router = useRouter();
    const { source } = useLocalSearchParams();
    const { colors } = useSettings();
    const { addExam } = useExams();
    const { showAlert } = useCustomAlert();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [courseName, setCourseName] = useState('');
    const [date, setDate] = useState(new Date());
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSubmitted = React.useRef(false);
    
    const navigation = useNavigation();

    // Track if user made any input
    const isDirty = useMemo(() => {
        return courseName.trim().length > 0 || location.trim().length > 0 || notes.trim().length > 0;
    }, [courseName, location, notes]);

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!isDirty || isSubmitted.current) {
                return; // Let navigation proceed
            }
            e.preventDefault();
            showAlert(
                "Discard changes?",
                "You have unsaved changes. Are you sure you want to discard them?",
                [
                    { text: "Keep Editing", style: "cancel" },
                    { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(e.data.action) }
                ]
            );
        });
        return unsubscribe;
    }, [navigation, isDirty]);

    // Status Bar Logic
    const statusBarStyle = colors.cardBackground === '#F8F9FA' ? 'dark-content' : 'light-content';

    const handleSave = async () => {
        const courseNameValidation = validateCourseName(courseName);
        if (!courseNameValidation.valid) {
            showAlert('Validation Error', courseNameValidation.error!);
            return;
        }

        const locationValidation = validateLocation(location);
        if (!locationValidation.valid) {
            showAlert('Validation Error', locationValidation.error!);
            return;
        }

        const notesValidation = validateNotes(notes);
        if (!notesValidation.valid) {
            showAlert('Validation Error', notesValidation.error!);
            return;
        }

        try {
            await addExam({
                courseName: courseName.trim(),
                date: date.toISOString(),
                location: location.trim() || undefined,
                notes: notes.trim() || undefined,
            });
            isSubmitted.current = true;
            router.back();
        } catch (error) {
            console.error("Failed to save exam", error);
            showAlert("Error", "Failed to save exam");
            setIsSaving(false);
        }
    };

    const showAndroidDatePicker = () => {
        DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            onChange: (_, selectedDate) => {
                if (selectedDate) {
                    const newDate = new Date(selectedDate);
                    // Preserve time
                    newDate.setHours(date.getHours());
                    newDate.setMinutes(date.getMinutes());

                    // Show Time Picker immediately after
                    DateTimePickerAndroid.open({
                        value: newDate,
                        mode: 'time',
                        is24Hour: false,
                        onChange: (_, selectedTime) => {
                            if (selectedTime) {
                                const finalDate = new Date(newDate);
                                finalDate.setHours(selectedTime.getHours());
                                finalDate.setMinutes(selectedTime.getMinutes());
                                setDate(finalDate);
                            }
                        }
                    });
                }
            }
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backIconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Exam</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving}
                    style={[styles.saveButtonFilled, isSaving && styles.saveButtonDisabled]}
                >
                    <Text style={styles.saveTextFilled}>{isSaving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Course Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Calculus II Midterm"
                        placeholderTextColor={colors.textMuted}
                        value={courseName}
                        onChangeText={setCourseName}
                        autoFocus
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Date & Time</Text>
                    {/* ... picker logic ... */}
                    {Platform.OS === 'web' ? (
                        <View style={styles.datePickerCard}>
                            <input
                                type="datetime-local"
                                value={date.toISOString().slice(0, 16)}
                                onChange={(e: any) => {
                                    const newDate = new Date(e.target.value);
                                    if (!isNaN(newDate.getTime())) {
                                        setDate(newDate);
                                    }
                                }}
                                style={{
                                    fontSize: 16,
                                    padding: 8,
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: colors.textDark,
                                    width: '100%',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    cursor: 'pointer',
                                }}
                            />
                        </View>
                    ) : Platform.OS === 'ios' ? (
                        <View style={styles.datePickerCard}>
                            <DateTimePicker
                                value={date}
                                mode="datetime"
                                display="spinner"
                                onChange={(_, selectedDate) => selectedDate && setDate(selectedDate)}
                                style={{ height: 120 }}
                                textColor={colors.textDark}
                            />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.androidDateButton}
                            onPress={showAndroidDatePicker}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar" size={20} color={colors.primary} />
                            <Text style={styles.androidDateText}>
                                {date.toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: 'numeric', minute: '2-digit'
                                })}
                            </Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Past-date warning */}
                {date < new Date(new Date().setHours(0,0,0,0)) && (
                    <View style={styles.pastDateWarning}>
                        <Ionicons name="warning" size={16} color="#FF9500" />
                        <Text style={styles.pastDateText}>This date has already passed — no reminder will be sent.</Text>
                    </View>
                )}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Location (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Hall B"
                        placeholderTextColor={colors.textMuted}
                        value={location}
                        onChangeText={setLocation}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Topics to study..."
                        placeholderTextColor={colors.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBackground,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textDark,
    },
    backIconBtn: {
        padding: 8,
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
    },
    saveButtonFilled: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveTextFilled: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.cardBackground === '#F8F9FA' ? '#FFFFFF' : '#000000',
    },
    content: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        color: colors.textDark,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    datePickerCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    androidDateButton: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    androidDateText: {
        fontSize: 16,
        color: colors.textDark,
        marginLeft: 12,
    },
    pastDateWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF950015',
        padding: 12,
        borderRadius: 8,
        marginTop: -8,
        marginBottom: 24,
    },
    pastDateText: {
        color: '#D97706',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    }
});
