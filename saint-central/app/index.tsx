import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import SignInScreen from './SignInScreen';
import SignUpScreen from './SignUpScreen';
import { authHelpers } from '../supabaseConfig';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image: any;
  gradient: string[];
  accentColor: string;
  backgroundPattern: 'dove' | 'cross' | 'rays';
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Pray',
    subtitle: 'Together',
    image: require('../assets/images/1.png'),
    gradient: ['#F6F9F5', '#E5EDE3'],
    accentColor: '#6B8B8B',
    backgroundPattern: 'dove',
  },
  {
    id: '2',
    title: 'Saint',
    subtitle: 'Central',
    image: require('../assets/images/2.png'),
    gradient: ['#F5F7FA', '#E3E8F2'],
    accentColor: '#8B6B4A',
    backgroundPattern: 'rays',
  },
  {
    id: '3',
    title: 'Stay',
    subtitle: 'Anonymous',
    image: require('../assets/images/3.png'),
    gradient: ['#FAF8F5', '#F0EBE3'],
    accentColor: '#9B8B7A',
    backgroundPattern: 'cross',
  },
];

// Decorative SVG Components
const DovePattern: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={200} height={200} viewBox="0 0 200 200" style={styles.patternSvg}>
    <Defs>
      <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.15" />
        <Stop offset="100%" stopColor={color} stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="100" cy="100" r="80" fill="url(#glow)" />
    <Path
      d="M100 60 Q120 80 140 70 Q130 90 150 100 Q120 100 100 130 Q80 100 50 100 Q70 90 60 70 Q80 80 100 60"
      fill={color}
      opacity={0.08}
    />
  </Svg>
);

const CrossPattern: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={200} height={200} viewBox="0 0 200 200" style={styles.patternSvg}>
    <Defs>
      <RadialGradient id="crossGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.12" />
        <Stop offset="100%" stopColor={color} stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="100" cy="100" r="90" fill="url(#crossGlow)" />
    <Path
      d="M92 40 L108 40 L108 92 L160 92 L160 108 L108 108 L108 160 L92 160 L92 108 L40 108 L40 92 L92 92 Z"
      fill={color}
      opacity={0.06}
    />
  </Svg>
);

const RaysPattern: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={240} height={240} viewBox="0 0 240 240" style={styles.patternSvg}>
    <Defs>
      <RadialGradient id="raysGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.15" />
        <Stop offset="100%" stopColor={color} stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="120" cy="120" r="100" fill="url(#raysGlow)" />
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
      <Path
        key={angle}
        d={`M120 120 L${120 + Math.cos((angle * Math.PI) / 180) * 90} ${
          120 + Math.sin((angle * Math.PI) / 180) * 90
        }`}
        stroke={color}
        strokeWidth="2"
        opacity={0.06}
      />
    ))}
  </Svg>
);

const OnboardingScreenEnhanced: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'onboarding' | 'signin' | 'signup'>('onboarding');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnonymousLoading, setIsAnonymousLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto-slide every 2 seconds
  useEffect(() => {
    if (currentScreen !== 'onboarding') return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 2000);

    return () => clearInterval(interval);
  }, [currentIndex, currentScreen]);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const currentSlide = slides[currentIndex] || slides[0];

  const getBackgroundPattern = (pattern: string, color: string) => {
    switch (pattern) {
      case 'dove':
        return <DovePattern color={color} />;
      case 'cross':
        return <CrossPattern color={color} />;
      case 'rays':
        return <RaysPattern color={color} />;
      default:
        return null;
    }
  };

  // Calculate dynamic spacing based on screen height and safe areas
  const availableHeight = height - insets.top - insets.bottom;
  const isSmallScreen = availableHeight < 700;

  // Handle anonymous sign up
  const handleAnonymousSignUp = async () => {
    setIsAnonymousLoading(true);
    try {
      const { user, error } = await authHelpers.signUpAnonymous();
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to continue anonymously. Please try again.');
        return;
      }

      if (user) {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setIsAnonymousLoading(false);
    }
  };

  // Handle Sign In
  if (currentScreen === 'signin') {
    return (
      <SignInScreen
        onBack={() => setCurrentScreen('onboarding')}
        onSignIn={(email, password) => {
          // TODO: Add your sign in logic here
          console.log('Sign in:', email, password);
          router.replace('/(tabs)/home');
        }}
        onForgotPassword={() => {
          // TODO: Handle forgot password
          console.log('Forgot password');
        }}
      />
    );
  }

  // Handle Sign Up
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        onBack={() => setCurrentScreen('onboarding')}
        onSignUp={(email, password) => {
          // TODO: Add your sign up logic here
          console.log('Sign up:', email, password);
          router.replace('/(tabs)/home');
        }}
      />
    );
  }

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [40, 0, 40],
      extrapolate: 'clamp',
    });

    const rotateZ = scrollX.interpolate({
      inputRange,
      outputRange: ['-5deg', '0deg', '5deg'],
      extrapolate: 'clamp',
    });

    return (
      <LinearGradient colors={item.gradient as any} style={styles.slide}>
        {/* Background Pattern */}
        <View style={[styles.patternContainer, { top: insets.top + 40 }]}>
          {getBackgroundPattern(item.backgroundPattern, item.accentColor)}
        </View>

        <Animated.View
          style={[
            styles.slideContent,
            {
              transform: [{ scale }, { translateY }, { rotateZ }],
              opacity,
              paddingTop: insets.top + 20,
            },
          ]}
        >
          {/* Image Container */}
          <View style={[styles.imageContainer, isSmallScreen && styles.imageContainerSmall]}>
            <View style={styles.imageWrapper}>
              <Image
                source={item.image}
                style={[styles.slideImage, isSmallScreen && styles.slideImageSmall]}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Title */}
          <View style={[styles.titleContainer, { marginTop: isSmallScreen ? 24 : 32 }]}>
            <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>{item.title}</Text>
            <Text style={[styles.titleAccent, isSmallScreen && styles.titleAccentSmall, { color: item.accentColor }]}>
              {item.subtitle}
            </Text>
          </View>

          {/* Decorative Divider */}
          <View style={[styles.dividerContainer, { marginTop: isSmallScreen ? 20 : 28 }]}>
            <View style={[styles.dividerLine, { backgroundColor: item.accentColor + '20' }]} />
            <View style={[styles.dividerIcon, { backgroundColor: item.accentColor + '10' }]}>
              <Feather name="star" size={12} color={item.accentColor} />
            </View>
            <View style={[styles.dividerLine, { backgroundColor: item.accentColor + '20' }]} />
          </View>
        </Animated.View>
      </LinearGradient>
    );
  };

  const Paginator = () => {
    return (
      <View style={styles.paginatorContainer}>
        {slides.map((slide, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 32, 10],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.25, 1, 0.25],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={slide.id}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: currentSlide.accentColor,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Animated Background */}
      <LinearGradient
        colors={currentSlide.gradient as any}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: 0 }}
      />

      {/* Paginator */}
      <Paginator />

      {/* Bottom Actions */}
      <Animated.View
        style={[
          styles.bottomContainer,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            opacity: fadeAnim,
            transform: [{ translateY: Animated.multiply(slideUpAnim, -1) }],
          },
        ]}
      >
        {/* Primary Button */}
        <TouchableOpacity
          style={styles.primaryButtonWrapper}
          onPress={() => setCurrentScreen('signup')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[currentSlide.accentColor, currentSlide.accentColor + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <View style={styles.buttonIconContainer}>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary Buttons */}
        <View style={styles.secondaryContainer}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: currentSlide.accentColor + '25' }]}
            onPress={() => setCurrentScreen('signin')}
            activeOpacity={0.7}
          >
            <Feather name="log-in" size={18} color={currentSlide.accentColor} />
            <Text style={[styles.secondaryButtonText, { color: currentSlide.accentColor }]}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: currentSlide.accentColor + '25' }]}
            onPress={handleAnonymousSignUp}
            activeOpacity={0.7}
            disabled={isAnonymousLoading}
          >
            {isAnonymousLoading ? (
              <ActivityIndicator color={currentSlide.accentColor} size="small" />
            ) : (
              <>
                <Feather name="eye-off" size={18} color={currentSlide.accentColor} />
                <Text style={[styles.secondaryButtonText, { color: currentSlide.accentColor }]}>
                  Anonymous
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={[styles.termsLink, { color: currentSlide.accentColor }]}>
            Terms of Service
          </Text>
          {' & '}
          <Text style={[styles.termsLink, { color: currentSlide.accentColor }]}>
            Privacy Policy
          </Text>
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternSvg: {
    opacity: 0.8,
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    justifyContent: 'center',
    flex: 1,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageContainerSmall: {
    marginBottom: 4,
  },
  imageWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideImageSmall: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '200',
    color: '#2C2C2C',
    letterSpacing: -2,
  },
  titleSmall: {
    fontSize: 40,
  },
  titleAccent: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    marginTop: -10,
  },
  titleAccentSmall: {
    fontSize: 40,
    marginTop: -8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  },
  dividerLine: {
    width: 50,
    height: 1,
  },
  dividerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    gap: 14,
  },
  primaryButtonWrapper: {
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    gap: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888888',
    marginTop: 6,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '600',
  },
});

export default OnboardingScreenEnhanced;