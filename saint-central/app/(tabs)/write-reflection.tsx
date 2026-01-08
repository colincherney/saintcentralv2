// app/(tabs)/write-reflection.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/supabaseConfig';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';

export default function WriteReflectionScreen() {
  const params = useLocalSearchParams();
  const { prayerId, reflectionId, existingContent, mode, title, body, category, createdAt } = params;
  
  const [content, setContent] = useState((existingContent as string) || '');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const isEditing = mode === 'edit';

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();

    // Auto-focus input
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Empty Reflection', 'Please write something before saving.');
      return;
    }
    if (!currentUserId) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isEditing) {
        // Update existing reflection
        const { error } = await supabase
          .from('reflections')
          .update({ content: content.trim() })
          .eq('id', reflectionId as string)
          .eq('user_id', currentUserId);

        if (error) throw error;
      } else {
        // Create new reflection
        const { error } = await supabase
          .from('reflections')
          .insert({
            prayer_id: prayerId as string,
            user_id: currentUserId,
            content: content.trim(),
          });

        if (error) throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/(tabs)/reflection',
        params: {
          prayerId: prayerId as string,
          title: title as string,
          body: body as string,
          category: category as string,
          createdAt: createdAt as string,
        },
      });
    } catch (error) {
      console.error('Error saving reflection:', error);
      Alert.alert('Error', 'Failed to save reflection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (content.trim() && content !== existingContent) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Writing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/(tabs)/reflection',
                params: {
                  prayerId: prayerId as string,
                  title: title as string,
                  body: body as string,
                  category: category as string,
                  createdAt: createdAt as string,
                },
              });
            },
          },
        ]
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(tabs)/reflection',
        params: {
          prayerId: prayerId as string,
          title: title as string,
          body: body as string,
          category: category as string,
          createdAt: createdAt as string,
        },
      });
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

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

      {/* Header */}
      <Animated.View 
        entering={FadeIn.duration(300)}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Feather name="x" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Feather name="edit-3" size={18} color="#C4A574" />
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Reflection' : 'New Reflection'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!content.trim() || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!content.trim() || isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#1A1A1C" />
          ) : (
            <Feather name="check" size={20} color="#1A1A1C" />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Input Area */}
      <Animated.View entering={SlideInUp.delay(100).springify()} style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="What's on your heart today?&#10;&#10;Share your thoughts, prayers, gratitude, or reflections..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={1000}
          textAlignVertical="top"
        />
      </Animated.View>

      {/* Footer Stats */}
      <Animated.View 
        entering={FadeIn.delay(200)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Feather name="type" size={12} color="rgba(255,255,255,0.3)" />
            <Text style={styles.statText}>{wordCount} words</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="file-text" size={12} color="rgba(255,255,255,0.3)" />
            <Text style={styles.statText}>{content.length}/1000</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Take your time. This is your sacred space. 🙏
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  cancelButton: {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C4A574',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(196, 165, 116, 0.3)',
  },

  // Input
  inputContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '400',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});