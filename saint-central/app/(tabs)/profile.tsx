// app/(tabs)/profile.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { authHelpers, supabase } from '@/supabaseConfig';
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

type MenuItemType = {
  key: string;
  label: string;
  icon: string;
  count: number;
  route?: string;
};

const SETTINGS_ITEMS = [
  { key: 'notifications', label: 'Notifications', icon: 'bell' },
  { key: 'privacy', label: 'Privacy', icon: 'shield' },
  { key: 'help', label: 'Help & Support', icon: 'help-circle' },
  { key: 'about', label: 'About', icon: 'info' },
];

export default function ProfileScreen() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [stats, setStats] = useState({
    myPrayers: 0,
    prayedFor: 0,
    saved: 0,
  });
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Fetch user stats
  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch my prayers count
      const { count: myPrayersCount } = await supabase
        .from('prayers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch prayed for count
      const { count: prayedForCount } = await supabase
        .from('prayer_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'prayed');

      // Fetch saved count
      const { count: savedCount } = await supabase
        .from('prayer_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'saved');

      setStats({
        myPrayers: myPrayersCount || 0,
        prayedFor: prayedForCount || 0,
        saved: savedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    // Get current user email
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
    };
    getUser();
    fetchStats();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Refresh stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const MENU_ITEMS: MenuItemType[] = [
    { key: 'prayers', label: 'My Prayers', icon: 'file-text', count: stats.myPrayers, route: '/(tabs)/my-prayers' },
    { key: 'prayed', label: 'Prayed For', icon: 'heart', count: stats.prayedFor },
    { key: 'saved', label: 'Saved', icon: 'bookmark', count: stats.saved, route: '/(tabs)/saved-prayers' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await authHelpers.signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleMenuItemPress = (item: MenuItemType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.route) {
      router.push(item.route as any);
    }
  };

  // Get display name from email
  const getDisplayName = () => {
    if (!userEmail) return 'User';
    if (userEmail.startsWith('anonymous.')) return 'Anonymous';
    return userEmail.split('@')[0];
  };

  const getInitial = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
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
      <BackgroundOrb color="#B4A5C4" size={250} top={-50} left={-80} opacity={0.12} />
      <BackgroundOrb color="#C4A574" size={200} top={height * 0.6} left={width - 60} opacity={0.1} />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#C4A574', '#B89660']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitial()}</Text>
            </LinearGradient>
            <View style={styles.avatarRing} />
          </View>

          <Text style={styles.displayName}>{getDisplayName()}</Text>
          <Text style={styles.email}>{userEmail || 'Loading...'}</Text>

          <TouchableOpacity style={styles.editButton} activeOpacity={0.8}>
            <Feather name="edit-2" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats */}
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.statCard,
                index < MENU_ITEMS.length - 1 && styles.statCardBorder,
              ]}
              activeOpacity={0.8}
              onPress={() => handleMenuItemPress(item)}
            >
              <View style={styles.statIconContainer}>
                <Feather name={item.icon as any} size={20} color="#C4A574" />
              </View>
              <Text style={styles.statCount}>{item.count}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Settings Menu */}
        <Animated.View
          style={[
            styles.menuSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuContainer}>
            {SETTINGS_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  index < SETTINGS_ITEMS.length - 1 && styles.menuItemBorder,
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Feather name={item.icon as any} size={18} color="rgba(255,255,255,0.6)" />
                  </View>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Sign Out Button */}
        <Animated.View
          style={[
            styles.logoutSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            <Feather
              name="log-out"
              size={18}
              color={isLoggingOut ? 'rgba(255,100,100,0.4)' : 'rgba(255,100,100,0.8)'}
            />
            <Text
              style={[
                styles.logoutText,
                isLoggingOut && styles.logoutTextDisabled,
              ]}
            >
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.3)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0D0D0F',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statCardBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },

  // Menu Section
  menuSection: {
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
  menuContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // Logout
  logoutSection: {
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,100,100,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.15)',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,100,100,0.8)',
  },
  logoutTextDisabled: {
    color: 'rgba(255,100,100,0.4)',
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
  },
});