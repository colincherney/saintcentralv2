// app/(tabs)/prayed-for.tsx
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
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/supabaseConfig';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInRight,
  interpolateColor,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type PrayerInteraction = {
  id: string;
  prayer_id: string;
  user_id: string;
  action: string;
  created_at: string;
  prayer?: {
    id: string;
    title: string;
    body: string;
    category: string;
    created_at: string;
  };
};

type GroupedPrayer = {
  prayer_id: string;
  prayer?: {
    id: string;
    title: string;
    body: string;
    category: string;
    created_at: string;
  };
  interactions: {
    id: string;
    action: string;
    created_at: string;
  }[];
  latestInteraction: string;
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

function formatDate(iso: string) {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  return date.toLocaleDateString('en-US', options);
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
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

// Segmented Control Component
const SegmentedControl = ({
  selectedIndex,
  onSelect,
  prayedCount,
  skippedCount,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
  prayedCount: number;
  skippedCount: number;
}) => {
  const slidePosition = useSharedValue(selectedIndex);

  useEffect(() => {
    slidePosition.value = withSpring(selectedIndex, { damping: 20, stiffness: 200 });
  }, [selectedIndex]);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slidePosition.value * ((width - 48) / 2) }],
  }));

  return (
    <View style={styles.segmentedContainer}>
      <Animated.View style={[styles.segmentedSlider, sliderStyle]} />
      <TouchableOpacity
        style={styles.segmentedOption}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(0);
        }}
        activeOpacity={0.7}
      >
        <Feather
          name="heart"
          size={16}
          color={selectedIndex === 0 ? '#C4A574' : 'rgba(255,255,255,0.4)'}
        />
        <Text
          style={[
            styles.segmentedText,
            selectedIndex === 0 && styles.segmentedTextActive,
          ]}
        >
          Prayed For
        </Text>
        <View
          style={[
            styles.countBadge,
            selectedIndex === 0 && styles.countBadgeActive,
          ]}
        >
          <Text
            style={[
              styles.countText,
              selectedIndex === 0 && styles.countTextActive,
            ]}
          >
            {prayedCount}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.segmentedOption}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(1);
        }}
        activeOpacity={0.7}
      >
        <Feather
          name="fast-forward"
          size={16}
          color={selectedIndex === 1 ? '#C4A574' : 'rgba(255,255,255,0.4)'}
        />
        <Text
          style={[
            styles.segmentedText,
            selectedIndex === 1 && styles.segmentedTextActive,
          ]}
        >
          Skipped
        </Text>
        <View
          style={[
            styles.countBadge,
            selectedIndex === 1 && styles.countBadgeActive,
          ]}
        >
          <Text
            style={[
              styles.countText,
              selectedIndex === 1 && styles.countTextActive,
            ]}
          >
            {skippedCount}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Timeline Prayer Card with expandable actions
const TimelinePrayerCard = ({
  groupedPrayer,
  isFirst,
  isLast,
  index,
  isSkipped,
}: {
  groupedPrayer: GroupedPrayer;
  isFirst: boolean;
  isLast: boolean;
  index: number;
  isSkipped: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const categoryColor =
    CATEGORIES_COLORS[groupedPrayer.prayer?.category || 'General'] || '#B4B4B4';
  
  const hasMultipleActions = groupedPrayer.interactions.length > 1;
  const latestAction = groupedPrayer.interactions[0];

  const toggleExpand = () => {
    if (hasMultipleActions) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 80).springify()}
      style={styles.timelineItem}
    >
      {/* Timeline dot and line */}
      <View style={styles.timelineLeft}>
        <View
          style={[
            styles.timelineDot,
            isSkipped && styles.timelineDotSkipped,
          ]}
        >
          <Feather
            name={isSkipped ? 'fast-forward' : 'heart'}
            size={10}
            color={isSkipped ? 'rgba(255,255,255,0.5)' : '#C4A574'}
          />
        </View>
        {!isLast && (
          <View
            style={[
              styles.timelineLine,
              isSkipped && styles.timelineLineSkipped,
            ]}
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.timelineContent}>
        <View style={styles.cardHeader}>
          <View style={styles.timeInfo}>
            <Feather name="clock" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.timeAgo}>{timeAgo(groupedPrayer.latestInteraction)}</Text>
          </View>

          <View
            style={[styles.categoryBadge, { backgroundColor: categoryColor + '25' }]}
          >
            <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {groupedPrayer.prayer?.category || 'General'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.prayerBubble,
            isSkipped && styles.prayerBubbleSkipped,
          ]}
        >
          <Text style={styles.prayerTitle}>
            {groupedPrayer.prayer?.title || 'Untitled Prayer'}
          </Text>
          <Text
            style={styles.prayerBody}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {groupedPrayer.prayer?.body || 'No content'}
          </Text>

          <View style={styles.prayerFooter}>
            <TouchableOpacity 
              style={styles.footerLeft}
              onPress={toggleExpand}
              activeOpacity={hasMultipleActions ? 0.6 : 1}
            >
              <Feather
                name={isSkipped ? 'skip-forward' : 'check-circle'}
                size={12}
                color={isSkipped ? 'rgba(255,255,255,0.3)' : 'rgba(196, 165, 116, 0.6)'}
              />
              <Text
                style={[
                  styles.footerText,
                  !isSkipped && styles.footerTextPrayed,
                ]}
              >
                {latestAction.action.charAt(0).toUpperCase() + latestAction.action.slice(1)}
              </Text>
              {hasMultipleActions && (
                <View style={styles.actionCountBadge}>
                  <Text style={styles.actionCountText}>
                    {groupedPrayer.interactions.length}x
                  </Text>
                  <Feather
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color="#C4A574"
                  />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.dateText}>
              {formatDate(groupedPrayer.latestInteraction)}
            </Text>
          </View>

          {/* Expanded Actions List */}
          {isExpanded && hasMultipleActions && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={styles.expandedActions}
            >
              <View style={styles.expandedDivider} />
              <Text style={styles.expandedTitle}>All Actions</Text>
              {groupedPrayer.interactions.map((interaction, idx) => (
                <View key={interaction.id} style={styles.actionItem}>
                  <View style={styles.actionItemLeft}>
                    <View 
                      style={[
                        styles.actionDot,
                        interaction.action === 'skipped' && styles.actionDotSkipped
                      ]} 
                    />
                    <Text style={styles.actionItemText}>
                      {interaction.action.charAt(0).toUpperCase() + interaction.action.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.actionItemDate}>
                    {timeAgo(interaction.created_at)}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// Stats Card
const StatsCard = ({
  totalPrayed,
  totalSkipped,
  streak,
}: {
  totalPrayed: number;
  totalSkipped: number;
  streak: number;
}) => (
  <Animated.View entering={FadeIn.duration(400)} style={styles.statsCard}>
    <LinearGradient
      colors={['rgba(196, 165, 116, 0.15)', 'rgba(196, 165, 116, 0.05)']}
      style={styles.statsGradient}
    >
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Feather name="heart" size={18} color="#C4A574" />
          </View>
          <Text style={styles.statValue}>{totalPrayed}</Text>
          <Text style={styles.statLabel}>Prayed</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Feather name="fast-forward" size={18} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.statValue}>{totalSkipped}</Text>
          <Text style={styles.statLabel}>Skipped</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, styles.streakIcon]}>
            <Feather name="zap" size={18} color="#FFB347" />
          </View>
          <Text style={[styles.statValue, styles.streakValue]}>{streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

export default function PrayedForScreen() {
  const [interactions, setInteractions] = useState<PrayerInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fetchInteractions = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setInteractions([]);
        return;
      }

      setCurrentUserId(user.id);

      // Fetch interactions with prayer details
      const { data, error } = await supabase
        .from('prayer_interactions')
        .select(`
          *,
          prayer:prayers (
            id,
            title,
            body,
            category,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInteractions(data || []);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  useFocusEffect(
    useCallback(() => {
      fetchInteractions(true);
    }, [fetchInteractions])
  );

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchInteractions(true);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profile');
  };

  // Group interactions by prayer_id
  const groupInteractions = (interactions: PrayerInteraction[]): GroupedPrayer[] => {
    const grouped: Record<string, GroupedPrayer> = {};

    interactions.forEach((interaction) => {
      if (!grouped[interaction.prayer_id]) {
        grouped[interaction.prayer_id] = {
          prayer_id: interaction.prayer_id,
          prayer: interaction.prayer,
          interactions: [],
          latestInteraction: interaction.created_at,
        };
      }
      grouped[interaction.prayer_id].interactions.push({
        id: interaction.id,
        action: interaction.action,
        created_at: interaction.created_at,
      });
      // Update latest interaction if this one is newer
      if (new Date(interaction.created_at) > new Date(grouped[interaction.prayer_id].latestInteraction)) {
        grouped[interaction.prayer_id].latestInteraction = interaction.created_at;
      }
    });

    // Sort interactions within each group by date (newest first)
    Object.values(grouped).forEach((group) => {
      group.interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Sort groups by latest interaction (newest first)
    return Object.values(grouped).sort(
      (a, b) => new Date(b.latestInteraction).getTime() - new Date(a.latestInteraction).getTime()
    );
  };

  // Filter interactions based on selected tab
  const prayedInteractions = interactions.filter(
    (i) => i.action !== 'skipped'
  );
  const skippedInteractions = interactions.filter(
    (i) => i.action === 'skipped'
  );
  
  // Group the filtered interactions
  const groupedPrayed = groupInteractions(prayedInteractions);
  const groupedSkipped = groupInteractions(skippedInteractions);
  const displayedGroups = selectedTab === 0 ? groupedPrayed : groupedSkipped;

  // Calculate streak (simplified - counts consecutive days)
  const calculateStreak = () => {
    const prayedDates = prayedInteractions
      .map((i) => new Date(i.created_at).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index);

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (prayedDates.includes(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
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
      <BackgroundOrb color="#C4A574" size={280} top={-80} left={-100} opacity={0.12} />
      <BackgroundOrb color="#A5C4B4" size={200} top={height * 0.4} left={width - 60} opacity={0.1} />
      <BackgroundOrb color="#B4A5C4" size={180} top={height * 0.7} left={-60} opacity={0.08} />

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
          <Feather name="activity" size={20} color="#C4A574" />
          <Text style={styles.headerTitle}>Prayer History</Text>
        </View>

        <View style={styles.headerRight}>
          <Feather name="calendar" size={18} color="rgba(255,255,255,0.5)" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
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
        {/* Stats Card */}
        <StatsCard
          totalPrayed={prayedInteractions.length}
          totalSkipped={skippedInteractions.length}
          streak={calculateStreak()}
        />

        {/* Segmented Control */}
        <SegmentedControl
          selectedIndex={selectedTab}
          onSelect={setSelectedTab}
          prayedCount={prayedInteractions.length}
          skippedCount={skippedInteractions.length}
        />

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Feather
              name={selectedTab === 0 ? 'heart' : 'fast-forward'}
              size={16}
              color={selectedTab === 0 ? '#C4A574' : 'rgba(255,255,255,0.5)'}
            />
            <Text style={styles.sectionTitle}>
              {selectedTab === 0 ? 'Prayers You\'ve Lifted' : 'Skipped Prayers'}
            </Text>
          </View>
          {displayedGroups.length > 0 && (
            <Text style={styles.interactionCount}>
              {displayedGroups.length}{' '}
              {displayedGroups.length === 1 ? 'prayer' : 'prayers'}
            </Text>
          )}
        </View>

        {/* Timeline or Empty State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#C4A574" />
          </View>
        ) : displayedGroups.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Feather
                name={selectedTab === 0 ? 'heart' : 'fast-forward'}
                size={32}
                color={selectedTab === 0 ? '#C4A574' : 'rgba(255,255,255,0.4)'}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedTab === 0 ? 'No Prayers Yet' : 'No Skipped Prayers'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedTab === 0
                ? 'Start praying for others to see\nyour journey here.'
                : 'Prayers you skip will appear here\nfor later reflection.'}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.timeline}>
            {displayedGroups.map((groupedPrayer, index) => (
              <TimelinePrayerCard
                key={groupedPrayer.prayer_id}
                groupedPrayer={groupedPrayer}
                isFirst={index === 0}
                isLast={index === displayedGroups.length - 1}
                index={index}
                isSkipped={selectedTab === 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Stats Card
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
    borderRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
  },
  streakIcon: {
    backgroundColor: 'rgba(255, 179, 71, 0.15)',
    borderColor: 'rgba(255, 179, 71, 0.2)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  streakValue: {
    color: '#FFB347',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Segmented Control
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  segmentedSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: (width - 48) / 2,
    height: '100%',
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.25)',
  },
  segmentedOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  segmentedTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(196, 165, 116, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  countTextActive: {
    color: '#C4A574',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  interactionCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(196, 165, 116, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 21,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  // Timeline
  timeline: {
    paddingHorizontal: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C4A574',
    zIndex: 2,
  },
  timelineDotSkipped: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
  },
  timelineLineSkipped: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  timelineContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prayerBubble: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  prayerBubbleSkipped: {
    opacity: 0.7,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  prayerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
  prayerBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: 12,
  },
  prayerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  footerTextPrayed: {
    color: 'rgba(196, 165, 116, 0.7)',
  },
  dateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
  },

  // Action Count Badge
  actionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
    gap: 4,
  },
  actionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C4A574',
  },

  // Expanded Actions
  expandedActions: {
    marginTop: 12,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4A574',
  },
  actionDotSkipped: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  actionItemText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  actionItemDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
});