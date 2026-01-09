// app/(tabs)/privacy.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

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

type PrivacySectionProps = {
  icon: string;
  title: string;
  description: string;
  highlight?: boolean;
  delay?: number;
};

const PrivacySection = ({ icon, title, description, highlight = false, delay = 0 }: PrivacySectionProps) => {
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
        styles.sectionCard,
        highlight && styles.sectionCardHighlight,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.sectionIconContainer, highlight && styles.sectionIconHighlight]}>
        <Feather name={icon as any} size={20} color={highlight ? '#C4A574' : 'rgba(255,255,255,0.6)'} />
      </View>
      <View style={styles.sectionContent}>
        <Text style={[styles.sectionTitle, highlight && styles.sectionTitleHighlight]}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

const PRIVACY_SECTIONS = [
  {
    icon: 'eye-off',
    title: 'Complete Anonymity',
    description: 'Your prayers are shared anonymously. No names, no profiles, no way to trace prayers back to you. Your faith journey is between you and God.',
    highlight: true,
  },
  {
    icon: 'database',
    title: 'Minimal Data Collection',
    description: 'We only store your email address (if you choose to provide one) to sync your prayers across devices. That\'s it. No tracking, no analytics, no third-party data sharing.',
    highlight: false,
  },
  {
    icon: 'mail',
    title: 'Optional Email',
    description: 'Email is completely optional. You can use Saint Central without providing any personal information. Anonymous accounts work just as well.',
    highlight: false,
  },
  {
    icon: 'lock',
    title: 'Secure Storage',
    description: 'All prayer data is encrypted and stored securely. We use industry-standard security practices to protect your spiritual content.',
    highlight: false,
  },
  {
    icon: 'trash-2',
    title: 'Right to Delete',
    description: 'You can delete your account and all associated data at any time. When you delete, everything is permanently removed from our servers.',
    highlight: false,
  },
  {
    icon: 'shield-off',
    title: 'No Advertising',
    description: 'We will never sell your data or show you targeted ads. Saint Central is a sacred space, free from commercial exploitation.',
    highlight: false,
  },
];

const DATA_POINTS = [
  { label: 'Email (optional)', stored: true },
  { label: 'Prayer content', stored: true },
  { label: 'Name or identity', stored: false },
  { label: 'Location data', stored: false },
  { label: 'Device information', stored: false },
  { label: 'Browsing history', stored: false },
  { label: 'Third-party tracking', stored: false },
];

export default function PrivacyScreen() {
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
    router.back();
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
      <BackgroundOrb color="#B4A5C4" size={280} top={-80} left={-100} opacity={0.1} />
      <BackgroundOrb color="#C4A574" size={220} top={height * 0.4} left={width - 40} opacity={0.08} />
      <BackgroundOrb color="#7AA5C4" size={180} top={height * 0.7} left={-60} opacity={0.06} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
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
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <View style={styles.heroIconContainer}>
            <LinearGradient
              colors={['#C4A574', '#B89660']}
              style={styles.heroIconGradient}
            >
              <Feather name="shield" size={32} color="#0D0D0F" />
            </LinearGradient>
            <View style={styles.heroIconRing} />
          </View>
          <Text style={styles.heroTitle}>Your Privacy is Sacred</Text>
          <Text style={styles.heroSubtitle}>
            Saint Central is built on the principle that your spiritual life deserves complete privacy and protection.
          </Text>
        </Animated.View>

        {/* Privacy Sections */}
        <View style={styles.sectionsContainer}>
          {PRIVACY_SECTIONS.map((section, index) => (
            <PrivacySection
              key={section.title}
              icon={section.icon}
              title={section.title}
              description={section.description}
              highlight={section.highlight}
              delay={100 + index * 80}
            />
          ))}
        </View>

        {/* Data We Collect Summary */}
        <Animated.View
          style={[
            styles.dataSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={styles.dataSectionTitle}>What We Store</Text>
          <View style={styles.dataCard}>
            {DATA_POINTS.map((point, index) => (
              <View
                key={point.label}
                style={[
                  styles.dataRow,
                  index < DATA_POINTS.length - 1 && styles.dataRowBorder,
                ]}
              >
                <View style={styles.dataRowLeft}>
                  <View style={[styles.dataIndicator, point.stored && styles.dataIndicatorActive]} />
                  <Text style={styles.dataLabel}>{point.label}</Text>
                </View>
                <View style={[styles.dataBadge, point.stored ? styles.dataBadgeYes : styles.dataBadgeNo]}>
                  <Feather
                    name={point.stored ? 'check' : 'x'}
                    size={12}
                    color={point.stored ? '#C4A574' : 'rgba(255,100,100,0.8)'}
                  />
                  <Text style={[styles.dataBadgeText, point.stored ? styles.dataBadgeTextYes : styles.dataBadgeTextNo]}>
                    {point.stored ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Commitment Statement */}
        <Animated.View
          style={[
            styles.commitmentSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(196, 165, 116, 0.1)', 'rgba(196, 165, 116, 0.05)']}
            style={styles.commitmentCard}
          >
            <Feather name="heart" size={24} color="#C4A574" style={styles.commitmentIcon} />
            <Text style={styles.commitmentText}>
              "We believe prayer is a deeply personal act of faith. Saint Central will always prioritize your privacy and never compromise your trust."
            </Text>
            <Text style={styles.commitmentAuthor}>— The Saint Central Team</Text>
          </LinearGradient>
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
          <Text style={styles.contactTitle}>Questions?</Text>
          <Text style={styles.contactText}>
            If you have any questions about our privacy practices, please reach out to us.
          </Text>
          <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
            <Feather name="mail" size={16} color="#C4A574" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>Last updated: January 2026</Text>
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
  heroIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  heroIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.3)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  // Sections
  sectionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionCardHighlight: {
    backgroundColor: 'rgba(196, 165, 116, 0.08)',
    borderColor: 'rgba(196, 165, 116, 0.2)',
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sectionIconHighlight: {
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sectionTitleHighlight: {
    color: '#C4A574',
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },

  // Data Section
  dataSection: {
    marginBottom: 24,
  },
  dataSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  dataCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dataRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dataIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,100,100,0.4)',
  },
  dataIndicatorActive: {
    backgroundColor: 'rgba(196, 165, 116, 0.8)',
  },
  dataLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  dataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  dataBadgeYes: {
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
  },
  dataBadgeNo: {
    backgroundColor: 'rgba(255,100,100,0.1)',
  },
  dataBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dataBadgeTextYes: {
    color: '#C4A574',
  },
  dataBadgeTextNo: {
    color: 'rgba(255,100,100,0.8)',
  },

  // Commitment
  commitmentSection: {
    marginBottom: 24,
  },
  commitmentCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
    alignItems: 'center',
  },
  commitmentIcon: {
    marginBottom: 16,
  },
  commitmentText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  commitmentAuthor: {
    fontSize: 13,
    color: '#C4A574',
    fontWeight: '600',
  },

  // Contact
  contactSection: {
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.3)',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C4A574',
  },

  // Last Updated
  lastUpdated: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 8,
  },
});