// app/(tabs)/notifications.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
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

type NotificationItemProps = {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  title: string;
  message: string;
  time: string;
  isNew?: boolean;
  delay?: number;
};

const NotificationItem = ({ 
  icon, 
  iconColor, 
  iconBgColor, 
  title, 
  message, 
  time, 
  isNew = false,
  delay = 0 
}: NotificationItemProps) => {
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
        styles.notificationItem,
        isNew && styles.notificationItemNew,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.notificationIcon, { backgroundColor: iconBgColor }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{title}</Text>
          {isNew && <View style={styles.newBadge} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>{message}</Text>
        <Text style={styles.notificationTime}>{time}</Text>
      </View>
    </Animated.View>
  );
};

const MOCK_NOTIFICATIONS = [
  {
    icon: 'heart',
    iconColor: '#E57373',
    iconBgColor: 'rgba(229, 115, 115, 0.15)',
    title: '12 people prayed for you',
    message: 'Your prayer request "Strength during difficult times" received support from the community.',
    time: '2 hours ago',
    isNew: true,
  },
  {
    icon: 'users',
    iconColor: '#64B5F6',
    iconBgColor: 'rgba(100, 181, 246, 0.15)',
    title: 'New prayer requests',
    message: '5 new prayer requests have been shared in the community today.',
    time: '4 hours ago',
    isNew: true,
  },
  {
    icon: 'bookmark',
    iconColor: '#C4A574',
    iconBgColor: 'rgba(196, 165, 116, 0.15)',
    title: 'Saved prayer update',
    message: 'A prayer you saved has been marked as answered. Rejoice!',
    time: 'Yesterday',
    isNew: false,
  },
  {
    icon: 'sun',
    iconColor: '#FFB74D',
    iconBgColor: 'rgba(255, 183, 77, 0.15)',
    title: 'Daily reminder',
    message: 'Take a moment to pray and reflect. Your faith community is here with you.',
    time: 'Yesterday',
    isNew: false,
  },
  {
    icon: 'award',
    iconColor: '#81C784',
    iconBgColor: 'rgba(129, 199, 132, 0.15)',
    title: 'Prayer milestone',
    message: 'You\'ve prayed for 25 community members this month. Thank you for your support!',
    time: '3 days ago',
    isNew: false,
  },
  {
    icon: 'heart',
    iconColor: '#E57373',
    iconBgColor: 'rgba(229, 115, 115, 0.15)',
    title: '8 people prayed for you',
    message: 'Your prayer request "Guidance for a big decision" received support.',
    time: '5 days ago',
    isNew: false,
  },
];

export default function NotificationsScreen() {
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

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0D0D0F', '#1A1A1C', '#0D0D0F']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative orbs */}
      <BackgroundOrb color="#B4A5C4" size={260} top={-70} left={-90} opacity={0.1} />
      <BackgroundOrb color="#C4A574" size={200} top={height * 0.5} left={width - 50} opacity={0.08} />
      <BackgroundOrb color="#7AA5C4" size={150} top={height * 0.8} left={-50} opacity={0.06} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
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
        {/* Coming Soon Banner */}
        <Animated.View
          style={[
            styles.comingSoonBanner,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(196, 165, 116, 0.15)', 'rgba(196, 165, 116, 0.08)']}
            style={styles.comingSoonGradient}
          >
            <View style={styles.comingSoonIconContainer}>
              <Feather name="bell" size={20} color="#C4A574" />
            </View>
            <View style={styles.comingSoonContent}>
              <Text style={styles.comingSoonTitle}>Notifications Coming Soon</Text>
              <Text style={styles.comingSoonText}>
                This is a preview with sample data. Real-time notifications will be available in a future update!
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* New Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New</Text>
            <View style={styles.newCount}>
              <Text style={styles.newCountText}>2</Text>
            </View>
          </View>
          <View style={styles.notificationsContainer}>
            {MOCK_NOTIFICATIONS.filter(n => n.isNew).map((notification, index) => (
              <NotificationItem
                key={index}
                {...notification}
                delay={100 + index * 80}
              />
            ))}
          </View>
        </Animated.View>

        {/* Earlier Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Earlier</Text>
          <View style={styles.notificationsContainer}>
            {MOCK_NOTIFICATIONS.filter(n => !n.isNew).map((notification, index) => (
              <NotificationItem
                key={index}
                {...notification}
                delay={250 + index * 80}
              />
            ))}
          </View>
        </Animated.View>

        {/* Footer Note */}
        <Animated.View
          style={[
            styles.footerNote,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Feather name="info" size={14} color="rgba(255,255,255,0.3)" />
          <Text style={styles.footerNoteText}>
            Sample notifications shown for preview purposes
          </Text>
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

  // Coming Soon Banner
  comingSoonBanner: {
    marginBottom: 24,
    marginTop: 8,
  },
  comingSoonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.25)',
  },
  comingSoonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  comingSoonContent: {
    flex: 1,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C4A574',
    marginBottom: 4,
  },
  comingSoonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newCount: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
    borderRadius: 10,
  },
  newCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C4A574',
  },
  notificationsContainer: {
    gap: 10,
  },

  // Notification Item
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  notificationItemNew: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  newBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4A574',
  },
  notificationMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },

  // Footer Note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
  },
  footerNoteText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
});