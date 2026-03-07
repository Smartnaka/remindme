import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, ScrollView, Modal, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { ColorTheme } from '@/types/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Master Your Schedule',
        description: 'Add your university lectures easily and track your entire week at a glance.',
        icon: 'calendar-outline' as const,
    },
    {
        id: '2',
        title: 'Never Miss a Deadline',
        description: 'Keep track of assignments and upcoming exams, all linked directly to your courses.',
        icon: 'checkmark-circle-outline' as const,
    },
    {
        id: '3',
        title: 'Smart Reminders',
        description: 'Get notified before your classes start so you always arrive on time without stressing.',
        icon: 'notifications-outline' as const,
    }
];

interface OnboardingProps {
    visible: boolean;
    onComplete: () => void;
}

export default function OnboardingCarousel({ visible, onComplete }: OnboardingProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!visible) return null;

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const handleMomentumScrollEnd = (e: any) => {
        const x = e.nativeEvent.contentOffset.x;
        setCurrentIndex(Math.round(x / width));
    };

    const goNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
        } else {
            onComplete();
        }
    };

    const goSkip = () => {
        onComplete();
    };

    return (
        <Modal animationType="slide" transparent={false} visible={visible}>
            <SafeAreaView style={styles.container}>
                <TouchableOpacity style={styles.skipButton} onPress={goSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                <Animated.ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onScroll={handleScroll}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    scrollEventThrottle={16}
                    style={{ flex: 1 }}
                >
                    {SLIDES.map((slide, index) => (
                        <View key={slide.id} style={styles.slide}>
                            <View style={styles.iconContainer}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name={slide.icon} size={80} color={colors.primary} />
                                </View>
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{slide.title}</Text>
                                <Text style={styles.description}>{slide.description}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.ScrollView>

                <View style={styles.footer}>
                    <View style={styles.pagination}>
                        {SLIDES.map((_, index) => {
                            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [8, 24, 8],
                                extrapolate: 'clamp',
                            });
                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });
                            return (
                                <Animated.View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        { width: dotWidth, opacity, backgroundColor: colors.primary }
                                    ]}
                                />
                            );
                        })}
                    </View>

                    <TouchableOpacity 
                        style={styles.nextButton} 
                        onPress={goNext}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    slide: {
        width,
        alignItems: 'center',
        padding: 40,
        paddingTop: height * 0.15,
    },
    iconContainer: {
        marginBottom: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        color: colors.textDark,
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    skipButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: colors.textMuted,
    },
    footer: {
        paddingHorizontal: 40,
        paddingBottom: Platform.OS === 'ios' ? 40 : 32,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    nextButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    }
});
