// app/(tabs)/explore.tsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { authHelpers } from "@/supabaseConfig";

type PrayerRequest = {
  id: string;
  title: string;
  body: string;
  category?: string;
  createdAt: string;
  displayName?: string;
};

const PRESET_REACTIONS = [
  { key: "amen", label: "Amen 🙏" },
  { key: "praying", label: "Praying 🙏" },
  { key: "peace", label: "Peace 🕊️" },
  { key: "strength", label: "Strength 💪" },
  { key: "healing", label: "Healing ❤️‍🩹" },
  { key: "guidance", label: "Guidance ✨" },
];

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

// Mock feed for now (replace with Supabase later)
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

export default function ExplorePrayerDeck() {
  const [cards, setCards] = useState<PrayerRequest[]>(MOCK);
  const [index, setIndex] = useState(0);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const current = cards[index] ?? null;

  const countText = useMemo(() => {
    if (!cards.length) return "0/0";
    return `${Math.min(index + 1, cards.length)}/${cards.length}`;
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
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await authHelpers.signOut();
              router.replace("/");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to log out. Please try again.");
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bg} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Prayer Requests</Text>
            <Text style={styles.subtitle}>Tap Pray or Next • reactions are presets only</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{countText}</Text>
          </View>
        </View>

        {/* Top actions */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => {}} style={styles.topButton} activeOpacity={0.85}>
            <Text style={styles.topButtonText}>+ Submit (soon)</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={restart} style={styles.topButtonGhost} activeOpacity={0.85}>
            <Text style={styles.topButtonGhostText}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLogout} 
            style={styles.logoutButton} 
            activeOpacity={0.85}
            disabled={isLoggingOut}
          >
            <Text style={styles.logoutButtonText}>
              {isLoggingOut ? "..." : "Log Out"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card */}
        <View style={styles.deckWrap}>
          {!current ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>You're all caught up.</Text>
              <Text style={styles.emptySub}>Check back later or submit one.</Text>

              <TouchableOpacity onPress={restart} style={[styles.primary, { marginTop: 14 }]} activeOpacity={0.9}>
                <Text style={styles.primaryText}>Restart feed</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.metaRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(current.displayName?.trim() || "A").slice(0, 1).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{current.displayName?.trim() || "Anonymous"}</Text>
                  <Text style={styles.meta}>
                    {(current.category?.trim() || "General")} • {timeAgo(current.createdAt)}
                  </Text>
                </View>

                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{current.category?.trim() || "General"}</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{current.title}</Text>
              <Text style={styles.cardBody}>{current.body}</Text>

              <View style={styles.quickBox}>
                <Text style={styles.quickTitle}>Quick prayer</Text>
                <Text style={styles.quickBody}>
                  "Lord, please be near. Give peace, strength, and wisdom. Amen."
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            disabled={!current}
            onPress={goNext}
            style={[styles.actionBtn, styles.actionLeft, !current && { opacity: 0.5 }]}
            activeOpacity={0.9}
          >
            <Text style={styles.actionBtnTitle}>Next</Text>
            <Text style={styles.actionBtnSub}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!current}
            onPress={() => setReactionOpen(true)}
            style={[styles.actionBtnMid, !current && { opacity: 0.5 }]}
            activeOpacity={0.9}
          >
            <Text style={styles.actionBtnTitle}>React</Text>
            <Text style={styles.actionBtnSub}>Presets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!current}
            onPress={pray}
            style={[styles.actionBtn, styles.actionRight, !current && { opacity: 0.5 }]}
            activeOpacity={0.9}
          >
            <Text style={[styles.actionBtnTitle, { color: "#111" }]}>Pray</Text>
            <Text style={[styles.actionBtnSub, { color: "#222" }]}>I'll pray</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tip}>We'll add true swipe later once this UI is locked.</Text>
      </View>

      {/* Reactions modal */}
      <Modal visible={reactionOpen} transparent animationType="fade" onRequestClose={() => setReactionOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReactionOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Send a reaction</Text>
            <Text style={styles.modalSub}>Preset-only (no comments)</Text>

            <ScrollView contentContainerStyle={styles.reactionGrid}>
              {PRESET_REACTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => chooseReaction(r.key)}
                  style={styles.reactionPill}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reactionText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity onPress={() => setReactionOpen(false)} style={styles.modalClose} activeOpacity={0.85}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050507" },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#050507" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  title: { color: "white", fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontSize: 13 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700" },

  topRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  topButton: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topButtonText: { color: "white", fontWeight: "700" },
  topButtonGhost: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topButtonGhostText: { color: "rgba(255,255,255,0.8)", fontWeight: "700" },
  logoutButton: {
    marginLeft: "auto",
    backgroundColor: "rgba(255,100,100,0.15)",
    borderColor: "rgba(255,100,100,0.3)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoutButtonText: { color: "rgba(255,100,100,0.9)", fontWeight: "700" },

  deckWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
  },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  avatarText: { color: "white", fontWeight: "800", fontSize: 18 },
  name: { color: "white", fontSize: 18, fontWeight: "800" },
  meta: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 },

  categoryPill: {
    marginLeft: "auto",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryPillText: { color: "rgba(255,255,255,0.85)", fontWeight: "800", fontSize: 12 },

  cardTitle: { color: "white", fontSize: 30, fontWeight: "900", letterSpacing: -0.6, marginTop: 2 },
  cardBody: { color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 21, marginTop: 10 },

  quickBox: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.18)",
    padding: 14,
  },
  quickTitle: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 14, marginBottom: 6 },
  quickBody: { color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 18 },

  bottomRow: { flexDirection: "row", gap: 12, marginTop: 12, justifyContent: "center" },
  actionBtn: {
    flex: 1,
    maxWidth: 150,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  actionLeft: { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.14)" },
  actionRight: { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "rgba(255,255,255,0.12)" },
  actionBtnMid: {
    flex: 1,
    maxWidth: 140,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  actionBtnTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  actionBtnSub: { color: "rgba(255,255,255,0.60)", fontWeight: "700", fontSize: 12, marginTop: 2 },

  tip: { color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 10, fontSize: 12 },

  empty: { alignItems: "center", paddingHorizontal: 20 },
  emptyTitle: { color: "white", fontWeight: "900", fontSize: 18 },
  emptySub: { color: "rgba(255,255,255,0.6)", marginTop: 6, textAlign: "center" },
  primary: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryText: { color: "white", fontWeight: "800" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "flex-end", padding: 14 },
  modalSheet: { width: "100%", maxWidth: 520, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(20,20,26,0.96)" },
  modalTitle: { color: "white", fontWeight: "900", fontSize: 18 },
  modalSub: { color: "rgba(255,255,255,0.55)", marginTop: 4, marginBottom: 12 },

  reactionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 6 },
  reactionPill: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, paddingVertical: 10 },
  reactionText: { color: "rgba(255,255,255,0.9)", fontWeight: "800" },

  modalClose: { marginTop: 12, alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)" },
  modalCloseText: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },
});