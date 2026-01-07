import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Animated,
  StatusBar,
  ScrollView,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Dove Pattern Component
const DovePattern: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={280} height={280} viewBox="0 0 200 200" style={styles.patternSvg}>
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

// Rays Pattern Component
const RaysPattern: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={280} height={280} viewBox="0 0 240 240" style={styles.patternSvg}>
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

interface SignUpStep {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  accentColor: string;
  gradient: [string, string];
  pattern: 'dove' | 'rays';
}

const steps: SignUpStep[] = [
  {
    id: '1',
    title: 'Your',
    subtitle: 'Email',
    icon: 'mail',
    accentColor: '#6B8B6B',
    gradient: ['#F6F9F5', '#E5EDE3'],
    pattern: 'dove',
  },
  {
    id: '2',
    title: 'Create',
    subtitle: 'Password',
    icon: 'lock',
    accentColor: '#6B7B8B',
    gradient: ['#F5F7FA', '#E3E8EE'],
    pattern: 'rays',
  },
];

interface SignUpScreenProps {
  onBack: () => void;
  onSignUp: (email: string, password: string) => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ onBack, onSignUp }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Simple fade animation for initial load
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  // Content transition animation
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentSlide = useRef(new Animated.Value(0)).current;
  
  // Progress animation
  const progressAnim = useRef(new Animated.Value(0.5)).current;
  
  // Background color animation
  const bgAnim = useRef(new Animated.Value(0)).current;

  const step = steps[currentStep];

  // Initial animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Update progress and background when step changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / steps.length,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(bgAnim, {
        toValue: currentStep,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [currentStep]);

  const animateToNextStep = (callback: () => void) => {
    Keyboard.dismiss();
    
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlide, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      contentSlide.setValue(30);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const animateToPrevStep = (callback: () => void) => {
    Keyboard.dismiss();
    
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlide, {
        toValue: 30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      contentSlide.setValue(-30);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateToNextStep(() => setCurrentStep(currentStep + 1));
    } else {
      Keyboard.dismiss();
      if (password === confirmPassword && password.length >= 8) {
        onSignUp(email, password);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateToPrevStep(() => setCurrentStep(currentStep - 1));
    } else {
      onBack();
    }
  };

  const isStepValid = () => {
    if (currentStep === 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
    if (currentStep === 1) {
      return password.length >= 8 && password === confirmPassword;
    }
    return false;
  };

  const getPattern = () => {
    if (step.pattern === 'dove') {
      return <DovePattern color={step.accentColor} />;
    }
    return <RaysPattern color={step.accentColor} />;
  };

  // Interpolate background colors
  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [steps[0].gradient[0], steps[1].gradient[0]],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={step.gradient} style={StyleSheet.absoluteFillObject} />

      {/* Background Pattern - Fixed */}
      <View style={[styles.patternContainer, { top: insets.top + 80 }]} pointerEvents="none">
        {getPattern()}
      </View>

      {/* Header - Fixed */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { borderColor: step.accentColor + '20' }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color={step.accentColor} />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBackground, { backgroundColor: step.accentColor + '15' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth, backgroundColor: step.accentColor },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: step.accentColor }]}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>
      </Animated.View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Title Section - Animated on step change */}
          <Animated.View
            style={[
              styles.titleSection,
              {
                opacity: contentOpacity,
                transform: [{ translateX: contentSlide }],
              },
            ]}
          >
            <Text style={styles.titleLight}>{step.title}</Text>
            <Text style={[styles.titleBold, { color: step.accentColor }]}>{step.subtitle}</Text>
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: step.accentColor + '20' }]} />
              <View style={[styles.dividerIcon, { backgroundColor: step.accentColor + '10' }]}>
                <Feather name={step.icon} size={12} color={step.accentColor} />
              </View>
              <View style={[styles.dividerLine, { backgroundColor: step.accentColor + '20' }]} />
            </View>
          </Animated.View>

          {/* Form Section - Animated on step change */}
          <Animated.View
            style={[
              styles.formSection,
              {
                opacity: contentOpacity,
                transform: [{ translateX: contentSlide }],
              },
            ]}
          >
            {currentStep === 0 && (
              <>
                <View style={styles.inputContainer}>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: focusedField === 'email' ? step.accentColor : step.accentColor + '30',
                        backgroundColor: focusedField === 'email' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                      },
                    ]}
                  >
                    <Feather
                      name="mail"
                      size={20}
                      color={focusedField === 'email' ? step.accentColor : step.accentColor + '80'}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email address"
                      placeholderTextColor={step.accentColor + '60'}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={handleNext}
                    />
                    {email.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setEmail('')} 
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather name="x-circle" size={20} color={step.accentColor + '60'} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={[styles.helperText, { color: step.accentColor + '80' }]}>
                  We'll send you a confirmation email
                </Text>
              </>
            )}

            {currentStep === 1 && (
              <>
                <View style={styles.inputContainer}>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: focusedField === 'password' ? step.accentColor : step.accentColor + '30',
                        backgroundColor: focusedField === 'password' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                      },
                    ]}
                  >
                    <Feather
                      name="lock"
                      size={20}
                      color={focusedField === 'password' ? step.accentColor : step.accentColor + '80'}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={step.accentColor + '60'}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather
                        name={showPassword ? 'eye' : 'eye-off'}
                        size={20}
                        color={step.accentColor + '80'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        borderColor: focusedField === 'confirmPassword' ? step.accentColor : step.accentColor + '30',
                        backgroundColor: focusedField === 'confirmPassword' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                      },
                    ]}
                  >
                    <Feather
                      name="shield"
                      size={20}
                      color={focusedField === 'confirmPassword' ? step.accentColor : step.accentColor + '80'}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor={step.accentColor + '60'}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleNext}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather
                        name={showConfirmPassword ? 'eye' : 'eye-off'}
                        size={20}
                        color={step.accentColor + '80'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Requirements */}
                <View style={styles.requirementsContainer}>
                  <View style={styles.requirementRow}>
                    <Feather
                      name={password.length >= 8 ? 'check-circle' : 'circle'}
                      size={16}
                      color={password.length >= 8 ? step.accentColor : step.accentColor + '40'}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        { color: password.length >= 8 ? step.accentColor : step.accentColor + '60' },
                      ]}
                    >
                      At least 8 characters
                    </Text>
                  </View>
                  <View style={styles.requirementRow}>
                    <Feather
                      name={password === confirmPassword && password.length > 0 ? 'check-circle' : 'circle'}
                      size={16}
                      color={password === confirmPassword && password.length > 0 ? step.accentColor : step.accentColor + '40'}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        { color: password === confirmPassword && password.length > 0 ? step.accentColor : step.accentColor + '60' },
                      ]}
                    >
                      Passwords match
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.primaryButtonWrapper,
            !isStepValid() && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          activeOpacity={0.85}
          disabled={!isStepValid()}
        >
          <LinearGradient
            colors={
              isStepValid()
                ? [step.accentColor, step.accentColor + 'DD']
                : [step.accentColor + '50', step.accentColor + '40']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {currentStep === steps.length - 1 ? 'Create Account' : 'Continue'}
            </Text>
            <View style={styles.buttonIconContainer}>
              <Feather
                name={currentStep === steps.length - 1 ? 'check' : 'arrow-right'}
                size={20}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F9F5',
  },
  patternContainer: {
    position: 'absolute',
    right: -60,
    zIndex: 0,
  },
  patternSvg: {
    opacity: 0.8,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressContainer: {
    flex: 1,
    gap: 6,
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  titleLight: {
    fontSize: 44,
    fontWeight: '200',
    color: '#2C2C2C',
    letterSpacing: -1.5,
  },
  titleBold: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: -6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
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
  formSection: {
    gap: 16,
  },
  inputContainer: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2C',
    paddingVertical: 0,
  },
  helperText: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
  requirementsContainer: {
    marginTop: 8,
    gap: 10,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  primaryButtonWrapper: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    shadowOpacity: 0.08,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SignUpScreen;