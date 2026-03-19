import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, StatusBar, Modal, Switch, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { useLectures } from '@/contexts/LectureContext';
import { useExams } from '@/contexts/ExamContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ColorTheme } from '@/types/theme';
import ConfirmationModal from '@/components/ConfirmationModal';
import Constants from 'expo-constants';
import { useCustomAlert } from '@/contexts/AlertContext';

const NOTIFICATION_OPTIONS = [5, 10, 15, 30, 45, 60];
const EXAM_NOTIFICATION_OPTIONS = [15, 30, 60, 120, 1440];

export default function SettingsScreen() {
    const { settings, updateSettings, colors } = useSettings();
    const { lectures, clearLectures, clearAssignments } = useLectures();
    const { clearExams } = useExams();
    const { showAlert } = useCustomAlert();
    
    const [manageDataModalVisible, setManageDataModalVisible] = useState(false);
    const [showSummaryPicker, setShowSummaryPicker] = useState(false);
    
    // New Pickers State
    const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
    const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);
    const [showSemesterStartPicker, setShowSemesterStartPicker] = useState(false);
    const [showSemesterEndPicker, setShowSemesterEndPicker] = useState(false);
    
    // Unified Picker Modal State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState<'lecture' | 'assignment' | 'exam' | null>(null);

    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleOffsetChange = (type: 'lecture' | 'assignment' | 'exam', minutes: number) => {
        if (type === 'lecture') updateSettings({ lectureOffset: minutes });
        if (type === 'assignment') updateSettings({ assignmentOffset: minutes });
        if (type === 'exam') updateSettings({ examOffset: minutes });
    };

    const handleSummaryTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowSummaryPicker(false);
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            updateSettings({ dailySummaryTime: `${hours}:${minutes}` });
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const handleOpenPicker = (type: 'lecture' | 'assignment' | 'exam') => {
        setPickerType(type);
        setPickerVisible(true);
    };

    const handleSelectOption = (minutes: number) => {
        if (pickerType) {
            handleOffsetChange(pickerType, minutes);
        }
        setPickerVisible(false);
        setPickerType(null);
    };

    const getSummaryDate = () => {
        const [hours, minutes] = (settings.dailySummaryTime || '07:00').split(':').map(Number);
        const d = new Date();
        d.setHours(hours || 7, minutes || 0, 0, 0);
        return d;
    };

    const getQuietDate = (timeStr: string) => {
        const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
        const d = new Date();
        d.setHours(hours || 0, minutes || 0, 0, 0);
        return d;
    };

    const getSemesterDate = (dateStr?: string) => {
        return dateStr ? new Date(dateStr) : new Date();
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Not set';
        return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleQuietStartChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowQuietStartPicker(false);
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            updateSettings({ quietHoursStart: `${hours}:${minutes}` });
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const handleQuietEndChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowQuietEndPicker(false);
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            updateSettings({ quietHoursEnd: `${hours}:${minutes}` });
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const handleSemesterStartChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowSemesterStartPicker(false);
        if (selectedDate) {
            updateSettings({ semesterStart: selectedDate.toISOString() });
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const handleSemesterEndChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowSemesterEndPicker(false);
        if (selectedDate) {
            updateSettings({ semesterEnd: selectedDate.toISOString() });
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const handleExportData = async () => {
        try {
            const keys = ['@settings', '@lectures', '@assignments', '@exams'];
            const [settingsData, lecturesData, assignmentsData, examsData] = await Promise.all(
                keys.map(k => AsyncStorage.getItem(k))
            );
            
            const exportPayload = {
                settings: settingsData ? JSON.parse(settingsData) : {},
                lectures: lecturesData ? JSON.parse(lecturesData) : [],
                assignments: assignmentsData ? JSON.parse(assignmentsData) : [],
                exams: examsData ? JSON.parse(examsData) : [],
                exportedAt: new Date().toISOString()
            };
            
            // ensure documentDirectory is a string
            const docDir = (FileSystem as any).documentDirectory || '';
            const fileUri = `${docDir}RemindMe_Export.json`;
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportPayload, null, 2));
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                showAlert("Error", "Sharing is not available on this device", [{text: 'OK'}]);
            }
        } catch (e) {
            console.error("Failed to export data", e);
            showAlert("Export Failed", "Could not export app data.", [{text: 'OK'}]);
        }
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(hours || 18, minutes || 0);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const SectionHeader = ({ title, icon }: { title: string; icon?: any }) => (
        <View style={styles.sectionHeader}>
            {icon && <Ionicons name={icon} size={18} color={colors.textMuted} />}
            <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
        </View>
    );

    const formatDuration = (minutes: number) => {
        if (minutes >= 1440) return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`;
        if (minutes >= 60) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
        return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>

                {/* PREFERENCES SECTION */}
                <SectionHeader title="Preferences" />
                <View style={[styles.groupedList, { paddingBottom: 16 }]}>
                    <View style={styles.columnRow}>
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.textDark }]}>
                                <Ionicons name="color-palette-outline" size={16} color={colors.background} />
                            </View>
                            <Text style={styles.rowLabel}>Theme</Text>
                        </View>
                        
                        <View style={styles.segmentedControl}>
                            {(['automatic', 'light', 'dark'] as const).map((mode) => {
                                const isActive = settings.themeMode === mode;
                                return (
                                    <TouchableOpacity
                                        key={mode}
                                        style={[
                                            styles.segmentButton,
                                            isActive && styles.segmentButtonActive
                                        ]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.selectionAsync();
                                            updateSettings({ themeMode: mode });
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.segmentText,
                                            isActive && styles.segmentTextActive
                                        ]}>
                                            {mode === 'automatic' ? 'System' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.rowContent}>
                                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="flash-off-outline" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.rowLabel}>Reduce Motion</Text>
                            </View>
                            <Text style={[styles.rowSubtext, { marginLeft: 40 }]}>Disables screen transition animations</Text>
                        </View>
                        <Switch
                            value={settings.reduceMotion}
                            onValueChange={(val) => updateSettings({ reduceMotion: val })}
                            trackColor={{ false: colors.textMuted + '40', true: colors.primary }}
                            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                        />
                    </View>
                </View>

                {/* ACADEMIC TERM SECTION */}
                <SectionHeader title="Academic Term" />
                <Text style={styles.sectionHint}>Notifications are only sent within your semester dates.</Text>
                <View style={styles.groupedList}>
                    <TouchableOpacity style={styles.row} onPress={() => setShowSemesterStartPicker(true)}>
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.rowLabel}>Semester Start</Text>
                        </View>
                        <Text style={styles.rowValue}>{formatDate(settings.semesterStart)}</Text>
                    </TouchableOpacity>
                    {showSemesterStartPicker && (
                        <View style={{ backgroundColor: colors.cardBackground, paddingBottom: 10 }}>
                            <DateTimePicker value={getSemesterDate(settings.semesterStart)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleSemesterStartChange} textColor={colors.textDark} style={{ alignSelf: 'center' }} />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity onPress={() => setShowSemesterStartPicker(false)} style={{ alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.textMuted + '20' }}>
                                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 17 }}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.row} onPress={() => setShowSemesterEndPicker(true)}>
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.rowLabel}>Semester End</Text>
                        </View>
                        <Text style={styles.rowValue}>{formatDate(settings.semesterEnd)}</Text>
                    </TouchableOpacity>
                    {showSemesterEndPicker && (
                        <View style={{ backgroundColor: colors.cardBackground, paddingBottom: 10 }}>
                            <DateTimePicker value={getSemesterDate(settings.semesterEnd)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleSemesterEndChange} textColor={colors.textDark} style={{ alignSelf: 'center' }} />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity onPress={() => setShowSemesterEndPicker(false)} style={{ alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.textMuted + '20' }}>
                                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 17 }}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* NOTIFICATIONS SECTION */}
                <SectionHeader title="Notifications" />
                <View style={styles.groupedList}>
                    
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => handleOpenPicker('lecture')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="book-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.rowLabel}>Lecture Reminder</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.rowValue}>{formatDuration(settings.lectureOffset)}</Text>
                            <Ionicons name="chevron-expand" size={16} color={colors.textMuted + '80'} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => handleOpenPicker('assignment')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.rowLabel}>Assignment Reminder</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.rowValue}>{formatDuration(settings.assignmentOffset)}</Text>
                            <Ionicons name="chevron-expand" size={16} color={colors.textMuted + '80'} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => handleOpenPicker('exam')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="school-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.rowLabel}>Exam Reminder</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.rowValue}>{formatDuration(settings.examOffset)}</Text>
                            <Ionicons name="chevron-expand" size={16} color={colors.textMuted + '80'} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.rowContent}>
                                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="moon-outline" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.rowLabel}>Quiet Hours</Text>
                            </View>
                            <Text style={[styles.rowSubtext, { marginLeft: 40 }]}>Block notifications during sleep</Text>
                        </View>
                        <Switch
                            value={settings.quietHoursEnabled}
                            onValueChange={(val) => updateSettings({ quietHoursEnabled: val })}
                            trackColor={{ false: colors.textMuted + '40', true: colors.primary }}
                            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                        />
                    </View>

                    {settings.quietHoursEnabled && (
                        <>
                            <View style={styles.separator} />
                            <TouchableOpacity style={styles.row} onPress={() => setShowQuietStartPicker(true)}>
                                <View style={styles.rowContent}>
                                    <Text style={[styles.rowLabel, { marginLeft: 36 }]}>Start Time</Text>
                                </View>
                                <Text style={styles.rowValue}>{formatTime(settings.quietHoursStart || '22:00')}</Text>
                            </TouchableOpacity>
                            {showQuietStartPicker && (
                                <View style={{ backgroundColor: colors.cardBackground, paddingBottom: 10 }}>
                                    <DateTimePicker value={getQuietDate(settings.quietHoursStart || '22:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleQuietStartChange} textColor={colors.textDark} style={{ alignSelf: 'center' }} />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity onPress={() => setShowQuietStartPicker(false)} style={{ alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.textMuted + '20' }}>
                                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 17 }}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <View style={styles.separator} />
                            <TouchableOpacity style={styles.row} onPress={() => setShowQuietEndPicker(true)}>
                                <View style={styles.rowContent}>
                                    <Text style={[styles.rowLabel, { marginLeft: 36 }]}>End Time</Text>
                                </View>
                                <Text style={styles.rowValue}>{formatTime(settings.quietHoursEnd || '07:00')}</Text>
                            </TouchableOpacity>
                            {showQuietEndPicker && (
                                <View style={{ backgroundColor: colors.cardBackground, paddingBottom: 10 }}>
                                    <DateTimePicker value={getQuietDate(settings.quietHoursEnd || '07:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleQuietEndChange} textColor={colors.textDark} style={{ alignSelf: 'center' }} />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity onPress={() => setShowQuietEndPicker(false)} style={{ alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.textMuted + '20' }}>
                                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 17 }}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    )}

                    <View style={styles.separator} />

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.rowContent}>
                                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="partly-sunny-outline" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.rowLabel}>Daily Summary</Text>
                            </View>
                            <Text style={[styles.rowSubtext, { marginLeft: 40 }]}>Get a daily overview of your schedule</Text>
                        </View>
                        <Switch
                            value={settings.dailySummaryEnabled}
                            onValueChange={(val) => updateSettings({ dailySummaryEnabled: val })}
                            trackColor={{ false: colors.textMuted + '40', true: colors.primary }}
                            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                        />
                    </View>
                    
                    {settings.dailySummaryEnabled && (
                        <>
                            <View style={styles.separator} />
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setShowSummaryPicker(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.rowContent}>
                                    <Text style={[styles.rowLabel, { marginLeft: 16 }]}>Summary Time</Text>
                                </View>
                                <Text style={styles.rowValue}>{formatTime(settings.dailySummaryTime || '07:00')}</Text>
                            </TouchableOpacity>
                            
                            {showSummaryPicker && (
                                <View style={{ backgroundColor: colors.cardBackground, paddingBottom: 10 }}>
                                    <DateTimePicker
                                        value={getSummaryDate()}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleSummaryTimeChange}
                                        textColor={colors.textDark}
                                        style={{ alignSelf: 'center' }}
                                    />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity onPress={() => setShowSummaryPicker(false)} style={{ alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.textMuted + '20' }}>
                                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 17 }}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* DATA SECTION */}
                <SectionHeader title="Danger Zone" icon="warning-outline" />
                <View style={styles.groupedList}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setManageDataModalVisible(true)}
                    >
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.error + '15' }]}>
                                <Ionicons name="trash-outline" size={16} color={colors.error} />
                            </View>
                            <Text style={[styles.rowLabel, { color: colors.error, fontWeight: '600' }]}>Manage App Data</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.error + '60'} />
                    </TouchableOpacity>
                </View>

                {/* SUPPORT SECTION */}
                <SectionHeader title="Support & About" />
                <View style={styles.groupedList}>
                    <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:support@remindme.app')}>
                        <View style={styles.rowContent}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="bug-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.rowLabel}>Feedback & Bug Report</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted + '80'} />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.versionText}>Lectures App v{Constants.expoConfig?.version || '1.0.0'}</Text>
                </View>

            </ScrollView >

            <Modal
                visible={pickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalDragIndicator} />
                        <Text style={styles.modalTitle}>
                            {pickerType === 'lecture' ? 'Lecture Reminder' : 
                             pickerType === 'assignment' ? 'Assignment Reminder' : 
                             'Exam Reminder'}
                        </Text>
                        <Text style={styles.modalMessage}>Choose when to be notified.</Text>
                        
                        {(pickerType === 'exam' ? EXAM_NOTIFICATION_OPTIONS : NOTIFICATION_OPTIONS).map((minutes, index, array) => {
                            const isSelected = 
                                (pickerType === 'lecture' && settings.lectureOffset === minutes) ||
                                (pickerType === 'assignment' && settings.assignmentOffset === minutes) ||
                                (pickerType === 'exam' && settings.examOffset === minutes);

                            return (
                                <TouchableOpacity 
                                    key={`${pickerType}-${minutes}`}
                                    style={[
                                        styles.modalActionRow, 
                                        { justifyContent: 'space-between' },
                                        index === array.length - 1 && { borderBottomWidth: 0 }
                                    ]}
                                    onPress={() => handleSelectOption(minutes)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Ionicons name="time-outline" size={22} color={colors.textMuted} />
                                        <Text style={[styles.modalActionText, { color: colors.textDark, fontSize: 16 }, isSelected && { fontWeight: '600', color: colors.primary }]}>
                                            {formatDuration(minutes)} {pickerType === 'exam' ? 'before' : 'before'}
                                        </Text>
                                    </View>
                                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                </TouchableOpacity>
                            );
                        })}
                        
                        <TouchableOpacity 
                            style={styles.modalCancelButton}
                            onPress={() => setPickerVisible(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={manageDataModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setManageDataModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setManageDataModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalDragIndicator} />
                        <Text style={styles.modalTitle}>Manage App Data</Text>
                        <Text style={styles.modalMessage}>Choose the data you want to delete. This will open a confirmation dialog.</Text>
                        
                        <TouchableOpacity 
                            style={styles.modalActionRow}
                            onPress={() => { setManageDataModalVisible(false); setTimeout(handleExportData, 300); }}
                        >
                            <Ionicons name="download-outline" size={22} color={colors.primary} />
                            <Text style={[styles.modalActionText, { color: colors.primary }]}>Export App Data (JSON)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.modalActionRow}
                            onPress={() => {
                                setManageDataModalVisible(false);
                                setTimeout(() => {
                                    showAlert("End Semester?", "Are you sure? This will remove all your classes and scheduled reminders to give you a clean slate. This cannot be undone.", [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "End Semester", style: "destructive", onPress: clearLectures }
                                    ]);
                                }, 300);
                            }}
                        >
                            <View style={[styles.iconBox, { backgroundColor: colors.error + '15' }]}>
                                <Ionicons name="book" size={20} color={colors.error} />
                            </View>
                            <Text style={[styles.modalActionText, { color: colors.error }]}>End Semester (Clear Classes)</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.modalActionRow}
                            onPress={() => {
                                setManageDataModalVisible(false);
                                setTimeout(() => {
                                    showAlert("Permanently Delete All Assignments?", "This will remove all your pending and completed tasks. Continue?", [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Delete Assignments", style: "destructive", onPress: async () => await clearAssignments?.() }
                                    ]);
                                }, 300);
                            }}
                        >
                            <View style={[styles.iconBox, { backgroundColor: colors.error + '15' }]}>
                                <Ionicons name="clipboard" size={20} color={colors.error} />
                            </View>
                            <Text style={[styles.modalActionText, { color: colors.error }]}>Permanently Delete All Assignments</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.modalActionRow, { borderBottomWidth: 0 }]}
                            onPress={() => {
                                setManageDataModalVisible(false);
                                setTimeout(() => {
                                    showAlert("Permanently Delete All Exams?", "This will remove all your exam schedules. Continue?", [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Delete Exams", style: "destructive", onPress: clearExams }
                                    ]);
                                }, 300);
                            }}
                        >
                            <View style={[styles.iconBox, { backgroundColor: colors.error + '15' }]}>
                                <Ionicons name="document-text" size={20} color={colors.error} />
                            </View>
                            <Text style={[styles.modalActionText, { color: colors.error }]}>Permanently Delete All Exams</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.modalCancelButton}
                            onPress={() => setManageDataModalVisible(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView >
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cardBackground === '#F8F9FA' ? '#F2F2F7' : '#000000',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: colors.textDark,
        letterSpacing: -0.5,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 16,
        paddingLeft: 12,
        gap: 6,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        letterSpacing: -0.2,
    },
    sectionHint: {
        fontSize: 13,
        color: colors.textMuted,
        paddingHorizontal: 16,
        marginBottom: 6,
        marginTop: -4,
    },
    groupedList: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 50,
        backgroundColor: colors.cardBackground,
    },
    columnRow: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.cardBackground,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '500', // Standard iOS font weight for lists
        color: colors.textDark,
    },
    rowSubLabel: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 4,
        marginBottom: 12,
    },
    rowValue: {
        fontSize: 16,
        color: colors.textMuted,
    },
    separator: {
        height: 1,
        backgroundColor: colors.textMuted + '20',
        marginLeft: 16,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.textMuted + '30',
    },
    optionButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textDark,
    },
    optionTextActive: {
        color: colors.background === '#000000' ? '#000' : '#FFF',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 4,
        marginTop: 16,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
    },
    segmentButtonActive: {
        backgroundColor: colors.cardBackground,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textMuted,
    },
    segmentTextActive: {
        color: colors.textDark,
        fontWeight: '600',
    },
    infoSection: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 40,
    },
    rowSubtext: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    versionText: {
        color: colors.textMuted,
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalDragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: colors.textMuted + '40',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textDark,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 15,
        color: colors.textMuted,
        marginBottom: 24,
        textAlign: 'center',
    },
    modalActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.textMuted + '30',
        gap: 16,
    },
    modalActionText: {
        fontSize: 17,
        color: colors.error,
        fontWeight: '500',
    },
    modalCancelButton: {
        marginTop: 24,
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 14,
    },
    modalCancelText: {
        fontSize: 17,
        color: colors.textDark,
        fontWeight: '600',
    }
});
