import React, { useRef } from 'react';
import { Animated, View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import * as Haptics from 'expo-haptics';

interface SwipeableLectureRowProps {
    children: React.ReactNode;
    onDelete: () => void;
}

export default function SwipeableLectureRow({ children, onDelete }: SwipeableLectureRowProps) {
    const { colors } = useSettings();
    const swipeableRef = useRef<Swipeable>(null);

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const trans = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [0, 100], // Moves in sync
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.rightActionContainer}>
                <Animated.View
                    style={[
                        styles.rightAction,
                        {
                            transform: [{ translateX: trans }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                            if (Platform.OS !== 'web') {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            }
                            swipeableRef.current?.close();

                            // Slight delay to allow animation to close before alert
                            setTimeout(() => {
                                Alert.alert(
                                    "Delete Lecture",
                                    "Are you sure you want to delete this lecture?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Delete",
                                            style: "destructive",
                                            onPress: onDelete
                                        }
                                    ]
                                );
                            }, 100);
                        }}
                    >
                        <Ionicons name="trash-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            rightThreshold={40}
            overshootRight={false}
        >
            {children}
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    rightActionContainer: {
        width: 80,
        marginBottom: 16, // Matches CourseItem margin
        marginLeft: 8,
    },
    rightAction: {
        flex: 1,
        backgroundColor: '#FF3B30', // System Red
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20, // Matches CourseItem radius
    },
    deleteButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
