// app/(tabs)/saved-prayers.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/supabaseConfig';

const { width, height } = Dimensions.get('window');

type SavedPrayer = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
};

const CATEGORIES_COLORS: Record<string, string> = {
  Personal: '#C4A574',
  Work: '#C4A574',
  Relationships: '#A5B4A5',
  Family: '#B4A5C4',
  Health: '#A5C4B4',
  Other: '#B4B4B4',
  General: '#B4B4B4',
};

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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

// Prayer Card Component
const PrayerCard = ({
  prayer,
  onUnsave,
}: {
  prayer: SavedPrayer;
  onUnsave: () => void;
}) => {
  const categoryColor = CATEGORIES_COLORS[prayer.category || 'General'] || '#B4B4B4';

  const handleUnsave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUnsave();
  };

  return (
    <View style={styles.card}>
      {/* Card glow effect */}
      <View style={[styles.cardGlow, { backgroundColor: categoryColor }]} />

      <View style={styles.cardInner}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[categoryColor, categoryColor + '80']}
              style={styles.avatar}
            >
              <Feather name="eye-off" size={16} color="#1A1A1C" />
            </LinearGradient>
            <View style={[styles.avatarRing, { borderColor: categoryColor + '40' }]} />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.displayName}>Anonymous</Text>
            <View style={styles.metaRow}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              <Text style={styles.metaText}>{prayer.category || 'General'}</Text>
              <Text style={styles.metaDivider}>·</Text>
              <Text style={styles.metaText}>{timeAgo(prayer.created_at)}</Text>
            </View>
          </View>

          {/* Unsave Button */}
          <TouchableOpacity
            style={styles.unsaveButton}
            onPress={handleUnsave}
            activeOpacity={0.7}
          >
            <Feather name="bookmark" size={18} color="#C4A574" fill="#C4A574" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {prayer.title}
        </Text>

        {/* Body */}
        <Text style={styles.cardBody} numberOfLines={4}>
          {prayer.body}
        </Text>
      </View>
    </View>
  );
};

// Empty State
const EmptyState = () => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Feather name="bookmark" size={48} color="rgba(255,255,255,0.3)" />
    </View>
    <Text style={styles.emptyTitle}>No saved prayers</Text>
    <Text style={styles.emptySubtitle}>
      Tap the bookmark icon on prayers you want to save for later
    </Text>
  </View>
);

export default function SavedPrayersScreen() {
  const [prayers, setPrayers] = useState<SavedPrayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fetchSavedPrayers = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPrayers([]);
        return;
      }

      setCurrentUserId(user.id);

      // Fetch saved prayer IDs
      const { data: savedInteractions, error: interactionsError } = await supabase
        .from('prayer_interactions')
        .select('prayer_id')
        .eq('user_id', user.id)
        .eq('action', 'saved');

      if (interactionsError) throw interactionsError;

      if (!savedInteractions || savedInteractions.length === 0) {
        setPrayers([]);
        return;
      }

      const prayerIds = savedInteractions.map(i => i.prayer_id);

      // Fetch the actual prayers
      const { data: prayersData, error: prayersError } = await supabase
        .from('prayers')
        .select('id, title, body, category, created_at')
        .in('id', prayerIds)
        .order('created_at', { ascending: false });

      if (prayersError) throw prayersError;

      setPrayers(prayersData || []);
    } catch (error) {
      console.error('Error fetching saved prayers:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedPrayers();
  }, [fetchSavedPrayers]);

  const handleUnsave = async (prayerId: string) => {
    if (!currentUserId) return;

    try {
      // Remove from database
      await supabase
        .from('prayer_interactions')
        .delete()
        .eq('prayer_id', prayerId)
        .eq('user_id', currentUserId)
        .eq('action', 'saved');

      // Update local state
      setPrayers(prev => prev.filter(p => p.id !== prayerId));
    } catch (error) {
      console.error('Error unsaving prayer:', error);
    }
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchSavedPrayers(true);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profile');
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
      <BackgroundOrb color="#C4A574" size={250} top={-50} left={-80} opacity={0.12} />
      <BackgroundOrb color="#B4A5C4" size={200} top={height * 0.6} left={width - 60} opacity={0.1} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Saved Prayers</Text>
          <Text style={styles.headerSubtitle}>
            {prayers.length} {prayers.length === 1 ? 'prayer' : 'prayers'}
          </Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C4A574" />
          <Text style={styles.loadingText}>Loading saved prayers...</Text>
        </View>
      ) : prayers.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#C4A574"
              colors={['#C4A574']}
            />
          }
        >
          {prayers.map((prayer) => (
            <PrayerCard
              key={prayer.id}
              prayer={prayer}
              onUnsave={() => handleUnsave(prayer.id)}
            />
          ))}
        </ScrollView>
      )}
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },

  // Card
  card: {
    position: 'relative',
    marginBottom: 16,
  },
  cardGlow: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 21,
    opacity: 0.15,
  },
  cardInner: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    borderWidth: 1,
  },
  headerInfo: {
    flex: 1,
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 6,
  },
  metaText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  metaDivider: {
    color: 'rgba(255,255,255,0.2)',
    marginHorizontal: 6,
  },
  unsaveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 10,
    lineHeight: 26,
  },
  cardBody: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
});