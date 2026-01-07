// app/(tabs)/explore.tsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { authHelpers } from "@/supabaseConfig";

const { width, height } = Dimensions.get("window");

type PrayerRequest = {
  id: string;
  title: string;
  body: string;
  category?: string;
  createdAt: string;
  displayName?: string;
};

const PRESET_REACTIONS = [
  { key: "amen", label: "Amen", icon: "heart" },
  { key: "praying", label: "Praying", icon: "sun" },
  { key: "peace", label: "Peace", icon: "feather" },
  { key: "strength", label: "Strength", icon: "shield" },
  { key: "healing", label: "Healing", icon: "heart" },
  { key: "guidance", label: "Guidance", icon: "compass" },
];

const CATEGORIES_COLORS: Record<string, string> = {
  Work: "#C4A574",
  Relationships: "#A5B4A5",
  Family: "#B4A5C4",
  Health: "#A5C4B4",
  General: "#B4B4B4",
};

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// Mock feed
const MOCK: PrayerRequest[] = [
  {
    id: "1",
    displayName: "David",
    category: "Work",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    title: "Anxiety + job interview",
    body: "I'm interviewing Friday. Prayers for calm, clarity, and the right doors to open.",
  },
  {
    id: "2",
    displayName: "Sophia",
    category: "Relationships",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    title: "Friendship healing",
    body: "I want to reconcile with a close friend. Pray for humility, courage, and wise words.",
  },
  {
    id: "3",
    displayName: "Anonymous",
    category: "Family",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    title: "Family peace",
    body: "Please pray for unity and patience in our home this week.",
  },
];

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

// Animated card component
const PrayerCard = ({ 
  item, 
  onPray, 
  onNext, 
  onReact 
}: { 
  item: PrayerRequest; 
  onPray: () => void; 
  onNext: () => void;
  onReact: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const categoryColor = CATEGORIES_COLORS[item.category || "General"] || "#B4B4B4";

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [item.id]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Card glow effect */}
      <View style={[styles.cardGlow, { backgroundColor: categoryColor }]} />
      
      {/* Card content */}
      <View style={styles.cardInner}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[categoryColor, categoryColor + "80"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {(item.displayName?.trim() || "A").slice(0, 1).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={[styles.avatarRing, { borderColor: categoryColor + "40" }]} />
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.displayName}>
              {item.displayName?.trim() || "Anonymous"}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              <Text style={styles.metaText}>{item.category || "General"}</Text>
              <Text style={styles.metaDivider}>·</Text>
              <Text style={styles.metaText}>{timeAgo(item.createdAt)}</Text>
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
          <Feather name="sun" size={14} color="rgba(255,255,255,0.2)" />
          <View style={styles.dividerLine} />
        </View>

        {/* Quick Prayer */}
        <View style={styles.quickPrayer}>
          <Text style={styles.quickPrayerLabel}>A prayer for them</Text>
          <Text style={styles.quickPrayerText}>
            "Lord, be near to {item.displayName || "them"}. Grant peace, strength, and Your guiding light. Amen."
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onNext}
            activeOpacity={0.8}
          >
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.actionButtonText}>Next</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButtonCenter}
            onPress={onReact}
            activeOpacity={0.8}
          >
            <Feather name="heart" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButtonPrimary, { backgroundColor: categoryColor }]}
            onPress={onPray}
            activeOpacity={0.9}
          >
            <Feather name="sun" size={18} color="#1A1A1C" />
            <Text style={styles.actionButtonPrimaryText}>I Prayed</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// Empty state component
const EmptyState = ({ onRestart }: { onRestart: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <View style={styles.emptyIconContainer}>
        <Feather name="check-circle" size={48} color="rgba(255,255,255,0.3)" />
      </View>
      <Text style={styles.emptyTitle}>All caught up</Text>
      <Text style={styles.emptySubtitle}>
        You've prayed through all requests.{"\n"}Check back later for more.
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={onRestart}
        activeOpacity={0.8}
      >
        <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.8)" />
        <Text style={styles.emptyButtonText}>Start Over</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ExplorePrayerDeck() {
  const [cards, setCards] = useState<PrayerRequest[]>(MOCK);
  const [index, setIndex] = useState(0);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

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

  const current = cards[index] ?? null;

  const countText = useMemo(() => {
    if (!cards.length) return "0 / 0";
    return `${Math.min(index + 1, cards.length)} / ${cards.length}`;
  }, [index, cards.length]);

  const goNext = () => {
    if (!current) return;
    setIndex((prev) => Math.min(prev + 1, cards.length));
  };

  const pray = () => {
    if (!current) return;
    setIndex((prev) => Math.min(prev + 1, cards.length));
  };

  const restart = () => {
    setIndex(0);
    setCards(MOCK);
  };

  const chooseReaction = (key: string) => {
    setReactionOpen(false);
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await authHelpers.signOut();
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
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
          { 
            paddingTop: insets.top + 12,
            opacity: headerFade,
            transform: [{ translateY: headerSlide }],
          }
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Prayer Wall</Text>
          <Text style={styles.headerSubtitle}>Lift others in prayer</Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.counterPill}>
            <Feather name="layers" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.counterText}>{countText}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={isLoggingOut}
          >
            <Feather 
              name="log-out" 
              size={18} 
              color={isLoggingOut ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.5)"} 
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.content}>
        {!current ? (
          <EmptyState onRestart={restart} />
        ) : (
          <PrayerCard
            key={current.id}
            item={current}
            onPray={pray}
            onNext={goNext}
            onReact={() => setReactionOpen(true)}
          />
        )}
      </View>

      {/* Bottom hint */}
      <Animated.View style={[styles.bottomHint, { paddingBottom: insets.bottom + 16, opacity: headerFade }]}>
        <View style={styles.hintLine} />
        <Text style={styles.hintText}>Swipe or tap to navigate</Text>
        <View style={styles.hintLine} />
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
                  activeOpacity={0.8}
                >
                  <Feather name={r.icon as any} size={20} color="rgba(255,255,255,0.8)" />
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
    </View>
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
    paddingBottom: 16,
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
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
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
  avatarText: {
    color: "#1A1A1C",
    fontSize: 20,
    fontWeight: "700",
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

  // Bottom Hint
  bottomHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  hintLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    maxWidth: 60,
  },
  hintText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    fontWeight: "500",
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
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
    gap: 12,
    marginBottom: 24,
  },
  reactionButton: {
    width: (width - 48 - 24) / 3 - 1,
    aspectRatio: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  reactionLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  modalCloseButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  modalCloseText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
    fontWeight: "600",
  },
});