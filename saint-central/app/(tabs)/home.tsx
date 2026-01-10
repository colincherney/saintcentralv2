// app/(tabs)/ProfileScreen.tsx
import React, { useState, useRef } from "react";
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

const { width, height } = Dimensions.get("window");

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const PrayerScreen = () => {
  const insets = useSafeAreaInsets();
  const [prayed, setPrayed] = useState(false);
  const [reactionsVisible, setReactionsVisible] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // full-screen prayer

  // Reanimated values for the liquid reactions sheet
  const sheetAnim = useSharedValue(0);
  const wobble = useSharedValue(0);
  const glitter = useSharedValue(0); // shimmer / bubbles

  // Reanimated value for the arrow pill
  const arrowAnim = useSharedValue(0);

  // React Native Animated value for the bottom drawer
  const bottomAnim = useRef(new RNAnimated.Value(0)).current;

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
    openReactions(); // keep expanded state as-is
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
    outputRange: [56, 140],
  });

  const cardsOpacity = bottomAnim;
  const cardsTranslateY = bottomAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
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

  // Soft “bubble” blobs that pulse
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={require("../../assets/images/PrayerScreen.jpg")}
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

        {/* MAIN COLUMN */}
        <View style={styles.mainColumn}>
          {/* Header (empty, dots removed) */}
          <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
            <View style={{ width: 38 }} />
            <View style={{ width: 38 }} />
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.centerContent}>
            <Text style={styles.subtitleText}>
              Lift someone up in quiet, private prayer.
            </Text>

            {/* TAP TO EXPAND PRAYER */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpanded(true);
              }}
              style={styles.glassCardWrapper}
            >
              <BlurView intensity={45} tint="light" style={styles.glassBlur} />
              <View style={styles.glassContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTime}>2 hours ago</Text>
                  <Feather
                    name="shield"
                    size={14}
                    color="rgba(255,255,255,0.7)"
                  />
                </View>

                <Text style={styles.cardText}>
                  Please pray for peace and calm in my mind. I’ve been feeling
                  anxious and overwhelmed and I’m asking for strength and clarity.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setPrayed(true);
                }}
                style={[styles.prayButton, prayed && styles.prayButtonDone]}
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
                <Text style={styles.moreButtonText}>More reactions</Text>
                <Feather
                  name="droplet"
                  size={16}
                  color="rgba(255,255,255,0.7)"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Your response is always 100% anonymous.
            </Text>
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
            {/* TOGGLE ARROW */}
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

            {/* ONLY TWO BOXES */}
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
                <BottomSmallCard icon="user" label="Profile" />
                <BottomSmallCard icon="edit-3" label="Post a prayer" />
              </ScrollView>
            </RNAnimated.View>
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
                    intensity={65}
                    tint="light"
                    style={styles.glassBlur}
                  />
                  <View style={styles.glassContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTime}>2 hours ago</Text>
                      <Feather
                        name="shield"
                        size={14}
                        color="rgba(255,255,255,0.7)"
                      />
                    </View>

                    <Text style={styles.cardText}>
                      Please pray for peace and calm in my mind. I’ve been
                      feeling anxious and overwhelmed and I’m asking for
                      strength and clarity.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Buttons at the bottom */}
              <View style={styles.expandButtonsContainer}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Medium
                      );
                      setPrayed(true);
                    }}
                    style={[
                      styles.prayButton,
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
                    <Text style={styles.moreButtonText}>
                      More reactions
                    </Text>
                    <Feather
                      name="droplet"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.helperText, { marginBottom: 4 }]}>
                  Your response is always 100% anonymous.
                </Text>
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
                <ReactionChip icon="heart" label="Sending love" large />
                <ReactionChip icon="hands" label="Praying with you" large />
                <ReactionChip icon="sunrise" label="Morning prayer" large />
                <ReactionChip icon="moon" label="Night prayer" large />
                <ReactionChip icon="star" label="Saved to pray again" large />
              </View>
            </Animated.View>
          </View>
        )}
      </ImageBackground>
    </View>
  );
};

const ReactionChip = ({ icon, label, large }) => {
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
      style={[styles.reactionChip, large && styles.reactionChipLarge, chipStyle]}
    >
      <Feather
        name={icon}
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

const BottomSmallCard = ({ icon, label }) => (
  <TouchableOpacity activeOpacity={0.85} style={styles.bottomCard}>
    <BlurView intensity={35} tint="dark" style={styles.bottomCardBlur} />
    <View style={styles.bottomCardInner}>
      <Feather name={icon} size={17} color="#fff" />
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

  centerContent: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
  },

  subtitleText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
  },

  glassCardWrapper: {
    width: width * 0.9,
    minHeight: 170,
    borderRadius: CARD_RADIUS,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
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

  cardText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 21,
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
    backgroundColor: "#9A8358",
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
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  moreButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    marginRight: 6,
  },

  helperText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  // Drawer
  bottomDrawer: {
    width: "100%",
    paddingHorizontal: 18,
  },
  bottomToggleRow: {
    alignItems: "center",
    marginBottom: 4,
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
});
