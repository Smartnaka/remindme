import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, ScrollView, Platform, StatusBarStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/contexts/SettingsContext';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Responsive utility
const wp = (percentage: number) => {
    return (percentage * width) / 100;
};

const hp = (percentage: number) => {
    return (percentage * height) / 100;
};

const SLIDES = [
    {
        id: '1',
        titleTop: 'Master Your',
        titleHighlight: 'Class Schedule',
        description: 'Never miss a lecture or assignment\nagain with smart reminders.',
        icon: 'school' as const,
    },
    {
        id: '2',
        titleTop: 'Be On Time for Every\nClass',
        titleHighlight: '',
        description: 'Organize your semester and set custom\nalerts for your lectures.',
        icon: 'book' as const,
    },
    {
        id: '3',
        titleTop: 'All Your Deadlines\nIn',
        titleHighlight: 'One Place',
        description: 'Track assignments seamlessly and\nwatch your academic progress grow.',
        icon: 'document-text' as const,
    }
];

interface OnboardingProps {
    onComplete: () => void;
}

export default function OnboardingCarousel({ onComplete }: OnboardingProps) {
    const { colors, theme } = useSettings();
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const isDark = theme === 'dark';

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const handleMomentumScrollEnd = (e: any) => {
        const x = e.nativeEvent.contentOffset.x;
        setCurrentIndex(Math.round(x / width));
    };

    const goNext = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (currentIndex < SLIDES.length - 1) {
            scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
        } else {
            onComplete();
        }
    };

    const goSkip = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onComplete();
    };

    const renderHero = (slideId: string) => {
        const glowColor = colors.primary + (isDark ? '40' : '20');
        
        if (slideId === '1') {
            return (
                <View style={styles.heroWrapper}>
                    <View style={[styles.heroBox, { borderColor: colors.primary + '20', backgroundColor: colors.primary + '03' }]}>
                        <LinearGradient
                            colors={[colors.primary + '15', 'transparent']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <View style={styles.heroCenter}>
                            <Ionicons 
                                name="school" 
                                size={wp(25)} 
                                color={colors.primary} 
                                style={{
                                    textShadowColor: glowColor,
                                    textShadowOffset: { width: 0, height: 0 },
                                    textShadowRadius: 30,
                                }} 
                            />
                            <View style={[styles.floatingBadge, { top: -hp(2), left: -wp(10) }]}>
                                <Ionicons name="book" size={wp(10)} color={colors.primary} style={{ opacity: 0.6 }} />
                            </View>
                            <View style={[styles.floatingBadge, { bottom: -hp(1), right: -wp(5), backgroundColor: colors.background, borderWidth: 1, borderColor: colors.primary + '30', borderRadius: 12, padding: 4 }]}>
                                <View style={[styles.clockInner, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="time" size={wp(6)} color={isDark ? '#000' : '#FFF'} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            );
        }

        if (slideId === '2') {
            return (
                <View style={styles.heroWrapper}>
                    <View style={[styles.heroBox, { borderColor: colors.primary + '15', backgroundColor: 'transparent' }]}>
                        <View style={styles.heroCenter}>
                            <View style={[styles.circleOutline, { borderColor: colors.primary + '30', backgroundColor: colors.primary + '05' }]}>
                                <Ionicons name="book" size={wp(14)} color={colors.primary} />
                            </View>
                            <View style={[styles.floatingCard, { borderColor: colors.primary + '30', backgroundColor: colors.cardBackground }]}>
                                <View style={[styles.cardIconBox, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="school" size={wp(5)} color={isDark ? '#000' : '#FFF'} />
                                </View>
                                <View style={styles.cardTextCol}>
                                    <Text style={[styles.cardTitle, { color: colors.textDark }]}>Intro to Economics</Text>
                                    <Text style={[styles.cardSub, { color: colors.primary }]}>Starts in 10 mins • Hall A</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.heroWrapper}>
                <View style={[styles.heroBox, { borderColor: colors.primary + '20', backgroundColor: colors.primary + '03' }]}>
                    <LinearGradient
                        colors={[colors.primary + '10', 'transparent']}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.heroCenter}>
                        <View style={[styles.floatingCard, { borderColor: colors.primary + '30', backgroundColor: colors.cardBackground, width: wp(65), marginBottom: hp(2) }]}>
                            <View style={[styles.cardIconBox, { backgroundColor: colors.primary }]}>
                                <Ionicons name="document-text" size={wp(5)} color={isDark ? '#000' : '#FFF'} />
                            </View>
                            <View style={styles.cardTextCol}>
                                <Text style={[styles.cardTitle, { color: colors.textDark }]}>CS101 Project</Text>
                                <View style={[styles.progressBarBg, { backgroundColor: colors.textMuted + '20' }]}>
                                    <View style={[styles.progressBarFill, { width: '70%', backgroundColor: colors.primary }]} />
                                </View>
                            </View>
                        </View>
                        <View style={[styles.floatingCard, { borderColor: colors.textMuted + '20', backgroundColor: colors.cardBackground, width: wp(65), opacity: 0.6 }]}>
                            <View style={[styles.cardIconBox, { backgroundColor: colors.textMuted }]}>
                                <Ionicons name="pencil" size={wp(5)} color={isDark ? '#000' : '#FFF'} />
                            </View>
                            <View style={styles.cardTextCol}>
                                <Text style={[styles.cardTitle, { color: colors.textDark }]}>Math Quiz</Text>
                                <View style={[styles.progressBarBg, { backgroundColor: colors.textMuted + '20' }]}>
                                    <View style={[styles.progressBarFill, { width: '100%', backgroundColor: colors.textMuted }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.logoRow}>
                        <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                            <Ionicons name="school" size={16} color={isDark ? '#000' : '#FFF'} />
                        </View>
                        <Text style={[styles.logoText, { color: colors.textDark }]}>RemindMe</Text>
                    </View>
                    <TouchableOpacity onPress={goSkip} style={styles.skipBtn}>
                        <Text style={[styles.skipText, { color: colors.primary }]}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* Slides */}
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
                    {SLIDES.map((slide) => (
                        <View key={slide.id} style={styles.slide}>
                            {renderHero(slide.id)}
                            
                            <View style={styles.textContainer}>
                                <Text style={[styles.titleText, { color: colors.textDark }]}>
                                    {slide.titleTop}
                                    {slide.titleHighlight ? (
                                        <Text style={{ color: colors.primary }}>{'\n'}{slide.titleHighlight}</Text>
                                    ) : null}
                                </Text>
                                <Text style={[styles.descriptionText, { color: colors.textMuted }]}>
                                    {slide.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </Animated.ScrollView>

                {/* Footer and Navigation */}
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
                        style={[styles.nextButton, { backgroundColor: colors.primary }]} 
                        onPress={goNext}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.nextButtonText, { color: isDark ? '#000' : '#FFF' }]}>
                            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
                        </Text>
                        <Ionicons 
                            name="arrow-forward" 
                            size={20} 
                            color={isDark ? '#000' : '#FFF'} 
                            style={{ marginLeft: 8 }} 
                        />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(6),
        paddingTop: hp(2),
        paddingBottom: hp(2),
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    logoText: {
        fontSize: wp(4.5),
        fontFamily: 'Inter_700Bold',
    },
    skipBtn: {
        padding: 8,
    },
    skipText: {
        fontSize: wp(4),
        fontFamily: 'Inter_600SemiBold',
    },
    slide: {
        width,
        alignItems: 'center',
        paddingHorizontal: wp(6),
        paddingTop: hp(4),
    },
    heroWrapper: {
        width: '100%',
        aspectRatio: 1,
        marginBottom: hp(4),
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroBox: {
        width: wp(80),
        height: wp(80),
        borderRadius: wp(10),
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    heroCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    floatingBadge: {
        position: 'absolute',
        zIndex: 2,
    },
    clockInner: {
        width: wp(10),
        height: wp(10),
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleOutline: {
        width: wp(30),
        height: wp(30),
        borderRadius: wp(15),
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: -hp(2),
        zIndex: 0,
    },
    floatingCard: {
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        width: wp(70),
        zIndex: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 15,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    cardIconBox: {
        width: wp(10),
        height: wp(10),
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardTextCol: {
        flex: 1,
        justifyContent: 'center',
    },
    cardTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: wp(3.8),
        marginBottom: 2,
    },
    cardSub: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: wp(3),
    },
    progressBarBg: {
        height: 5,
        width: '100%',
        borderRadius: 2.5,
        marginTop: 6,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2.5,
    },
    textContainer: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: wp(4),
    },
    titleText: {
        fontSize: wp(8.5),
        fontFamily: 'Inter_700Bold',
        textAlign: 'center',
        letterSpacing: -1,
        lineHeight: wp(10),
    },
    descriptionText: {
        fontSize: wp(4),
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        lineHeight: wp(6),
        marginTop: hp(2),
        paddingHorizontal: wp(5),
    },
    footer: {
        paddingHorizontal: wp(6),
        paddingBottom: hp(4),
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: hp(3),
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    nextButton: {
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    nextButtonText: {
        fontSize: wp(4.5),
        fontFamily: 'Inter_700Bold',
    }
});
