import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#00C896', '#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#FF9F43', '#54A0FF'];
const NUM_PIECES = 40;
const DURATION = 2200;

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  isCircle: boolean;
}

interface ConfettiCelebrationProps {
  /** Whether to show the confetti */
  visible: boolean;
  /** Called when the animation finishes */
  onComplete?: () => void;
}

export default function ConfettiCelebration({ visible, onComplete }: ConfettiCelebrationProps) {
  const pieces = useRef<ConfettiPiece[]>([]);

  // Initialize pieces once
  if (pieces.current.length === 0) {
    for (let i = 0; i < NUM_PIECES; i++) {
      pieces.current.push({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        rotation: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 8,
        isCircle: Math.random() > 0.5,
      });
    }
  }

  useEffect(() => {
    if (!visible) return;

    const animations = pieces.current.map((piece) => {
      // Reset values
      piece.x.setValue(SCREEN_WIDTH / 2);
      piece.y.setValue(SCREEN_HEIGHT * 0.4);
      piece.rotation.setValue(0);
      piece.opacity.setValue(1);
      piece.scale.setValue(0);

      // Random spread
      const targetX = (Math.random() - 0.5) * SCREEN_WIDTH * 1.2;
      const targetY = -(Math.random() * SCREEN_HEIGHT * 0.6) - 50; // Shoot upward
      const fallY = SCREEN_HEIGHT * 0.8; // Then fall

      return Animated.sequence([
        // Burst out
        Animated.parallel([
          Animated.timing(piece.scale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(piece.x, {
            toValue: SCREEN_WIDTH / 2 + targetX,
            duration: DURATION * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(piece.y, {
            toValue: SCREEN_HEIGHT * 0.4 + targetY,
            duration: DURATION * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotation, {
            toValue: Math.random() * 720 - 360,
            duration: DURATION,
            useNativeDriver: true,
          }),
        ]),
        // Fall down + fade
        Animated.parallel([
          Animated.timing(piece.y, {
            toValue: fallY,
            duration: DURATION * 0.6,
            useNativeDriver: true,
          }),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: DURATION * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.current.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            styles.piece,
            {
              width: piece.size,
              height: piece.isCircle ? piece.size : piece.size * 0.5,
              backgroundColor: piece.color,
              borderRadius: piece.isCircle ? piece.size / 2 : 2,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ['-360deg', '360deg'],
                  }),
                },
                { scale: piece.scale },
              ],
              opacity: piece.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
});
