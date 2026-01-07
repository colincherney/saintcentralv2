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
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Cross Pattern Component
const CrossPattern: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={280} height={280} viewBox="0 0 200 200" style={styles.patternSvg}>
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

interface SignInScreenProps {
  onBack: () => void;
  onSignIn: (email: string, password: string) => void;
  onForgotPassword: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({
  onBack,
  onSignIn,
  onForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const accentColor = '#9B8B7A';
  const gradient: [string, string] = ['#FAF8F5', '#F0EBE3'];

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

  const handleSignIn = () => {
    Keyboard.dismiss();
    if (email && password) {
      onSignIn(email, password);
    }
  };

  const isFormValid = email.length > 0 && password.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFillObject} />

      {/* Background Pattern - Fixed position */}
      <View style={[styles.patternContainer, { top: insets.top + 60 }]} pointerEvents="none">
        <CrossPattern color={accentColor} />
      </View>

      {/* Header - Fixed at top */}
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
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color={accentColor} />
        </TouchableOpacity>
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
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.titleLight}>Welcome</Text>
            <Text style={[styles.titleBold, { color: accentColor }]}>Back</Text>
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: accentColor + '20' }]} />
              <View style={[styles.dividerIcon, { backgroundColor: accentColor + '10' }]}>
                <Feather name="heart" size={12} color={accentColor} />
              </View>
              <View style={[styles.dividerLine, { backgroundColor: accentColor + '20' }]} />
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: focusedField === 'email' ? accentColor : accentColor + '30',
                    backgroundColor: focusedField === 'email' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                  },
                ]}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={focusedField === 'email' ? accentColor : accentColor + '80'}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={accentColor + '60'}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: focusedField === 'password' ? accentColor : accentColor + '30',
                    backgroundColor: focusedField === 'password' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={20}
                  color={focusedField === 'password' ? accentColor : accentColor + '80'}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={accentColor + '60'}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color={accentColor + '80'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={onForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotText, { color: accentColor }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>
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
            !isFormValid && styles.buttonDisabled,
          ]}
          onPress={handleSignIn}
          activeOpacity={0.85}
          disabled={!isFormValid}
        >
          <LinearGradient
            colors={
              isFormValid
                ? [accentColor, accentColor + 'DD']
                : [accentColor + '50', accentColor + '40']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
            <View style={styles.buttonIconContainer}>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
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
    borderColor: 'rgba(155, 139, 122, 0.15)',
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
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

export default SignInScreen;