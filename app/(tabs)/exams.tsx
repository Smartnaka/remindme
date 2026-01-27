import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { useExams } from '@/contexts/ExamContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ExamCard from '@/components/ExamCard';
import { ColorTheme } from '@/types/theme';

export default function ExamsScreen() {
  const { colors } = useSettings();
  const { exams } = useExams();
  const router = useRouter();
  
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={colors.cardBackground === '#F8F9FA' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={styles.headerContainer} edges={['top', 'left', 'right']}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Exams</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {exams.length === 0 ? (
            <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="trophy-outline" size={64} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No Exams Scheduled!</Text>
                <Text style={styles.emptySubtitle}>Time to relax or get ahead on studying.</Text>
            </View>
        ) : (
            exams.map(exam => (
                <ExamCard key={exam.id} exam={exam} />
            ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-exam')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
    paddingTop: 10,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800', // Heavy bold for consistency
    color: colors.textDark,
    letterSpacing: -0.5,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    opacity: 0.7,
  },
  emptyIconContainer: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
