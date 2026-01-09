// app/(tabs)/home.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
  ScrollView,
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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type PrayerRequest = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  prayer_count?: number;
};

const PRESET_REACTIONS = [
  { key: "amen", label: "Amen", icon: "heart", color: "#E57373" },
  { key: "praying", label: "Praying", icon: "sunrise", color: "#C4A574" },
  { key: "peace", label: "Peace", icon: "feather", color: "#81C784" },
  { key: "strength", label: "Strength", icon: "shield", color: "#64B5F6" },
  { key: "healing", label: "Healing", icon: "activity", color: "#BA68C8" },
  { key: "guidance", label: "Guidance", icon: "compass", color: "#FFB74D" },
];

// All interaction types we consider as "seen" for filtering
const ALL_INTERACTION_TYPES = [
  "prayed",
  "skipped",
  "saved",
  ...PRESET_REACTIONS.map((r) => r.key),
];

const CATEGORIES_COLORS: Record<string, string> = {
  Personal: "#C4A574",
  Work: "#64B5F6",
  Relationships: "#E57373",
  Family: "#B4A5C4",
  Health: "#81C784",
  Other: "#B4B4B4",
  General: "#B4B4B4",
};

const CATEGORY_ICONS: Record<string, string> = {
  Personal: "user",
  Work: "briefcase",
  Relationships: "heart",
  Family: "home",
  Health: "activity",
  Other: "circle",
  General: "circle",
};

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

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

const SwipeablePrayerCard = ({
  item,
  onPray,
  onSkip,
  onReact,
  onSave,
  isSaved,
}: {
  item: PrayerRequest;
  onPray: () => void;
  onSkip: () => void;
  onReact: () => void;
  onSave: () => void;
  isSaved: boolean;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.95);

  // Feedback shared values
  const prayFlash = useSharedValue(0);
  const prayButtonScale = useSharedValue(1);
  const reactionButtonScale = useSharedValue(1);

  const [isScrolling, setIsScrolling] = useState(false);

  const categoryColor = CATEGORIES_COLORS[item.category || "General"] || "#B4B4B4";
  const categoryIcon = CATEGORY_ICONS[item.category || "General"] || "circle";

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    cardScale.value = 0.92;
    cardOpacity.value = 0;

    cardScale.value = withSpring(1, { damping: 20, stiffness: 200 });
    cardOpacity.value = withTiming(1, { duration: 350 });
  }, [item.id]);

  const triggerHaptic = (type: "light" | "medium" | "success") => {
    if (type === "light") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (type === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const triggerPrayFeedback = () => {
    // Card flash + subtle glow
    prayFlash.value = 0;
    prayFlash.value = withTiming(1, { duration: 150 }, () => {
      prayFlash.value = withTiming(0, { duration: 280 });
    });

    // Primary button pulse
    prayButtonScale.value = 0.9;
    prayButtonScale.value = withSpring(1, { damping: 10, stiffness: 220 });
  };

  const handleSwipeComplete = (direction: "left" | "right") => {
    if (direction === "right") {
      triggerHaptic("success");
      triggerPrayFeedback();
      onPray();
    } else {
      triggerHaptic("light");
      onSkip();
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(!isScrolling)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.1;
    })
    .onEnd(() => {
      const shouldSwipeRight = translateX.value > SWIPE_THRESHOLD;
      const shouldSwipeLeft = translateX.value < -SWIPE_THRESHOLD;

      if (shouldSwipeRight) {
        translateX.value = withTiming(width * 1.3, { duration: 320 });
        translateY.value = withTiming(translateY.value * 2, { duration: 320 });
        cardOpacity.value = withTiming(0, { duration: 280 });
        runOnJS(handleSwipeComplete)("right");
      } else if (shouldSwipeLeft) {
        translateX.value = withTiming(-width * 1.3, { duration: 320 });
        translateY.value = withTiming(translateY.value * 2, { duration: 320 });
        cardOpacity.value = withTiming(0, { duration: 280 });
        runOnJS(handleSwipeComplete)("left");
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-10, 0, 10],
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
    const opacity = interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    const scale = interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.8, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  const skipIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP);
    const scale = interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0.8], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  const prayFlashStyle = useAnimatedStyle(() => {
    return {
      opacity: prayFlash.value,
      transform: [
        {
          scale: interpolate(prayFlash.value, [0, 1], [1, 1.05]),
        },
      ],
    };
  });

  const prayButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: prayButtonScale.value }],
  }));

  const reactionButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reactionButtonScale.value }],
  }));

  const handlePrayPress = () => {
    triggerHaptic("success");
    triggerPrayFeedback();
    translateX.value = withTiming(width * 1.3, { duration: 350 });
    cardOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => onPray(), 260);
  };

  const handleSkipPress = () => {
    triggerHaptic("light");
    translateX.value = withTiming(-width * 1.3, { duration: 350 });
    cardOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => onSkip(), 260);
  };

  const handleReactPress = () => {
    triggerHaptic("light");
    reactionButtonScale.value = 0.9;
    reactionButtonScale.value = withSpring(1, { damping: 10, stiffness: 220 });
    onReact();
  };

  const handleSavePress = () => {
    triggerHaptic("medium");
    onSave();
  };

  const isLongContent = item.body.length > 150;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <Animated.View style={[styles.swipeIndicator, styles.prayIndicator, prayIndicatorStyle]}>
          <View style={styles.swipeIndicatorInner}>
            <Feather name="check" size={18} color="#C4A574" />
            <Text style={styles.swipeIndicatorText}>PRAYED</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.swipeIndicator, styles.skipIndicator, skipIndicatorStyle]}>
          <View style={[styles.swipeIndicatorInner, styles.skipIndicatorInner]}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.swipeIndicatorText, { color: "rgba(255,255,255,0.7)" }]}>SKIP</Text>
          </View>
        </Animated.View>

        {/* Pray flash overlay */}
        <Animated.View pointerEvents="none" style={[styles.prayFlashOverlay, prayFlashStyle]}>
          <LinearGradient
            colors={[categoryColor + "50", "transparent"]}
            style={styles.prayFlashGradient}
          >
            <View style={styles.prayFlashInner}>
              <Feather name="check-circle" size={18} color="#1A1A1C" />
              <Text style={styles.prayFlashText}>Prayer sent</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.cardInner}>
          <LinearGradient
            colors={[categoryColor + "25", "transparent"]}
            style={styles.cardTopGradient}
          />

          <View style={styles.cardTopBar}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + "20" }]}>
              <Feather name={categoryIcon as any} size={12} color={categoryColor} />
              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                {item.category || "General"}
              </Text>
            </View>

            <View style={styles.cardTopBarRight}>
              <View style={styles.timeBadge}>
                <Feather name="clock" size={11} color="rgba(255,255,255,0.4)" />
                <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.bookmarkButton, isSaved && styles.bookmarkButtonActive]}
                onPress={handleSavePress}
                activeOpacity={0.7}
              >
                <Feather
                  name="bookmark"
                  size={16}
                  color={isSaved ? "#C4A574" : "rgba(255,255,255,0.4)"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.anonymousHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={[categoryColor, categoryColor + "80"]} style={styles.avatar}>
                <Feather name="eye-off" size={16} color="#1A1A1C" />
              </LinearGradient>
            </View>
            <View style={styles.anonymousInfo}>
              <Text style={styles.anonymousName}>Anonymous</Text>
              <Text style={styles.anonymousSubtext}>Seeking prayer</Text>
            </View>
          </View>

          <View style={styles.contentArea}>
            {isLongContent ? (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                onScrollBeginDrag={() => setIsScrolling(true)}
                onScrollEndDrag={() => setTimeout(() => setIsScrolling(false), 100)}
                onMomentumScrollEnd={() => setIsScrolling(false)}
                indicatorStyle="white"
              >
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.body}</Text>
                {item.prayer_count && item.prayer_count > 0 && (
                  <View style={styles.prayerCountContainer}>
                    <View style={styles.prayerCountDot} />
                    <Text style={styles.prayerCountText}>
                      {item.prayer_count} {item.prayer_count === 1 ? "person has" : "people have"} prayed
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.body}</Text>
                {item.prayer_count && item.prayer_count > 0 && (
                  <View style={styles.prayerCountContainer}>
                    <View style={styles.prayerCountDot} />
                    <Text style={styles.prayerCountText}>
                      {item.prayer_count} {item.prayer_count === 1 ? "person has" : "people have"} prayed
                    </Text>
                  </View>
                )}
              </View>
            )}
            {isLongContent && (
              <View style={styles.scrollIndicator}>
                <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
                <Feather name="chevron-down" size={12} color="rgba(255,255,255,0.3)" />
              </View>
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSkipPress} activeOpacity={0.7}>
              <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.actionButtonCenter, reactionButtonAnimatedStyle]}
              onPress={handleReactPress}
              activeOpacity={0.7}
            >
              <Feather name="heart" size={18} color="rgba(255,255,255,0.7)" />
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.actionButtonPrimary, { backgroundColor: categoryColor }, prayButtonAnimatedStyle]}
              onPress={handlePrayPress}
              activeOpacity={0.8}
            >
              <Feather name="check" size={18} color="#1A1A1C" />
              <Text style={styles.actionButtonPrimaryText}>I Prayed</Text>
            </AnimatedTouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const EmptyState = ({ onRestart, hasMore }: { onRestart: () => void; hasMore: boolean }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.emptyState, animatedStyle]}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={["rgba(196, 165, 116, 0.2)", "rgba(196, 165, 116, 0.1)"]}
          style={styles.emptyIconGradient}
        >
          <Feather name="check-circle" size={40} color="#C4A574" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>{hasMore ? "All Caught Up!" : "That's all for now"}</Text>
      <Text style={styles.emptySubtitle}>
        {hasMore
          ? "You've prayed through this set of requests.\nTap below to load more."
          : "You've seen every available prayer request.\nNew requests will appear here when they're added."}
      </Text>
      {hasMore && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRestart();
          }}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={16} color="#C4A574" />
          <Text style={styles.emptyButtonText}>Load More Prayers</Text>
        </TouchableOpacity>
      )}
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
  const [savedPrayers, setSavedPrayers] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const insets = useSafeAreaInsets();

  // Track which prayers have been shown this session so we don't re-fetch them
  const seenPrayerIdsRef = useRef<Set<string>>(new Set());

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);

  // Encouragement + pray toasts / glow
  const reactionToast = useSharedValue(0);
  const reactionGlow = useSharedValue(0);
  const prayToast = useSharedValue(0);

  const fetchSavedPrayers = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("prayer_interactions")
        .select("prayer_id")
        .eq("user_id", userId)
        .eq("action", "saved");
      if (error) throw error;
      setSavedPrayers(new Set(data?.map((p) => p.prayer_id) || []));
    } catch (error) {
      console.error("Error fetching saved prayers:", error);
    }
  }, []);

  const fetchPrayers = useCallback(
    async (options?: { resetSeen?: boolean }) => {
      setIsLoading(true);
      try {
        if (options?.resetSeen) {
          seenPrayerIdsRef.current = new Set();
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          await fetchSavedPrayers(user.id);
        }

        const { data: interactedPrayers } = await supabase
          .from("prayer_interactions")
          .select("prayer_id")
          .eq("user_id", user?.id)
          .in("action", ALL_INTERACTION_TYPES);

        const interactedIds = interactedPrayers?.map((p) => p.prayer_id) || [];
        const alreadySeenIds = Array.from(seenPrayerIdsRef.current);
        const excludeIds = [...interactedIds, ...alreadySeenIds];

        let query = supabase
          .from("prayers")
          .select("id, title, body, category, created_at")
          .order("created_at", { ascending: false });

        if (excludeIds.length > 0) {
          query = query.not("id", "in", `(${excludeIds.join(",")})`);
        }
        if (user) {
          query = query.neq("user_id", user.id);
        }

        // Only load 10 at a time
        const { data, error } = await query.limit(10);
        if (error) throw error;

        if (data && data.length > 0) {
          // Random order for this batch
          const shuffled = [...data];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          setCards(shuffled);
          setIndex(0);
          setHistory([]);
          setHasMore(true);

          shuffled.forEach((p) => seenPrayerIdsRef.current.add(p.id));
        } else {
          // No more unseen prayers at all
          setCards([]);
          setIndex(0);
          setHistory([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching prayers:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSavedPrayers]
  );

  useEffect(() => {
    fetchPrayers({ resetSeen: true });
  }, [fetchPrayers]);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const reactionToastStyle = useAnimatedStyle(() => ({
    opacity: reactionToast.value,
    transform: [
      {
        translateY: interpolate(reactionToast.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const reactionGlowStyle = useAnimatedStyle(() => ({
    opacity: reactionGlow.value,
  }));

  const prayToastStyle = useAnimatedStyle(() => ({
    opacity: prayToast.value,
    transform: [
      {
        translateY: interpolate(prayToast.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const current = cards[index] ?? null;
  const countText = useMemo(
    () => (!cards.length ? "0 / 0" : `${Math.min(index + 1, cards.length)} / ${cards.length}`),
    [index, cards.length]
  );
  const progressPercent = useMemo(
    () => (!cards.length ? 0 : (index / cards.length) * 100),
    [index, cards.length]
  );

  const recordInteraction = async (prayerId: string, action: string) => {
    if (!currentUserId) return;
    try {
      await supabase
        .from("prayer_interactions")
        .upsert(
          { prayer_id: prayerId, user_id: currentUserId, action },
          { onConflict: "prayer_id,user_id,action" }
        );
    } catch (error) {
      console.error("Error recording interaction:", error);
    }
  };

  const toggleSave = async (prayerId: string) => {
    if (!currentUserId) return;
    const isSaved = savedPrayers.has(prayerId);
    try {
      if (isSaved) {
        await supabase
          .from("prayer_interactions")
          .delete()
          .eq("prayer_id", prayerId)
          .eq("user_id", currentUserId)
          .eq("action", "saved");
        setSavedPrayers((prev) => {
          const n = new Set(prev);
          n.delete(prayerId);
          return n;
        });
      } else {
        await recordInteraction(prayerId, "saved");
        setSavedPrayers((prev) => new Set(prev).add(prayerId));
      }
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  };

  const goNext = (action: "prayed" | "skipped" = "skipped") => {
    if (current) recordInteraction(current.id, action);
    setHistory((prev) => [...prev, index]);
    setIndex((prev) => Math.min(prev + 1, cards.length));
  };

  const goBack = () => {
    if (history.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIndex(history[history.length - 1]);
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  const handlePrayed = () => {
    // Toast for the basic "I Prayed" action
    prayToast.value = 0;
    prayToast.value = withTiming(1, { duration: 220 });
    setTimeout(() => {
      prayToast.value = withTiming(0, { duration: 350 });
    }, 900);

    goNext("prayed");
  };

  const chooseReaction = async (key: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (current) await recordInteraction(current.id, key);

    // Encouragement toast animation
    reactionToast.value = 0;
    reactionToast.value = withTiming(1, { duration: 220 });
    setTimeout(() => {
      reactionToast.value = withTiming(0, { duration: 350 });
    }, 900);

    // Soft golden glow over the screen for a moment
    reactionGlow.value = 0;
    reactionGlow.value = withTiming(0.45, { duration: 160 }, () => {
      reactionGlow.value = withTiming(0, { duration: 320 });
    });

    setReactionOpen(false);
    goNext("prayed");
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        colors={["#0D0D0F", "#1A1A1C", "#0D0D0F"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <BackgroundOrb color="#C4A574" size={320} top={-80} left={-120} opacity={0.12} />
      <BackgroundOrb color="#A5B4A5" size={280} top={height * 0.35} left={width - 60} opacity={0.08} />
      <BackgroundOrb color="#B4A5C4" size={220} top={height * 0.7} left={-70} opacity={0.1} />

      {/* Encouragement glow overlay */}
      <Animated.View pointerEvents="none" style={[styles.reactionGlowOverlay, reactionGlowStyle]} />

      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headerAnimatedStyle]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Prayer Wall</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Lift others in prayer</Text>
        </View>
        <View style={styles.headerRight}>
          {history.length > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
              <Feather name="rotate-ccw" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
          <View style={styles.counterPill}>
            <Feather name="layers" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.counterText}>{countText}</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <View style={styles.swipeInstructions}>
        <View style={styles.instructionItem}>
          <Feather name="chevron-left" size={14} color="rgba(255,255,255,0.25)" />
          <Text style={styles.instructionText}>Skip</Text>
        </View>
        <View style={styles.instructionDivider} />
        <View style={styles.instructionItem}>
          <Text style={[styles.instructionText, { color: "rgba(196, 165, 116, 0.7)" }]}>Prayed</Text>
          <Feather name="chevron-right" size={14} color="rgba(196, 165, 116, 0.7)" />
        </View>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centerWrapper}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner}>
                <ActivityIndicator size="large" color="#C4A574" />
              </View>
              <Text style={styles.loadingText}>Loading prayers...</Text>
              <Text style={styles.loadingSubtext}>Preparing hearts to connect</Text>
            </View>
          </View>
        ) : !current ? (
          <View style={styles.centerWrapper}>
            <EmptyState onRestart={() => fetchPrayers()} hasMore={hasMore} />
          </View>
        ) : (
          <View style={styles.cardWithToasts}>
            <View style={styles.toastContainer}>
              {/* Encouragement toast (above card, same position) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.toastWrapper, reactionToastStyle]}
              >
                <LinearGradient
                  colors={["rgba(196,165,116,0.25)", "rgba(26,26,28,0.98)"]}
                  style={styles.reactionToastInner}
                >
                  <View style={styles.reactionToastIcon}>
                    <Feather name="heart" size={16} color="#C4A574" />
                  </View>
                  <View>
                    <Text style={styles.reactionToastTitle}>Encouragement sent</Text>
                    <Text style={styles.reactionToastSubtitle}>They’ll see your prayer reaction</Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Basic "I Prayed" toast (same position above card) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.toastWrapper, prayToastStyle]}
              >
                <LinearGradient
                  colors={["rgba(129,199,132,0.25)", "rgba(26,26,28,0.98)"]}
                  style={styles.reactionToastInner}
                >
                  <View style={styles.reactionToastIcon}>
                    <Feather name="check-circle" size={16} color="#81C784" />
                  </View>
                  <View>
                    <Text style={styles.reactionToastTitle}>Marked as prayed</Text>
                    <Text style={styles.reactionToastSubtitle}>
                      Thank you for lifting this up in prayer
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>

            <SwipeablePrayerCard
              key={current.id}
              item={current}
              onPray={handlePrayed}
              onSkip={() => goNext("skipped")}
              onReact={() => setReactionOpen(true)}
              onSave={() => toggleSave(current.id)}
              isSaved={savedPrayers.has(current.id)}
            />
          </View>
        )}
      </View>

      <Animated.View
        style={[
          styles.anonymousBadge,
          { paddingBottom: insets.bottom + 8 },
          headerAnimatedStyle,
        ]}
      >
        <View style={styles.anonymousBadgeInner}>
          <Feather name="shield" size={12} color="rgba(196, 165, 116, 0.7)" />
          <Text style={styles.anonymousBadgeText}>100% Anonymous & Private</Text>
        </View>
      </Animated.View>

      <Modal
        visible={reactionOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setReactionOpen(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Feather name="heart" size={24} color="#C4A574" />
              </View>
              <Text style={styles.modalTitle}>Send Encouragement</Text>
              <Text style={styles.modalSubtitle}>Let them know you're praying for them</Text>
            </View>
            <View style={styles.reactionsGrid}>
              {PRESET_REACTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => chooseReaction(r.key)}
                  style={styles.reactionButton}
                  activeOpacity={0.7}
                >
                  <View style={[styles.reactionIconContainer, { backgroundColor: r.color + "20" }]}>
                    <Feather name={r.icon as any} size={22} color={r.color} />
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
              <Text style={styles.modalCloseText}>Maybe Later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0F" },
  orb: { position: "absolute", pointerEvents: "none" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  headerLeft: {},
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.5 },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(129, 199, 132, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#81C784" },
  liveText: { fontSize: 11, fontWeight: "600", color: "#81C784" },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    fontWeight: "500",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  progressContainer: { paddingHorizontal: 20, paddingVertical: 8 },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#C4A574", borderRadius: 2 },
  swipeInstructions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 6,
    gap: 20,
  },
  instructionItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  instructionText: { fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: "600" },
  instructionDivider: { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.1)" },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 72, // ensures space above the anonymous badge
    justifyContent: "flex-start",
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardWithToasts: {
    width: "100%",
    marginTop: 8,
  },
  toastContainer: {
    position: "relative",
    height: 40,
    marginBottom: 12,
    justifyContent: "flex-end",
  },
  toastWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingContainer: { alignItems: "center", justifyContent: "center", gap: 12 },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(196, 165, 116, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  loadingText: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "600" },
  loadingSubtext: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  card: { width: "100%" },
  cardInner: {
    backgroundColor: "rgba(26, 26, 28, 0.98)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  cardTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: "600" },
  cardTopBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: "500" },
  bookmarkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkButtonActive: {
    backgroundColor: "rgba(196, 165, 116, 0.15)",
    borderColor: "rgba(196, 165, 116, 0.3)",
  },
  swipeIndicator: { position: "absolute", top: 20, zIndex: 10 },
  swipeIndicatorInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(196, 165, 116, 0.2)",
    borderWidth: 1.5,
    borderColor: "#C4A574",
  },
  skipIndicatorInner: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  prayIndicator: { right: 70 },
  skipIndicator: { left: 20 },
  swipeIndicatorText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C4A574",
    letterSpacing: 1,
  },
  anonymousHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  avatarContainer: { marginRight: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  anonymousInfo: {},
  anonymousName: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 2 },
  anonymousSubtext: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "500",
  },
  contentArea: { paddingHorizontal: 20, minHeight: 80, maxHeight: 180 },
  scrollView: { maxHeight: 160 },
  scrollContent: { paddingBottom: 8 },
  scrollIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 8,
  },
  scrollIndicatorText: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 8,
    lineHeight: 26,
  },
  cardBody: { color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 22, fontWeight: "400" },
  prayerCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  prayerCountDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C4A574" },
  prayerCountText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    marginTop: 16,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 25,
  },
  actionButtonPrimaryText: { color: "#1A1A1C", fontSize: 15, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingHorizontal: 40 },
  emptyIconContainer: { marginBottom: 20 },
  emptyIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196, 165, 116, 0.3)",
  },
  emptyTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginBottom: 12 },
  emptySubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: "rgba(196, 165, 116, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(196, 165, 116, 0.3)",
  },
  emptyButtonText: { color: "#C4A574", fontSize: 15, fontWeight: "600" },
  anonymousBadge: { alignItems: "center", paddingHorizontal: 40 },
  anonymousBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(196, 165, 116, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(196, 165, 116, 0.15)",
  },
  anonymousBadgeText: {
    color: "rgba(196, 165, 116, 0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  modalHeader: { alignItems: "center", marginBottom: 24 },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(196, 165, 116, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 6 },
  modalSubtitle: { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center" },
  reactionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  reactionButton: {
    width: (width - 48 - 20) / 3,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  reactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  modalCloseButton: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalCloseText: { color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: "600" },

  // Pray flash overlay styles
  prayFlashOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 70,
    zIndex: 5,
  },
  prayFlashGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  prayFlashInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prayFlashText: {
    color: "#1A1A1C",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Encouragement glow overlay
  reactionGlowOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(196,165,116,0.25)",
  },

  // Toast styles
  reactionToastInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(196,165,116,0.35)",
    backgroundColor: "rgba(26,26,28,0.98)",
  },
  reactionToastIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(196,165,116,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionToastTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  reactionToastSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
});
