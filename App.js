import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutUp, withSpring, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';

// Constants
const INTERVAL_TIME = 3 * 60; // 3 minutes in seconds
const APP_VERSION = '1.1.0';
const BUILD_DATE = '2025-11-20';

const THEME = {
  slow: {
    colors: ['#2E3192', '#1BFFFF'], // Deep Blue to Cyan
    label: 'Walk Slow',
    subLabel: 'Recover & Breathe',
    icon: '🚶',
    textColor: '#ffffff'
  },
  fast: {
    colors: ['#FF512F', '#DD2476'], // Orange to Pink
    label: 'Walk Fast',
    subLabel: 'Push the Pace',
    icon: '🏃',
    textColor: '#ffffff'
  }
};

const { width } = Dimensions.get('window');

export default function App() {
  const [intervalType, setIntervalType] = useState('slow'); // 'slow' | 'fast'
  const [timeLeft, setTimeLeft] = useState(INTERVAL_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sound, setSound] = useState();
  const endTimeRef = useRef(null);

  useEffect(() => {
    // Configure Audio for iOS/Web to play even in silent mode/background
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(err => console.warn('Audio setup failed', err));
  }, []);

  async function playSound(type = 'start') {
    try {
      console.log('Playing sound...', type);
      const { sound } = await Audio.Sound.createAsync(require('./assets/beep.mp3'));
      setSound(sound);

      if (type === 'end') {
        // Lower pitch/rate for end of interval (deeper sound)
        await sound.setRateAsync(0.6, true);
      } else {
        // Normal pitch for start
        await sound.setRateAsync(1.0, true);
      }

      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play sound', error);
    }
  }

  useEffect(() => {
    return sound
      ? () => {
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  // Timer Logic
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        if (endTimeRef.current) {
          const now = Date.now();
          const remaining = Math.ceil((endTimeRef.current - now) / 1000);
          setTimeLeft(remaining > 0 ? remaining : 0);
        }
      }, 200);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerComplete = async () => {
    if (isTransitioning) {
      // Transition finished, start next interval
      setIsTransitioning(false);
      switchInterval();
      await playSound('start'); // Sound at start of new interval
      if (isActive) {
        endTimeRef.current = Date.now() + INTERVAL_TIME * 1000;
      }
    } else {
      // Interval finished, start transition
      await playSound('end'); // Sound at end of interval
      setIsTransitioning(true);
      setTimeLeft(5); // 5 second pause
      if (isActive) {
        endTimeRef.current = Date.now() + 5 * 1000;
      }
    }
  };

  const switchInterval = useCallback(() => {
    const nextType = intervalType === 'slow' ? 'fast' : 'slow';
    setIntervalType(nextType);
    setTimeLeft(INTERVAL_TIME);
    // setIsActive(true); // Keep active state
  }, [intervalType]);

  const toggleTimer = async () => {
    if (!isActive) {
      // User is starting the timer. Play sound to acknowledge AND unlock audio context for browsers.
      await playSound('start');
      endTimeRef.current = Date.now() + timeLeft * 1000;
    } else {
      endTimeRef.current = null;
    }
    setIsActive(!isActive);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentTheme = isTransitioning
    ? { colors: ['#434343', '#000000'], label: 'Get Ready', subLabel: 'Switching...', icon: '⏳', textColor: '#fff' }
    : THEME[intervalType];

  // Animation for button press
  const Button = ({ onPress, title, primary }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.button,
        primary ? styles.primaryButton : styles.secondaryButton
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.primaryButtonText]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Gradient */}
      <LinearGradient
        colors={currentTheme.colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Main Content */}
      <View style={styles.contentContainer}>

        {/* Header / Status */}
        <Animated.View
          key={intervalType}
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutUp.duration(200)}
          style={styles.headerContainer}
        >
          <Text style={styles.icon}>{currentTheme.icon}</Text>
          <Text style={styles.label}>{currentTheme.label}</Text>
          <Text style={styles.subLabel}>{currentTheme.subLabel}</Text>
        </Animated.View>

        {/* Timer Display */}
        <BlurView intensity={20} tint="dark" style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </BlurView>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <Button
            title={isActive ? "Pause" : "Start"}
            onPress={toggleTimer}
            primary={!isActive}
          />
          <View style={{ height: 16 }} />
          <Button
            title="Next Interval"
            onPress={switchInterval}
            primary={false}
          />
        </View>

      </View>
      <Text style={styles.versionText}>v{APP_VERSION} • {BUILD_DATE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    maxWidth: 500, // Limit width on web
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 10,
  },
  label: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  subLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    fontWeight: '500',
    letterSpacing: 1,
  },
  timerContainer: {
    paddingVertical: 40,
    paddingHorizontal: 60,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.1)', // Fallback
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 80,
    fontWeight: '900',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  secondaryButton: {
    // transparent/glass style
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  primaryButtonText: {
    color: '#333',
  },
  versionText: {
    position: 'absolute',
    bottom: 20,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '500',
  },
});
