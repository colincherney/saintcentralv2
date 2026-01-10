// app/(tabs)/ProfileScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  ScrollView,
  Animated as RNAnimated,
  Easing,
  StyleSheet as RNStyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import MaskedView from "@react-native-masked-view/masked-view";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  withSequence,
  withRepeat,
} from "react-native-reanimated";
import { supabase } from "@/supabaseConfig";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get("window");

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Background images B1-B23
const BACKGROUND_IMAGES = [
  require("../../assets/images/B1.webp"),
  require("../../assets/images/B2.webp"),
  require("../../assets/images/B3.webp"),
  require("../../assets/images/B4.webp"),
  require("../../assets/images/B5.webp"),
  require("../../assets/images/B6.webp"),
  require("../../assets/images/B7.webp"),
  require("../../assets/images/B8.webp"),
  require("../../assets/images/B9.webp"),
  require("../../assets/images/B10.webp"),
  require("../../assets/images/B11.webp"),
  require("../../assets/images/B12.webp"),
  require("../../assets/images/B13.webp"),
  require("../../assets/images/B14.webp"),
  require("../../assets/images/B15.webp"),
  require("../../assets/images/B16.webp"),
  require("../../assets/images/B17.webp"),
  require("../../assets/images/B18.webp"),
  require("../../assets/images/B19.webp"),
  require("../../assets/images/B20.webp"),
  require("../../assets/images/B21.webp"),
  require("../../assets/images/B22.webp"),
  require("../../assets/images/B23.webp"),
];

type PrayerRequest = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  prayer_count?: number;
};

const PRESET_REACTIONS = [
  { key: "amen", label: "Sending love", icon: "heart" },
  { key: "praying", label: "Praying with you", icon: "sunrise" },
  { key: "morning", label: "Morning prayer", icon: "sunrise" },
  { key: "night", label: "Night prayer", icon: "moon" },
  { key: "saved_reaction", label: "Saved to pray again", icon: "star" },
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

const PrayerScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [prayed, setPrayed] = useState(false);
  const [reactionsVisible, setReactionsVisible] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(BACKGROUND_IMAGES[0]);
  
  // Backend state
  const [currentPrayer, setCurrentPrayer] = useState<PrayerRequest | null>(null);
  const [prayerQueue, setPrayerQueue] = useState<PrayerRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [savedPrayers, setSavedPrayers] = useState<Set<string>>(new Set());
  const [prayerHistory, setPrayerHistory] = useState<PrayerRequest[]>([]);
  
  // Track which prayers have been shown this session
  const seenPrayerIdsRef = useRef<Set<string>>(new Set());

  // Select random background on mount
  useEffect(() => {
    const selectRandomBackground = async () => {
      const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
      setBackgroundImage(BACKGROUND_IMAGES[randomIndex]);
    };
    selectRandomBackground();
  }, []);

  // Reanimated values for the liquid reactions sheet
  const sheetAnim = useSharedValue(0);
  const wobble = useSharedValue(0);
  const glitter = useSharedValue(0);

  // Reanimated value for the arrow pill
  const arrowAnim = useSharedValue(0);

  // React Native Animated value for the bottom drawer
  const bottomAnim = useRef(new RNAnimated.Value(0)).current;

  // Toast animations
  const reactionToast = useSharedValue(0);
  const reactionGlow = useSharedValue(0);
  const prayToast = useSharedValue(0);

  // Fetch saved prayers
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

  // Fetch prayers from backend
  const fetchPrayers = useCallback(async (options?: { resetSeen?: boolean }) => {
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

      // Get prayers user has already interacted with
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
        .eq("approved", "yes")
        .order("created_at", { ascending: false });

      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }
      if (user) {
        query = query.neq("user_id", user.id);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;

      if (data && data.length > 0) {
        // Shuffle the batch
        const shuffled = [...data];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Set first prayer as current, rest as queue
        setCurrentPrayer(shuffled[0]);
        setPrayerQueue(shuffled.slice(1));
        setHasMore(true);

        shuffled.forEach((p) => seenPrayerIdsRef.current.add(p.id));
      } else {
        setCurrentPrayer(null);
        setPrayerQueue([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching prayers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSavedPrayers]);

  // Record interaction with backend
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

  // Toggle save/bookmark
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await recordInteraction(prayerId, "saved");
        setSavedPrayers((prev) => new Set(prev).add(prayerId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  };

  // Move to next prayer
  const goToNextPrayer = (action: "prayed" | "skipped" = "skipped") => {
    if (currentPrayer) {
      recordInteraction(currentPrayer.id, action);
      setPrayerHistory((prev) => [currentPrayer, ...prev]);
    }

    if (prayerQueue.length > 0) {
      setCurrentPrayer(prayerQueue[0]);
      setPrayerQueue(prayerQueue.slice(1));
      setPrayed(false);
    } else {
      // Queue is empty, fetch more
      fetchPrayers();
      setPrayed(false);
    }
  };

  // Go back to previous prayer
  const goBack = () => {
    if (prayerHistory.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const previous = prayerHistory[0];
      setPrayerQueue((prev) => currentPrayer ? [currentPrayer, ...prev] : prev);
      setCurrentPrayer(previous);
      setPrayerHistory((prev) => prev.slice(1));
      setPrayed(false);
    }
  };

  useEffect(() => {
    fetchPrayers({ resetSeen: true });
  }, [fetchPrayers]);

  const openReactions = () => {
    sheetAnim.value = 0;
    wobble.value = 0;
    glitter.value = 0;
    setReactionsVisible(true);

    sheetAnim.value = withSpring(1, {
      damping: 16,
      stiffness: 140,
      mass: 0.9,
    });

    wobble.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(0, { duration: 200 })
    );

    glitter.value = withRepeat(withTiming(1, { duration: 2200 }), -1, true);
  };

  const closeReactions = () => {
    sheetAnim.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(setReactionsVisible)(false);
      }
    });
    glitter.value = 0;
  };

  const handleMoreReactionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openReactions();
  };

  const handleReactionSelect = async (reactionKey: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (currentPrayer) {
      await recordInteraction(currentPrayer.id, reactionKey);
    }

    // Encouragement toast animation
    reactionToast.value = 0;
    reactionToast.value = withTiming(1, { duration: 220 });
    setTimeout(() => {
      reactionToast.value = withTiming(0, { duration: 350 });
    }, 900);

    // Soft golden glow over the screen
    reactionGlow.value = 0;
    reactionGlow.value = withTiming(0.45, { duration: 160 }, () => {
      reactionGlow.value = withTiming(0, { duration: 320 });
    });

    closeReactions();
    setTimeout(() => {
      goToNextPrayer("prayed");
    }, 400);
  };

  const handlePrayPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrayed(true);

    // Toast for the basic "I Prayed" action
    prayToast.value = 0;
    prayToast.value = withTiming(1, { duration: 220 });
    setTimeout(() => {
      prayToast.value = withTiming(0, { duration: 350 });
    }, 900);

    // Delay moving to next prayer to show the "Prayed" state
    setTimeout(() => {
      goToNextPrayer("prayed");
    }, 800);
  };

  const toggleBottomDrawer = () => {
    const next = !bottomOpen;
    setBottomOpen(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    RNAnimated.timing(bottomAnim, {
      toValue: next ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    arrowAnim.value = withSpring(next ? 1 : 0, {
      damping: 14,
      stiffness: 180,
      mass: 0.9,
    });
  };

  const bottomHeight = bottomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [56, 180],
  });

  const cardsOpacity = bottomAnim;
  const cardsTranslateY = bottomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  // Reanimated styles for the "liquid" reactions sheet
  const sheetStyle = useAnimatedStyle(() => {
    const baseOpacity = interpolate(sheetAnim.value, [0, 1], [0, 1]);
    const translateY = interpolate(
      sheetAnim.value,
      [0, 0.7, 1],
      [80, -6, 0],
      Extrapolation.CLAMP
    );
    const baseScale = interpolate(
      sheetAnim.value,
      [0, 0.7, 1],
      [0.9, 1.05, 1],
      Extrapolation.CLAMP
    );

    const wobbleScale = interpolate(
      wobble.value,
      [0, 1],
      [1, 1.02],
      Extrapolation.CLAMP
    );
    const rotateDeg = interpolate(
      wobble.value,
      [0, 1],
      [0, 1.5],
      Extrapolation.CLAMP
    );

    return {
      opacity: baseOpacity,
      transform: [
        { translateY },
        { scale: baseScale * wobbleScale },
        { rotate: `${rotateDeg}deg` },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(sheetAnim.value, [0, 1], [0, 1]);
    return {
      opacity,
    };
  });

  // Arrow pill style
  const arrowStyle = useAnimatedStyle(() => {
    const scale = interpolate(arrowAnim.value, [0, 1], [1, 1.08], Extrapolation.CLAMP);
    const tilt = interpolate(arrowAnim.value, [0, 1], [0, -6], Extrapolation.CLAMP);
    const translateY = interpolate(arrowAnim.value, [0, 1], [0, -2], Extrapolation.CLAMP);
    const borderOpacity = interpolate(arrowAnim.value, [0, 1], [0.18, 0.4]);

    return {
      transform: [{ scale }, { translateY }, { rotate: `${tilt}deg` }],
      borderColor: `rgba(255,255,255,${borderOpacity})`,
    };
  });

  // Shimmer stripe across the sheet
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      glitter.value,
      [0, 1],
      [-width, width],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      glitter.value,
      [0, 0.5, 1],
      [0, 0.35, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  // Soft "bubble" blobs that pulse
  const bubbleOneStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      glitter.value,
      [0, 0.5, 1],
      [0.95, 1.06, 0.95],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      glitter.value,
      [0, 0.5, 1],
      [0.12, 0.28, 0.12],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const bubbleTwoStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      glitter.value,
      [0, 0.5, 1],
      [1.02, 0.94, 1.02],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      glitter.value,
      [0, 0.5, 1],
      [0.1, 0.24, 0.1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const bubbleThreeStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      glitter.value,
      [0, 0.5, 1],
      [0.98, 1.04, 0.98],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      glitter.value,
      [0, 0.5, 1],
      [0.08, 0.22, 0.08],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

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

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <ImageBackground
          source={backgroundImage}
          style={styles.image}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)", "rgba(0,0,0,0.5)"]}
            locations={[0, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#C4A574" />
            </View>
            <Text style={styles.loadingText}>Loading prayers...</Text>
            <Text style={styles.loadingSubtext}>Preparing hearts to connect</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (!currentPrayer) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <ImageBackground
          source={backgroundImage}
          style={styles.image}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)", "rgba(0,0,0,0.5)"]}
            locations={[0, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />

          <MaskedView
            pointerEvents="none"
            style={[styles.blurWrapper, { height: height * 0.85 }]}
            maskElement={
              <LinearGradient
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]}
                locations={[0, 1]}
              />
            }
          >
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          </MaskedView>

          <View style={styles.mainColumn}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
              <View style={{ width: 38 }} />
              <View style={{ width: 38 }} />
            </View>

            {/* Empty state content */}
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={["rgba(196, 165, 116, 0.2)", "rgba(196, 165, 116, 0.1)"]}
                  style={styles.emptyIconGradient}
                >
                  <Feather name="check-circle" size={40} color="#C4A574" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>
                {hasMore ? "All Caught Up!" : "That's all for now"}
              </Text>
              <Text style={styles.emptyText}>
                {hasMore
                  ? "You've prayed through this set of requests.\nTap below to load more."
                  : "You've seen every available prayer request.\nNew requests will appear here when they're added."}
              </Text>
              {hasMore && (
                <TouchableOpacity
                  style={styles.reloadButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    fetchPrayers({ resetSeen: true });
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={16} color="#C4A574" />
                  <Text style={styles.reloadButtonText}>Load More Prayers</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* BOTTOM DRAWER - Same as main state */}
            <RNAnimated.View
              style={[
                styles.bottomDrawer,
                {
                  height: bottomHeight,
                  paddingBottom: insets.bottom > 0 ? insets.bottom * 0.4 : 8,
                },
              ]}
            >
              {/* CARDS AT TOP */}
              <RNAnimated.View
                style={[
                  styles.bottomCardsWrapper,
                  {
                    opacity: cardsOpacity,
                    transform: [{ translateY: cardsTranslateY }],
                  },
                ]}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bottomScrollContent}
                >
                  <BottomSmallCard 
                    icon="user" 
                    label="Profile"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push("/(tabs)/profile");
                    }}
                  />
                  <BottomSmallCard 
                    icon="edit-3" 
                    label="Post a prayer"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push("/pray");
                    }}
                  />
                </ScrollView>
              </RNAnimated.View>

              {/* TOGGLE ARROW AT BOTTOM */}
              <View style={styles.bottomToggleRow}>
                <TouchableOpacity activeOpacity={0.9} onPress={toggleBottomDrawer}>
                  <Animated.View style={[styles.bottomTogglePill, arrowStyle]}>
                    <Feather
                      name={bottomOpen ? "chevron-down" : "chevron-up"}
                      size={18}
                      color="rgba(255,255,255,0.9)"
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </RNAnimated.View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  const categoryColor = CATEGORIES_COLORS[currentPrayer.category || "General"] || "#B4B4B4";
  const isSaved = savedPrayers.has(currentPrayer.id);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={backgroundImage}
        style={styles.image}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)", "rgba(0,0,0,0.5)"]}
          locations={[0, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        <MaskedView
          pointerEvents="none"
          style={[styles.blurWrapper, { height: height * 0.85 }]}
          maskElement={
            <LinearGradient
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]}
              locations={[0, 1]}
            />
          }
        >
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        </MaskedView>

        {/* Encouragement glow overlay */}
        <Animated.View pointerEvents="none" style={[styles.reactionGlowOverlay, reactionGlowStyle]} />

        {/* MAIN COLUMN */}
        <View style={styles.mainColumn}>
          {/* Header with back button */}
          <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
            {prayerHistory.length > 0 ? (
              <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
                <Feather name="rotate-ccw" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 38 }} />
            )}
            <View style={{ width: 38 }} />
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.centerContent}>
            <Text style={styles.subtitleText}>
              Lift someone up in quiet, private prayer.
            </Text>

            {/* Toast container */}
            <View style={styles.toastContainer}>
              {/* Encouragement toast */}
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
                    <Text style={styles.reactionToastSubtitle}>They'll see your prayer reaction</Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Basic "I Prayed" toast */}
              <Animated.View
                pointerEvents="none"
                style={[styles.toastWrapper, prayToastStyle]}
              >
                <LinearGradient
                  colors={["rgba(156,163,175,0.25)", "rgba(26,26,28,0.98)"]}
                  style={styles.reactionToastInner}
                >
                  <View style={styles.reactionToastIcon}>
                    <Feather name="check-circle" size={16} color="#9CA3AF" />
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

            {/* TAP TO EXPAND PRAYER */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpanded(true);
              }}
              style={styles.glassCardWrapper}
            >
              <BlurView intensity={85} tint="light" style={styles.glassBlur} />
              <View style={styles.glassContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTime}>{timeAgo(currentPrayer.created_at)}</Text>
                  <TouchableOpacity
                    onPress={() => toggleSave(currentPrayer.id)}
                    activeOpacity={0.7}
                    style={styles.bookmarkIconButton}
                  >
                    <Feather
                      name="bookmark"
                      size={14}
                      color={isSaved ? "#C4A574" : "rgba(255,255,255,0.7)"}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardText}>{currentPrayer.body}</Text>

                {currentPrayer.prayer_count && currentPrayer.prayer_count > 0 && (
                  <View style={styles.prayerCountContainer}>
                    <View style={styles.prayerCountDot} />
                    <Text style={styles.prayerCountText}>
                      {currentPrayer.prayer_count}{" "}
                      {currentPrayer.prayer_count === 1 ? "person has" : "people have"} prayed
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePrayPress}
                style={[
                  styles.prayButton,
                  { backgroundColor: categoryColor },
                  prayed && styles.prayButtonDone,
                ]}
              >
                <Text style={styles.prayButtonText}>
                  {prayed ? "Prayed" : "I prayed"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleMoreReactionsPress}
                style={styles.moreButton}
              >
                <BlurView intensity={60} tint="dark" style={styles.moreButtonBlur} />
                <View style={styles.moreButtonContent}>
                  <Text style={styles.moreButtonText}>More reactions</Text>
                  <Feather
                    name="droplet"
                    size={16}
                    color="rgba(255,255,255,0.7)"
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.helperTextContainer}>
              <BlurView intensity={50} tint="dark" style={styles.helperTextBlur} />
              <Text style={styles.helperText}>
                Your response is always 100% anonymous.
              </Text>
            </View>
          </View>

          {/* BOTTOM DRAWER */}
          <RNAnimated.View
            style={[
              styles.bottomDrawer,
              {
                height: bottomHeight,
                paddingBottom: insets.bottom > 0 ? insets.bottom * 0.4 : 8,
              },
            ]}
          >
            {/* CARDS AT TOP */}
            <RNAnimated.View
              style={[
                styles.bottomCardsWrapper,
                {
                  opacity: cardsOpacity,
                  transform: [{ translateY: cardsTranslateY }],
                },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bottomScrollContent}
              >
                <BottomSmallCard 
                  icon="user" 
                  label="Profile"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/profile");
                  }}
                />
                <BottomSmallCard 
                  icon="edit-3" 
                  label="Post a prayer"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/pray");
                  }}
                />
              </ScrollView>
            </RNAnimated.View>

            {/* TOGGLE ARROW AT BOTTOM */}
            <View style={styles.bottomToggleRow}>
              <TouchableOpacity activeOpacity={0.9} onPress={toggleBottomDrawer}>
                <Animated.View style={[styles.bottomTogglePill, arrowStyle]}>
                  <Feather
                    name={bottomOpen ? "chevron-down" : "chevron-up"}
                    size={18}
                    color="rgba(255,255,255,0.9)"
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </RNAnimated.View>
        </View>

        {/* FULL-SCREEN EXPANDED PRAYER OVERLAY */}
        {expanded && (
          <View style={styles.expandOverlay} pointerEvents="auto">
            <BlurView
              intensity={85}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />

            <View
              style={[
                styles.expandInner,
                {
                  paddingTop: insets.top + 12,
                  paddingBottom:
                    (insets.bottom > 0 ? insets.bottom : 12) + 16,
                },
              ]}
            >
              {/* Top row with close button */}
              <View style={styles.expandHeaderRow}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpanded(false)}
                  style={styles.expandCloseButton}
                >
                  <Feather
                    name="x"
                    size={18}
                    color="rgba(255,255,255,0.9)"
                  />
                </TouchableOpacity>
              </View>

              {/* Centered card */}
              <View style={styles.expandCardContainer}>
                <View style={styles.glassCardWrapper}>
                  <BlurView
                    intensity={85}
                    tint="light"
                    style={styles.glassBlur}
                  />
                  <View style={styles.glassContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTime}>{timeAgo(currentPrayer.created_at)}</Text>
                      <TouchableOpacity
                        onPress={() => toggleSave(currentPrayer.id)}
                        activeOpacity={0.7}
                        style={styles.bookmarkIconButton}
                      >
                        <Feather
                          name="bookmark"
                          size={14}
                          color={isSaved ? "#C4A574" : "rgba(255,255,255,0.7)"}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cardText}>{currentPrayer.body}</Text>

                    {currentPrayer.prayer_count && currentPrayer.prayer_count > 0 && (
                      <View style={styles.prayerCountContainer}>
                        <View style={styles.prayerCountDot} />
                        <Text style={styles.prayerCountText}>
                          {currentPrayer.prayer_count}{" "}
                          {currentPrayer.prayer_count === 1 ? "person has" : "people have"} prayed
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Buttons at the bottom */}
              <View style={styles.expandButtonsContainer}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handlePrayPress}
                    style={[
                      styles.prayButton,
                      { backgroundColor: categoryColor },
                      prayed && styles.prayButtonDone,
                    ]}
                  >
                    <Text style={styles.prayButtonText}>
                      {prayed ? "Prayed" : "I prayed"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleMoreReactionsPress}
                    style={styles.moreButton}
                  >
                    <BlurView intensity={60} tint="dark" style={styles.moreButtonBlur} />
                    <View style={styles.moreButtonContent}>
                      <Text style={styles.moreButtonText}>
                        More reactions
                      </Text>
                      <Feather
                        name="droplet"
                        size={16}
                        color="rgba(255,255,255,0.7)"
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={[styles.helperTextContainer, { marginBottom: 4 }]}>
                  <BlurView intensity={50} tint="dark" style={styles.helperTextBlur} />
                  <Text style={styles.helperText}>
                    Your response is always 100% anonymous.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* LIQUID REACTIONS OVERLAY (NO MODAL) */}
        {reactionsVisible && (
          <View style={styles.reactionsOverlay} pointerEvents="auto">
            <Animated.View style={[styles.modalBackdrop, backdropStyle]}>
              <TouchableOpacity
                activeOpacity={1}
                style={StyleSheet.absoluteFill}
                onPress={closeReactions}
              />
            </Animated.View>

            <Animated.View style={[styles.modalSheetWrapper, sheetStyle]}>
              {/* Liquid bubbles */}
              <Animated.View
                pointerEvents="none"
                style={[styles.bubble, styles.bubbleOne, bubbleOneStyle]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.bubble, styles.bubbleTwo, bubbleTwoStyle]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.bubble, styles.bubbleThree, bubbleThreeStyle]}
              />

              {/* Shimmer stripe */}
              <Animated.View
                pointerEvents="none"
                style={[styles.shimmerOverlay, shimmerStyle]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0)",
                    "rgba(255,255,255,0.5)",
                    "rgba(255,255,255,0)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              <BlurView
                intensity={75}
                tint="dark"
                style={styles.modalBlurBackground}
              />
              <View className="handle" style={styles.modalHandle} />
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Reactions</Text>
                <TouchableOpacity
                  onPress={closeReactions}
                  style={styles.modalCloseButton}
                >
                  <Feather
                    name="x"
                    size={18}
                    color="rgba(255,255,255,0.85)"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Choose a way to quietly stand with this request.
              </Text>

              <View style={styles.modalReactionsGrid}>
                {PRESET_REACTIONS.map((reaction) => (
                  <ReactionChip
                    key={reaction.key}
                    icon={reaction.icon}
                    label={reaction.label}
                    large
                    onPress={() => handleReactionSelect(reaction.key)}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        )}
      </ImageBackground>
    </View>
  );
};

const ReactionChip = ({ icon, label, large, onPress }: { 
  icon: string; 
  label: string; 
  large?: boolean;
  onPress?: () => void;
}) => {
  const press = useSharedValue(0);

  const chipStyle = useAnimatedStyle(() => {
    const scale = interpolate(press.value, [0, 1], [1, 0.95], Extrapolation.CLAMP);
    const opacity = interpolate(press.value, [0, 1], [1, 0.9], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const handlePressIn = () => {
    press.value = withTiming(1, { duration: 80 });
  };

  const handlePressOut = () => {
    press.value = withTiming(0, { duration: 120 });
  };

  return (
    <AnimatedTouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.reactionChip, large && styles.reactionChipLarge, chipStyle]}
    >
      <Feather
        name={icon as any}
        size={large ? 16 : 13}
        color="rgba(255,255,255,0.95)"
        style={{ marginRight: 6 }}
      />
      <Text
        style={[
          styles.reactionChipText,
          large && styles.reactionChipTextLarge,
        ]}
      >
        {label}
      </Text>
    </AnimatedTouchableOpacity>
  );
};

const BottomSmallCard = ({ icon, label, onPress }: { 
  icon: string; 
  label: string; 
  onPress?: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.85} style={styles.bottomCard} onPress={onPress}>
    <BlurView intensity={35} tint="dark" style={styles.bottomCardBlur} />
    <View style={styles.bottomCardInner}>
      <Feather name={icon as any} size={17} color="#fff" />
      <Text style={styles.bottomCardText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

export default PrayerScreen;

const CARD_RADIUS = 22;

const styles = RNStyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  image: { flex: 1 },
  mainColumn: { flex: 1 },
  blurWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  header: {
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 80,
    marginTop: 90,
  },

  subtitleText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 30,
    marginBottom: 18,
  },

  toastContainer: {
    position: "relative",
    height: 40,
    marginBottom: 12,
    justifyContent: "flex-end",
    width: "100%",
  },
  toastWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
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

  glassCardWrapper: {
    width: width * 0.9,
    minHeight: 170,
    borderRadius: CARD_RADIUS,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  glassBlur: {
    ...RNStyleSheet.absoluteFillObject,
  },
  glassContent: {
    padding: 18,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },

  bookmarkIconButton: {
    padding: 2,
  },

  cardText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 21,
  },

  prayerCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  prayerCountDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: "#C4A574" 
  },
  prayerCountText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500",
  },

  buttonRow: {
    flexDirection: "row",
    width: width * 0.9,
    gap: 10,
    marginBottom: 12,
  },

  prayButton: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: "#C4A574",
    justifyContent: "center",
    alignItems: "center",
  },
  prayButtonDone: {
    opacity: 0.7,
  },
  prayButtonText: {
    color: "#0B0B0D",
    fontSize: 15,
    fontWeight: "600",
  },

  moreButton: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  moreButtonBlur: {
    ...RNStyleSheet.absoluteFillObject,
  },
  moreButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  moreButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    marginRight: 6,
  },

  helperTextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.2)",
    marginTop: 4,
  },
  helperTextBlur: {
    ...RNStyleSheet.absoluteFillObject,
  },
  helperText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    textAlign: "center",
  },

  // Drawer
  bottomDrawer: {
    width: "100%",
    paddingHorizontal: 18,
    marginBottom: 30,
  },
  bottomToggleRow: {
    alignItems: "center",
    marginTop: 4,
  },

  bottomTogglePill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomCardsWrapper: {
    flex: 1,
    justifyContent: "center",
  },

  bottomScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    gap: 12,
  },

  bottomCard: {
    width: 110,
    height: 70,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  bottomCardBlur: { ...RNStyleSheet.absoluteFillObject },
  bottomCardInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomCardText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },

  // Reactions overlay (absolute, above everything)
  reactionsOverlay: {
    ...RNStyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },

  // Liquid reactions "modal"
  modalBackdrop: {
    ...RNStyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalSheetWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },
  modalBlurBackground: {
    ...RNStyleSheet.absoluteFillObject,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    marginBottom: 10,
    marginTop: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 12,
    marginTop: 6,
  },
  modalReactionsGrid: {
    paddingHorizontal: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 16,
  },

  // Liquid bubbles
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bubbleOne: {
    width: 70,
    height: 70,
    top: 24,
    left: 26,
  },
  bubbleTwo: {
    width: 54,
    height: 54,
    top: 60,
    right: 32,
  },
  bubbleThree: {
    width: 46,
    height: 46,
    top: 120,
    left: width * 0.28,
  },

  // Shimmer overlay
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: width * 0.5,
    opacity: 0,
  },

  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  reactionChipLarge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reactionChipText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 12,
  },
  reactionChipTextLarge: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Expanded full-screen prayer overlay
  expandOverlay: {
    ...RNStyleSheet.absoluteFillObject,
  },
  expandInner: {
    flex: 1,
    paddingHorizontal: 18,
  },
  expandHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  expandCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  expandCardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  expandButtonsContainer: {
    alignItems: "center",
    marginTop: 12,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(196, 165, 116, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingSubtext: { 
    color: "rgba(255,255,255,0.4)", 
    fontSize: 13 
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 120, // Space for bottom drawer
  },
  emptyIconContainer: { 
    marginBottom: 20 
  },
  emptyIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196, 165, 116, 0.3)",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
  },
  reloadButton: {
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
  reloadButtonText: {
    color: "#C4A574",
    fontSize: 15,
    fontWeight: "600",
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
});