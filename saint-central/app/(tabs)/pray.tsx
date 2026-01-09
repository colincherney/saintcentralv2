// app/(tabs)/pray.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/supabaseConfig';

const { width, height } = Dimensions.get('window');

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

const CATEGORIES = [
  { key: 'personal', label: 'Personal', icon: 'heart' },
  { key: 'family', label: 'Family', icon: 'home' },
  { key: 'work', label: 'Work', icon: 'briefcase' },
  { key: 'health', label: 'Health', icon: 'activity' },
  { key: 'relationships', label: 'Relationships', icon: 'users' },
  { key: 'other', label: 'Other', icon: 'more-horizontal' },
];

export default function HomeScreen() {
  const [title, setTitle] = useState('');
  const [prayer, setPrayer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isFormValid =
    title.trim().length > 0 && prayer.trim().length > 0 && selectedCategory;

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to submit a prayer.');
        return;
      }

      // Call Supabase Edge Function: submit-prayer
      const { data, error } = await supabase.functions.invoke('submit-prayer', {
        body: {
          title: title.trim(),
          body: prayer.trim(),
          category: selectedCategory,
          user_id: user.id,
        },
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Edge Function error');
      }

      const approved = data?.approved || 'maybe';

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Prayer Submitted',
        approved === 'yes'
          ? 'Your prayer was approved and posted publicly.'
          : approved === 'no'
          ? 'Your prayer was submitted but hidden for safety review.'
          : 'Your prayer is pending human review for safety.'
      );

      setTitle('');
      setPrayer('');
      setSelectedCategory(null);
    } catch (e: any) {
      console.error('Error submitting prayer:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Error',
        e?.message || 'Failed to submit prayer. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
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
      <BackgroundOrb
        color="#C4A574"
        size={250}
        top={-80}
        left={width - 100}
        opacity={0.12}
      />
      <BackgroundOrb
        color="#A5B4A5"
        size={200}
        top={height * 0.5}
        left={-80}
        opacity={0.1}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.headerTitle}>New Prayer</Text>
            <Text style={styles.headerSubtitle}>
              Share your heart with the community
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Give your prayer a title..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            {/* Prayer Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Prayer</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What's on your heart today..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={prayer}
                  onChangeText={setPrayer}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>
              <Text style={styles.charCount}>{prayer.length}/500</Text>
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat.key &&
                        styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.key)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={cat.icon as any}
                      size={18}
                      color={
                        selectedCategory === cat.key
                          ? '#0D0D0F'
                          : 'rgba(255,255,255,0.6)'
                      }
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        selectedCategory === cat.key &&
                          styles.categoryLabelActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Anonymous Notice */}
            <View style={styles.anonymousNotice}>
              <View style={styles.anonymousIconContainer}>
                <Feather name="eye-off" size={18} color="#C4A574" />
              </View>
              <View style={styles.anonymousTextContainer}>
                <Text style={styles.anonymousTitle}>100% Anonymous</Text>
                <Text style={styles.anonymousDescription}>
                  Your identity is always private. No one will ever see your
                  name.
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={!isFormValid || isSubmitting}
            >
              <LinearGradient
                colors={
                  isFormValid && !isSubmitting
                    ? ['#C4A574', '#B89660']
                    : ['#3A3A3C', '#2C2C2E']
                }
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <Text
                    style={[
                      styles.submitText,
                      !isFormValid && styles.submitTextDisabled,
                    ]}
                  >
                    Sharing...
                  </Text>
                ) : (
                  <>
                    <Feather
                      name="send"
                      size={18}
                      color={
                        isFormValid
                          ? '#0D0D0F'
                          : 'rgba(255,255,255,0.3)'
                      }
                    />
                    <Text
                      style={[
                        styles.submitText,
                        !isFormValid && styles.submitTextDisabled,
                      ]}
                    >
                      Share Prayer
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    fontWeight: '500',
  },

  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textAreaContainer: {
    paddingVertical: 16,
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  textArea: {
    height: 140,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'right',
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryButtonActive: {
    backgroundColor: '#C4A574',
    borderColor: '#C4A574',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  categoryLabelActive: {
    color: '#0D0D0F',
  },

  anonymousNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(196, 165, 116, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.15)',
  },
  anonymousIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(196, 165, 116, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousTextContainer: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C4A574',
  },
  anonymousDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    lineHeight: 18,
  },

  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D0F',
  },
  submitTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});
