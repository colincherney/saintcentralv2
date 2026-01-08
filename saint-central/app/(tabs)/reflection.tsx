// app/(tabs)/reflection.tsx
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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/supabaseConfig';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type Reflection = {
  id: string;
  content: string;
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

// Timeline Reflection Card
const TimelineReflectionCard = ({
  reflection,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  index,
}: {
  reflection: Reflection;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  index: number;
}) => {
  return (
    <Animated.View 
      entering={SlideInRight.delay(index * 100).springify()}
      style={styles.timelineItem}
    >
      {/* Timeline dot and line */}
      <View style={styles.timelineLeft}>
        <View style={styles.timelineDot}>
          <View style={styles.timelineDotInner} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Content */}
      <View style={styles.timelineContent}>
        <View style={styles.reflectionCardHeader}>
          <View style={styles.timeInfo}>
            <Feather name="clock" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.timeAgo}>{timeAgo(reflection.created_at)}</Text>
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionIcon}>
              <Feather name="edit-2" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionIcon}>
              <Feather name="trash-2" size={14} color="rgba(255,100,100,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.reflectionBubble}>
          <Text style={styles.reflectionText}>{reflection.content}</Text>
          <Text style={styles.reflectionDate}>{formatDate(reflection.created_at)}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Floating Add Button
const FloatingAddButton = ({ onPress, isVisible }: { onPress: () => void; isVisible: boolean }) => {
  const scale = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isVisible ? 1 : 0, { damping: 15, stiffness: 150 });
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.fabContainer, animatedStyle]}>
      <TouchableOpacity
        style={styles.fab}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#C4A574', '#B89660']}
          style={styles.fabGradient}
        >
          <Feather name="plus" size={24} color="#1A1A1C" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ReflectionScreen() {
  const params = useLocalSearchParams();
  const { prayerId, title, body, category, createdAt } = params;
  
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const categoryColor = CATEGORIES_COLORS[(category as string) || 'General'] || '#B4B4B4';

  const fetchReflections = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReflections([]);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .eq('prayer_id', prayerId as string)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReflections(data || []);
    } catch (error) {
      console.error('Error fetching reflections:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [prayerId]);

  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  // Refresh when coming back from write-reflection screen
  useFocusEffect(
    useCallback(() => {
      fetchReflections(true);
    }, [fetchReflections])
  );

  const handleEditReflection = (reflection: Reflection) => {
    router.push({
      pathname: '/(tabs)/write-reflection',
      params: {
        prayerId: prayerId as string,
        title: title as string,
        body: body as string,
        category: category as string,
        createdAt: createdAt as string,
        reflectionId: reflection.id,
        existingContent: reflection.content,
        mode: 'edit',
      },
    });
  };

  const handleDeleteReflection = async (reflectionId: string) => {
    if (!currentUserId) return;

    Alert.alert(
      'Delete Reflection',
      'Remove this reflection from your journal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('reflections')
                .delete()
                .eq('id', reflectionId)
                .eq('user_id', currentUserId);

              if (error) throw error;

              setReflections(prev => prev.filter(r => r.id !== reflectionId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting reflection:', error);
              Alert.alert('Error', 'Failed to delete reflection.');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchReflections(true);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/my-prayers');
  };

  const handleAddReflection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/write-reflection',
      params: {
        prayerId: prayerId as string,
        title: title as string,
        body: body as string,
        category: category as string,
        createdAt: createdAt as string,
        mode: 'create',
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background */}
      <LinearGradient
        colors={['#0D0D0F', '#1A1A1C', '#0D0D0F']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative orbs */}
      <BackgroundOrb color={categoryColor} size={280} top={-80} left={-100} opacity={0.15} />
      <BackgroundOrb color="#B4A5C4" size={220} top={height * 0.7} left={width - 80} opacity={0.12} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Feather name="book-open" size={20} color={categoryColor} />
          <Text style={styles.headerTitle}>Journal</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.entryCount}>{reflections.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 20 }}
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
        {/* Prayer Card */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.prayerCard}>
          <LinearGradient
            colors={[categoryColor + '20', categoryColor + '05']}
            style={styles.prayerGradient}
          >
            <View style={styles.prayerHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '30' }]}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {category as string}
                </Text>
              </View>
              <Text style={styles.prayerDateText}>{formatDate(createdAt as string)}</Text>
            </View>

            <Text style={styles.prayerTitle}>{title as string}</Text>
            <Text style={styles.prayerBody}>{body as string}</Text>

            <View style={styles.prayerFooter}>
              <Feather name="heart" size={14} color="rgba(255,255,255,0.3)" />
              <Text style={styles.prayerFooterText}>Your prayer</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="activity" size={16} color={categoryColor} />
            <Text style={styles.sectionTitle}>Your Journey</Text>
          </View>
          {reflections.length > 0 && (
            <Text style={styles.reflectionCount}>
              {reflections.length} {reflections.length === 1 ? 'entry' : 'entries'}
            </Text>
          )}
        </View>

        {/* Timeline or Empty State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#C4A574" />
          </View>
        ) : reflections.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Feather name="feather" size={32} color={categoryColor} />
            </View>
            <Text style={styles.emptyTitle}>Start Your Reflection</Text>
            <Text style={styles.emptyText}>
              Document your spiritual journey.{'\n'}Your thoughts, prayers, and growth.
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.timeline}>
            {reflections.map((reflection, index) => (
              <TimelineReflectionCard
                key={reflection.id}
                reflection={reflection}
                isFirst={index === 0}
                isLast={index === reflections.length - 1}
                onEdit={() => handleEditReflection(reflection)}
                onDelete={() => handleDeleteReflection(reflection.id)}
                index={index}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <FloatingAddButton onPress={handleAddReflection} isVisible={true} />
    </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
  },
  entryCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C4A574',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Prayer Card
  prayerCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  prayerGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prayerDateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  prayerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  prayerBody: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
    marginBottom: 16,
  },
  prayerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  prayerFooterText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
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
  reflectionCount: {
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
    marginBottom: 24,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C4A574',
    zIndex: 2,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4A574',
  },
  timelineLine: {
    position: 'absolute',
    top: 20,
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(196, 165, 116, 0.2)',
  },
  timelineContent: {
    flex: 1,
  },
  reflectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionBubble: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  reflectionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 12,
  },
  reflectionDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#C4A574',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});