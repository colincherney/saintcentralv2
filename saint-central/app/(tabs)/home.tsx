// app/(tabs)/home.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "@/supabaseConfig";

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.25;

type PrayerRequest = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
};

const PRESET_REACTIONS = [
  { key: "amen", label: "Amen", icon: "heart" },
  { key: "praying", label: "Praying", icon: "sunrise" },
  { key: "peace", label: "Peace", icon: "feather" },
  { key: "strength", label: "Strength", icon: "shield" },
  { key: "healing", label: "Healing", icon: "activity" },
  { key: "guidance", label: "Guidance", icon: "compass" },
];

const CATEGORIES_COLORS: Record<string, string> = {
  Personal: "#C4A574",
  Work: "#C4A574",
  Relationships: "#A5B4A5",
  Family: "#B4A5C4",
  Health: "#A5C4B4",
  Other: "#B4B4B4",
  General: "#B4B4B4",
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

// Swipeable Prayer Card
const SwipeablePrayerCard = ({
  item,
  onPray,
  onSkip,
  onReact,
}: {
  item: PrayerRequest;
  onPray: () => void;
  onSkip: () => void;
  onReact: () => void;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.95);

  const categoryColor = CATEGORIES_COLORS[item.category || "General"] || "#B4B4B4";

  // Animate in on mount
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    cardScale.value = 0.95;
    cardOpacity.value = 0;
    
    // Smooth fade and scale in
    cardScale.value = withSpring(1, { damping: 18, stiffness: 180 });
    cardOpacity.value = withTiming(1, { duration: 300 });
  }, [item.id]);

  const triggerHaptic = (type: "light" | "medium") => {
    if (type === "light") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSwipeComplete = (direction: "left" | "right") => {
    if (direction === "right") {
      triggerHaptic("medium");
      onPray();
    } else {
      triggerHaptic("light");
      onSkip();
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.15;
    })
    .onEnd((event) => {
      const shouldSwipeRight = translateX.value > SWIPE_THRESHOLD;
      const shouldSwipeLeft = translateX.value < -SWIPE_THRESHOLD;

      if (shouldSwipeRight) {
        translateX.value = withTiming(width * 1.2, { duration: 280 });
        translateY.value = withTiming(translateY.value * 1.5, { duration: 280 });
        cardOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(handleSwipeComplete)("right");
      } else if (shouldSwipeLeft) {
        translateX.value = withTiming(-width * 1.2, { duration: 280 });
        translateY.value = withTiming(translateY.value * 1.5, { duration: 280 });
        cardOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(handleSwipeComplete)("left");
      } else {
        // Snap back smoothly
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: cardScale.value },
      ],
      opacity: cardOpacity.value,
    };
  });

  const prayIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0.8, 1],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const skipIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0.8],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const handlePrayPress = () => {
    triggerHaptic("medium");
    translateX.value = withTiming(width * 1.2, { duration: 300 });
    cardOpacity.value = withTiming(0, { duration: 280 });
    setTimeout(() => onPray(), 300);
  };

  const handleSkipPress = () => {
    triggerHaptic("light");
    translateX.value = withTiming(-width * 1.2, { duration: 300 });
    cardOpacity.value = withTiming(0, { duration: 280 });
    setTimeout(() => onSkip(), 300);
  };

  const handleReactPress = () => {
    triggerHaptic("light");
    onReact();
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        {/* Swipe Indicators */}
        <Animated.View style={[styles.swipeIndicator, styles.prayIndicator, prayIndicatorStyle]}>
          <Feather name="sunrise" size={24} color="#C4A574" />
          <Text style={styles.swipeIndicatorText}>PRAYED</Text>
        </Animated.View>

        <Animated.View style={[styles.swipeIndicator, styles.skipIndicator, skipIndicatorStyle]}>
          <Feather name="x" size={24} color="rgba(255,255,255,0.6)" />
          <Text style={[styles.swipeIndicatorText, { color: "rgba(255,255,255,0.6)" }]}>SKIP</Text>
        </Animated.View>

        {/* Card glow effect */}
        <View style={[styles.cardGlow, { backgroundColor: categoryColor }]} />

        {/* Card content */}
        <View style={styles.cardInner}>
          {/* Header - Anonymous */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[categoryColor, categoryColor + "80"]}
                style={styles.avatar}
              >
                <Feather name="eye-off" size={20} color="#1A1A1C" />
              </LinearGradient>
              <View style={[styles.avatarRing, { borderColor: categoryColor + "40" }]} />
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.displayName}>Anonymous</Text>
              <View style={styles.metaRow}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                <Text style={styles.metaText}>{item.category || "General"}</Text>
                <Text style={styles.metaDivider}>·</Text>
                <Text style={styles.metaText}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle}>{item.title}</Text>

          {/* Body */}
          <Text style={styles.cardBody}>{item.body}</Text>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Feather name="sunrise" size={14} color="rgba(255,255,255,0.2)" />
            <View style={styles.dividerLine} />
          </View>

          {/* Quick Prayer */}
          <View style={styles.quickPrayer}>
            <Text style={styles.quickPrayerLabel}>A prayer for them</Text>
            <Text style={styles.quickPrayerText}>
              "Lord, be near to this person. Grant them peace, strength, and Your guiding light. Amen."
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSkipPress}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={styles.actionButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonCenter}
              onPress={handleReactPress}
              activeOpacity={0.7}
            >
              <Feather name="heart" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButtonPrimary, { backgroundColor: categoryColor }]}
              onPress={handlePrayPress}
              activeOpacity={0.8}
            >
              <Feather name="sunrise" size={18} color="#1A1A1C" />
              <Text style={styles.actionButtonPrimaryText}>I Prayed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

// Empty state component
const EmptyState = ({ onRestart }: { onRestart: () => void }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleRestart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRestart();
  };

  return (
    <Animated.View style={[styles.emptyState, animatedStyle]}>
      <View style={styles.emptyIconContainer}>
        <Feather name="check-circle" size={48} color="rgba(255,255,255,0.3)" />
      </View>
      <Text style={styles.emptyTitle}>All caught up</Text>
      <Text style={styles.emptySubtitle}>
        You've prayed through all requests.{"\n"}Check back later for more.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleRestart}
        activeOpacity={0.8}
      >
        <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.8)" />
        <Text style={styles.emptyButtonText}>Start Over</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function PrayScreen() {
  const [cards, setCards] = useState<PrayerRequest[]>([]);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);

  // Fetch prayers from Supabase
  const fetchPrayers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch prayers excluding ones user has already interacted with
      const { data: interactedPrayers } = await supabase
        .from('prayer_interactions')
        .select('prayer_id')
        .eq('user_id', user?.id);

      const interactedIds = interactedPrayers?.map(p => p.prayer_id) || [];

      let query = supabase
        .from('prayers')
        .select('id, title, body, category, created_at')
        .order('created_at', { ascending: false });

      // Exclude already interacted prayers
      if (interactedIds.length > 0) {
        query = query.not('id', 'in', `(${interactedIds.join(',')})`);
      }

      // Exclude user's own prayers
      if (user) {
        query = query.neq('user_id', user.id);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setCards(data || []);
      setIndex(0);
      setHistory([]);
    } catch (error) {
      console.error('Error fetching prayers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const current = cards[index] ?? null;

  const countText = useMemo(() => {
    if (!cards.length) return "0 / 0";
    return `${Math.min(index + 1, cards.length)} / ${cards.length}`;
  }, [index, cards.length]);

  // Record interaction to Supabase
  const recordInteraction = async (prayerId: string, action: string) => {
    if (!currentUserId) return;
    
    try {
      await supabase.from('prayer_interactions').upsert({
        prayer_id: prayerId,
        user_id: currentUserId,
        action: action,
      }, {
        onConflict: 'prayer_id,user_id,action'
      });
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  };

  const goNext = (action: 'prayed' | 'skipped' = 'skipped') => {
    if (current) {
      recordInteraction(current.id, action);
    }
    setHistory((prev) => [...prev, index]);
    setIndex((prev) => Math.min(prev + 1, cards.length));
  };

  const goBack = () => {
    if (history.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevIndex = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setIndex(prevIndex);
    }
  };

  const restart = () => {
    fetchPrayers();
  };

  const chooseReaction = async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (current) {
      await recordInteraction(current.id, key);
    }
    setReactionOpen(false);
    // Auto-advance to next prayer after sending encouragement
    goNext('prayed');
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={["#0D0D0F", "#1A1A1C", "#0D0D0F"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative orbs */}
      <BackgroundOrb color="#C4A574" size={300} top={-50} left={-100} opacity={0.15} />
      <BackgroundOrb color="#A5B4A5" size={250} top={height * 0.4} left={width - 80} opacity={0.1} />
      <BackgroundOrb color="#B4A5C4" size={200} top={height * 0.7} left={-50} opacity={0.12} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 12 },
          headerAnimatedStyle,
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Prayer Wall</Text>
          <Text style={styles.headerSubtitle}>Lift others in prayer</Text>
        </View>

        <View style={styles.headerRight}>
          {history.length > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBack}
              activeOpacity={0.7}
            >
              <Feather name="rotate-ccw" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
          <View style={styles.counterPill}>
            <Feather name="layers" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.counterText}>{countText}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Swipe Instructions */}
      <View style={styles.swipeInstructions}>
        <View style={styles.instructionItem}>
          <Feather name="chevron-left" size={14} color="rgba(255,255,255,0.3)" />
          <Text style={styles.instructionText}>Skip</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={[styles.instructionText, { color: "rgba(196, 165, 116, 0.6)" }]}>Prayed</Text>
          <Feather name="chevron-right" size={14} color="rgba(196, 165, 116, 0.6)" />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C4A574" />
            <Text style={styles.loadingText}>Loading prayers...</Text>
          </View>
        ) : !current ? (
          <EmptyState onRestart={restart} />
        ) : (
          <SwipeablePrayerCard
            key={current.id}
            item={current}
            onPray={() => goNext('prayed')}
            onSkip={() => goNext('skipped')}
            onReact={() => setReactionOpen(true)}
          />
        )}
      </View>

      {/* Anonymous Badge */}
      <Animated.View style={[styles.anonymousBadge, { paddingBottom: insets.bottom + 16 }, headerAnimatedStyle]}>
        <Feather name="eye-off" size={12} color="rgba(196, 165, 116, 0.6)" />
        <Text style={styles.anonymousBadgeText}>All prayers are 100% anonymous</Text>
      </Animated.View>

      {/* Reactions Modal */}
      <Modal
        visible={reactionOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setReactionOpen(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Send Encouragement</Text>
            <Text style={styles.modalSubtitle}>Let them know you're praying</Text>

            <View style={styles.reactionsGrid}>
              {PRESET_REACTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => chooseReaction(r.key)}
                  style={styles.reactionButton}
                  activeOpacity={0.7}
                >
                  <View style={styles.reactionIconContainer}>
                    <Feather name={r.icon as any} size={24} color="#C4A574" />
                  </View>
                  <Text style={styles.reactionLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setReactionOpen(false)}
              style={styles.modalCloseButton}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0F",
  },
  orb: {
    position: "absolute",
    pointerEvents: "none",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerLeft: {},
  headerTitle: {
    fontSize: 32,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  counterText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // Swipe Instructions
  swipeInstructions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  instructionText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },

  // Card
  card: {
    position: "relative",
  },
  cardGlow: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 29,
    opacity: 0.15,
  },
  cardInner: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 24,
  },

  // Swipe Indicators
  swipeIndicator: {
    position: "absolute",
    top: 24,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
  },
  prayIndicator: {
    right: 24,
    backgroundColor: "rgba(196, 165, 116, 0.15)",
    borderColor: "#C4A574",
  },
  skipIndicator: {
    left: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  swipeIndicatorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#C4A574",
    letterSpacing: 1,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 27,
    borderWidth: 1,
  },
  headerInfo: {
    flex: 1,
  },
  displayName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metaText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "500",
  },
  metaDivider: {
    color: "rgba(255,255,255,0.2)",
    marginHorizontal: 6,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 32,
  },
  cardBody: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  quickPrayer: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  quickPrayerLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  quickPrayerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonCenter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionButtonPrimaryText: {
    color: "#1A1A1C",
    fontSize: 15,
    fontWeight: "700",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  emptyButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
  },

  // Anonymous Badge
  anonymousBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 40,
  },
  anonymousBadgeText: {
    color: "rgba(196, 165, 116, 0.6)",
    fontSize: 12,
    fontWeight: "500",
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },
  reactionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  reactionButton: {
    width: (width - 48 - 24) / 3,
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  reactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(196, 165, 116, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  modalCloseButton: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalCloseText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    fontWeight: "600",
  },
});