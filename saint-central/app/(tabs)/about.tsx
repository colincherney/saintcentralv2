// app/(tabs)/about.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const SUPPORT_EMAIL = 'saintcentral59@gmail.com';
const APP_VERSION = '1.0.0';

// Decorative background orb
const BackgroundOrb = ({ color, size, top, left, opacity = 0.3 }: any) => (
  <View style={[styles.orb, { top, left, width: size, height: size }]}>
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id={`grad-${top}-${left}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#grad-${top}-${left})`} />
    </Svg>
  </View>
);

type ValueItemProps = {
  icon: string;
  title: string;
  description: string;
  delay?: number;
};

const ValueItem = ({ icon, title, description, delay = 0 }: ValueItemProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.valueItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.valueIconContainer}>
        <Feather name={icon as any} size={20} color="#C4A574" />
      </View>
      <View style={styles.valueContent}>
        <Text style={styles.valueTitle}>{title}</Text>
        <Text style={styles.valueDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

const VALUES = [
  {
    icon: 'eye-off',
    title: 'Anonymity First',
    description: 'Share your heart without revealing your identity. Every prayer is anonymous.',
  },
  {
    icon: 'users',
    title: 'Community Support',
    description: 'Connect with others through the power of shared prayer and faith.',
  },
  {
    icon: 'shield',
    title: 'Privacy Protected',
    description: 'Your data is yours. We collect only what\'s necessary and nothing more.',
  },
  {
    icon: 'heart',
    title: 'Built with Love',
    description: 'Created to serve the faithful and provide a sacred space for prayer.',
  },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/profile");
  };

  const handleContactPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Saint Central Feedback`);
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0D0D0F', '#1A1A1C', '#0D0D0F']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative orbs */}
      <BackgroundOrb color="#C4A574" size={300} top={-100} left={-120} opacity={0.1} />
      <BackgroundOrb color="#B4A5C4" size={200} top={height * 0.45} left={width - 30} opacity={0.08} />
      <BackgroundOrb color="#7AA5C4" size={160} top={height * 0.8} left={-40} opacity={0.06} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & App Name */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#C4A574', '#B89660']}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>SC</Text>
            </LinearGradient>
            <View style={styles.logoRing} />
            <View style={styles.logoRingOuter} />
          </View>
          <Text style={styles.appName}>Saint Central</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>
        </Animated.View>

        {/* Mission Statement */}
        <Animated.View
          style={[
            styles.missionCard,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(196, 165, 116, 0.1)', 'rgba(196, 165, 116, 0.05)']}
            style={styles.missionGradient}
          >
            <Feather name="book-open" size={24} color="#C4A574" style={styles.missionIcon} />
            <Text style={styles.missionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              Saint Central exists to create a sacred, anonymous space where people of faith can share their prayer requests and support one another through the power of collective prayer.
            </Text>
            <Text style={styles.missionText}>
              We believe that prayer is deeply personal, and everyone deserves a place to express their hopes, fears, and gratitude without judgment or exposure.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Our Values */}
        <Animated.View
          style={[
            styles.valuesSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Our Values</Text>
          <View style={styles.valuesContainer}>
            {VALUES.map((value, index) => (
              <ValueItem
                key={value.title}
                icon={value.icon}
                title={value.title}
                description={value.description}
                delay={100 + index * 80}
              />
            ))}
          </View>
        </Animated.View>

        {/* How It Works */}
        <Animated.View
          style={[
            styles.howItWorksSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Prayer</Text>
                <Text style={styles.stepDescription}>Submit a prayer request anonymously to the community.</Text>
              </View>
            </View>
            <View style={styles.stepConnector} />
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Community Prays</Text>
                <Text style={styles.stepDescription}>Others see your request and lift you up in prayer.</Text>
              </View>
            </View>
            <View style={styles.stepConnector} />
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Feel Supported</Text>
                <Text style={styles.stepDescription}>Know that you're never alone in your journey of faith.</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Contact Section */}
        <Animated.View
          style={[
            styles.contactSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={styles.contactTitle}>Get in Touch</Text>
          <Text style={styles.contactText}>
            We'd love to hear from you! Share your feedback, suggestions, or just say hello.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactPress}
            activeOpacity={0.8}
          >
            <Feather name="mail" size={18} color="#0D0D0F" />
            <Text style={styles.contactButtonText}>Send Feedback</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={styles.footerText}>Made with faith & love</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.copyright}>© 2025 Saint Central</Text>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },
  orb: {
    position: 'absolute',
    pointerEvents: 'none',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0D0D0F',
  },
  logoRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.4)',
  },
  logoRingOuter: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.15)',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  versionBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  versionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // Mission
  missionCard: {
    marginBottom: 32,
  },
  missionGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
    padding: 24,
    alignItems: 'center',
  },
  missionIcon: {
    marginBottom: 16,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  missionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 12,
  },

  // Values
  valuesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  valuesContainer: {
    gap: 10,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  valueIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  valueDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },

  // How It Works
  howItWorksSection: {
    marginBottom: 32,
  },
  stepsContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C4A574',
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 19,
  },
  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
    marginLeft: 15,
    marginVertical: 8,
  },

  // Contact
  contactSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#C4A574',
    borderRadius: 24,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D0D0F',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  footerDivider: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  copyright: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
  },
});