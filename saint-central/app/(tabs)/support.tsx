// app/(tabs)/help-support.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const SUPPORT_EMAIL = 'saintcentral59@gmail.com';

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

type FAQItemProps = {
  question: string;
  answer: string;
  delay?: number;
};

const FAQItem = ({ question, answer, delay = 0 }: FAQItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

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

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 0 : 1,
      tension: 50,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const rotateIcon = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        styles.faqItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <Text style={styles.faqQuestion}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <Feather name="chevron-down" size={20} color="rgba(255,255,255,0.4)" />
        </Animated.View>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const FAQ_ITEMS = [
  {
    question: 'How do I submit a prayer request?',
    answer: 'Tap the "+" button on the home screen to create a new prayer request. Write your prayer and choose whether to share it with the community or keep it private.',
  },
  {
    question: 'Is my identity visible to others?',
    answer: 'No! Saint Central is completely anonymous. Your prayers are never linked to your identity. Other users cannot see who submitted a prayer request.',
  },
  {
    question: 'Do I need an account to use the app?',
    answer: 'You can use Saint Central anonymously without providing any personal information. An email is only needed if you want to sync your prayers across multiple devices.',
  },
  {
    question: 'How do I pray for someone else\'s request?',
    answer: 'Simply tap the pray button (hands icon) on any prayer request. This lets the person know someone is praying for them, while keeping your identity private.',
  },
  {
    question: 'Can I delete my prayers?',
    answer: 'Yes! Go to "My Prayers" from your profile page, tap on any prayer, and you\'ll find the option to delete it.',
  },
  {
    question: 'How do I delete my account?',
    answer: 'Go to Settings > Privacy, and you\'ll find the option to delete your account. This will permanently remove all your data from our servers.',
  },
];

export default function HelpSupportScreen() {
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

  const handleEmailPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Saint Central Support Request`);
  };

  const handleCopyEmail = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Note: You'd need to import Clipboard from expo-clipboard for this to work
    Alert.alert('Email Address', SUPPORT_EMAIL, [
      { text: 'OK', style: 'default' },
    ]);
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
      <BackgroundOrb color="#7AA5C4" size={280} top={-80} left={-100} opacity={0.1} />
      <BackgroundOrb color="#C4A574" size={220} top={height * 0.5} left={width - 40} opacity={0.08} />
      <BackgroundOrb color="#B4A5C4" size={180} top={height * 0.75} left={-60} opacity={0.06} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                <Feather name="help-circle" size={32} color="#0D0D0F" />
              </LinearGradient>
              <View style={styles.heroIconRing} />
            </View>
            <Text style={styles.heroTitle}>How Can We Help?</Text>
            <Text style={styles.heroSubtitle}>
              Find answers to common questions below, or reach out to us directly.
            </Text>
          </Animated.View>

          {/* Contact Card */}
          <Animated.View
            style={[
              styles.contactCard,
              {
                opacity: headerFade,
                transform: [{ translateY: headerSlide }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(196, 165, 116, 0.12)', 'rgba(196, 165, 116, 0.06)']}
              style={styles.contactCardGradient}
            >
              <View style={styles.contactIconContainer}>
                <Feather name="mail" size={24} color="#C4A574" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email Us</Text>
                <Text style={styles.contactEmail}>{SUPPORT_EMAIL}</Text>
                <Text style={styles.contactNote}>We typically respond within 24-48 hours</Text>
              </View>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleEmailPress}
                activeOpacity={0.8}
              >
                <Text style={styles.contactButtonText}>Send Email</Text>
                <Feather name="arrow-right" size={16} color="#0D0D0F" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* FAQ Section */}
          <Animated.View
            style={[
              styles.faqSection,
              {
                opacity: headerFade,
                transform: [{ translateY: headerSlide }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <View style={styles.faqContainer}>
              {FAQ_ITEMS.map((item, index) => (
                <FAQItem
                  key={index}
                  question={item.question}
                  answer={item.answer}
                  delay={100 + index * 60}
                />
              ))}
            </View>
          </Animated.View>

          {/* Still Need Help */}
          <Animated.View
            style={[
              styles.stillNeedHelp,
              {
                opacity: headerFade,
                transform: [{ translateY: headerSlide }],
              },
            ]}
          >
            <View style={styles.stillNeedHelpContent}>
              <Feather name="message-circle" size={20} color="rgba(255,255,255,0.4)" />
              <Text style={styles.stillNeedHelpText}>
                Couldn't find what you're looking for?
              </Text>
            </View>
            <TouchableOpacity
              style={styles.stillNeedHelpButton}
              onPress={handleEmailPress}
              activeOpacity={0.8}
            >
              <Feather name="mail" size={16} color="#C4A574" />
              <Text style={styles.stillNeedHelpButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer Message */}
          <Animated.View
            style={[
              styles.footerMessage,
              {
                opacity: headerFade,
                transform: [{ translateY: headerSlide }],
              },
            ]}
          >
            <Feather name="heart" size={16} color="rgba(196, 165, 116, 0.5)" />
            <Text style={styles.footerText}>
              Thank you for being part of Saint Central
            </Text>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
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
    marginBottom: 28,
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

  // Contact Card
  contactCard: {
    marginBottom: 32,
  },
  contactCardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
    padding: 20,
    alignItems: 'center',
  },
  contactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  contactInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  contactNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  // FAQ Section
  faqSection: {
    marginBottom: 24,
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
  faqContainer: {
    gap: 8,
  },
  faqItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 21,
  },

  // Still Need Help
  stillNeedHelp: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  stillNeedHelpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  stillNeedHelpText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  stillNeedHelpButton: {
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
  stillNeedHelpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C4A574',
  },

  // Footer
  footerMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
});