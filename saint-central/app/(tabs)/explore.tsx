// app/(tabs)/explore.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

type PrayerRequest = {
  id: string;
  title: string;
  body: string;
  category?: string | null;
  createdAt: string;
  displayName?: string | null;
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

/**
 * How the feed works:
 * - If user is logged in: hide any request they already acted on (next/pray/react)
 * - If user is anonymous: still works, but it can’t reliably filter “already seen” across sessions
 */
async function getAuthedUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function fetchPrayerFeed(): Promise<PrayerRequest[]> {
  const userId = await getAuthedUserId();

  // If logged in, exclude requests that already have an action by this user.
  // This uses a subquery via "not in" pattern using a separate call (simple + reliable in RN).
  let excludedIds: string[] = [];
  if (userId) {
    const { data: acted, error: actedErr } = await supabase
      .from("prayer_actions")
      .select("request_id")
      .eq("user_id", userId)
      .limit(500);

    if (!actedErr && acted) excludedIds = acted.map((x: any) => x.request_id);
  }

  let q = supabase
    .from("prayer_requests")
    .select("id,title,body,category,created_at,display_name")
    .order("created_at", { ascending: false })
    .limit(50);

  if (excludedIds.length) {
    q = q.not("id", "in", `(${excludedIds.map((id) => `"${id}"`).join(",")})`);
  }

  const { data, error } = await q;

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category,
    createdAt: r.created_at,
    displayName: r.display_name,
  }));
}

async function recordAction(opts: {
  requestId: string;
  actionType: "next" | "pray" | "react";
  reactionKey?: string;
}) {
  const userId = await getAuthedUserId();

  // If you REQUIRE auth, replace this with a guard + prompt to login.
  const payload: any = {
    request_id: opts.requestId,
    action_type: opts.actionType,
    reaction_key: opts.reactionKey ?? null,
    user_id: userId, // null allowed if you set it nullable
  };

  const { error } = await supabase.from("prayer_actions").insert(payload);
  if (error) throw error;
}

export default function ExplorePrayerDeck() {
  const [cards, setCards] = useState<PrayerRequest[]>([]);
  const [index, setIndex] = useState(0);

  const [reactionOpen, setReactionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const current = cards[index] ?? null;

  const countText = useMemo(() => {
    if (!cards.length) return "0/0";
    return `${Math.min(index + 1, cards.length)}/${cards.length}`;
  }, [index, cards.length]);

  const load = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      const feed = await fetchPrayerFeed();
      setCards(feed);
      setIndex(0);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setErrMsg(null);
    setRefreshing(true);
    try {
      const feed = await fetchPrayerFeed();
      setCards(feed);
      setIndex(0);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to refresh feed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goNext = async () => {
    if (!current) return;
    try {
      await recordAction({ requestId: current.id, actionType: "next" });
    } catch (e) {
      // keep UX smooth even if logging fails
    }
    setIndex((prev) => Math.min(prev + 1, cards.length));
  };

  const pray = async () => {
    if (!current) return;
    try {
      await recordAction({ requestId: current.id, actionType: "pray" });
    } catch (e) {}
    setIndex((prev) => Math.min(prev + 1, cards.length));
  };

  const restart = () => {
    setIndex(0);
  };

  const chooseReaction = async (key: string) => {
    if (!current) return;
    setReactionOpen(false);
    try {
      await recordAction({ requestId: current.id, actionType: "react", reactionKey: key });
    } catch (e) {}
    // Optional advance after reacting:
    // setIndex((prev) => Math.min(prev + 1, cards.length));
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

          <TouchableOpacity
            onPress={refresh}
            style={styles.topButtonGhost}
            activeOpacity={0.85}
            disabled={refreshing}
          >
            <Text style={styles.topButtonGhostText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
          </TouchableOpacity>
        </View>

        {/* Card */}
        <View style={styles.deckWrap}>
          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator />
              <Text style={[styles.emptySub, { marginTop: 10 }]}>Loading feed…</Text>
            </View>
          ) : errMsg ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Couldn’t load feed</Text>
              <Text style={styles.emptySub}>{errMsg}</Text>

              <TouchableOpacity onPress={load} style={[styles.primary, { marginTop: 14 }]} activeOpacity={0.9}>
                <Text style={styles.primaryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : !current ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>You’re all caught up.</Text>
              <Text style={styles.emptySub}>Check back later or submit one.</Text>

              <TouchableOpacity onPress={refresh} style={[styles.primary, { marginTop: 14 }]} activeOpacity={0.9}>
                <Text style={styles.primaryText}>Refresh feed</Text>
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
                  “Lord, please be near. Give peace, strength, and wisdom. Amen.”
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
            <Text style={[styles.actionBtnSub, { color: "#222" }]}>I’ll pray</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tip}>We’ll add true swipe later once this UI is locked.</Text>
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

// ✅ Your styles unchanged
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 14,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(20,20,26,0.96)",
  },
  modalTitle: { color: "white", fontWeight: "900", fontSize: 18 },
  modalSub: { color: "rgba(255,255,255,0.55)", marginTop: 4, marginBottom: 12 },

  reactionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 6 },
  reactionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reactionText: { color: "rgba(255,255,255,0.9)", fontWeight: "800" },

  modalClose: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  modalCloseText: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },
});
