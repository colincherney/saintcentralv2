// app/(tabs)/edit-profile.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { supabase } from '@/supabaseConfig';
import * as Haptics from 'expo-haptics';

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

export default function EditProfileScreen() {
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentEmail(user.email || '');
        setNewEmail(user.email || '');
        setUserId(user.id);
        setIsAnonymous(user.email?.startsWith('anonymous.') || false);
      }
    };
    getUser();

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

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === currentEmail) {
      Alert.alert('No Changes', 'Please enter a different email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    Alert.alert(
      'Update Email',
      `Are you sure you want to update your email to ${newEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setIsUpdatingEmail(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              // Update email in Supabase Auth
              const { error: authError } = await supabase.auth.updateUser({
                email: newEmail,
              });

              if (authError) throw authError;

              // Update email in users table
              if (userId) {
                const { error: dbError } = await supabase
                  .from('users')
                  .update({ email: newEmail })
                  .eq('id', userId);

                if (dbError) throw dbError;
              }

              Alert.alert(
                'Email Updated',
                'Your email has been updated successfully. Please check your new email for a confirmation link.',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/profile') }]
              );
              setCurrentEmail(newEmail);
            } catch (error: any) {
              console.error('Error updating email:', error);
              Alert.alert(
                'Update Failed',
                error.message || 'Failed to update email. Please try again.'
              );
            } finally {
              setIsUpdatingEmail(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // First confirmation
    Alert.alert(
      '⚠️ Delete Account',
      'This action is PERMANENT and cannot be undone. All your data including prayers, interactions, and saved items will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand, Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              '🚨 Final Confirmation',
              'Are you ABSOLUTELY sure? Type "DELETE" in your mind and confirm. This will permanently delete your account and ALL associated data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE MY ACCOUNT',
                  style: 'destructive',
                  onPress: performAccountDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!userId) {
      Alert.alert('Error', 'Unable to identify user. Please try again.');
      return;
    }

    setIsDeletingAccount(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('No active session. Please sign in again.');
      }

      console.log('Calling delete-user function with token...');

      // Use Supabase's built-in functions invoke with explicit headers
      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Function response data:', JSON.stringify(data));
      console.log('Function response error:', JSON.stringify(error));

      if (error) {
        // Try to get more details from the error
        const errorMessage = data?.error || data?.details || error.message || 'Failed to delete account';
        console.error('Function invoke error details:', errorMessage);
        throw new Error(errorMessage);
      }

      // Check if data indicates an error
      if (data && data.error) {
        throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
      }

      console.log('Delete successful:', data);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Sign out locally
      await supabase.auth.signOut();
      
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently deleted.',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error deleting account:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Deletion Failed',
        error.message || 'Failed to delete account. Please contact support.'
      );
    } finally {
      setIsDeletingAccount(false);
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
      <BackgroundOrb color="#B4A5C4" size={250} top={-50} left={-80} opacity={0.12} />
      <BackgroundOrb color="#C4A574" size={200} top={height * 0.6} left={width - 60} opacity={0.1} />

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(tabs)/profile')}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.headerSpacer} />
          </Animated.View>

          {/* Email Section */}
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Email Address</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="Enter new email"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isAnonymous}
                />
              </View>
              
              {isAnonymous && (
                <View style={styles.warningBanner}>
                  <Feather name="alert-circle" size={16} color="#C4A574" />
                  <Text style={styles.warningText}>
                    Anonymous accounts cannot update email. Please create a regular account.
                  </Text>
                </View>
              )}

              {currentEmail !== newEmail && !isAnonymous && (
                <Text style={styles.helperText}>
                  Current: {currentEmail}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.updateButton,
                (isUpdatingEmail || isAnonymous || currentEmail === newEmail) && styles.updateButtonDisabled,
              ]}
              onPress={handleUpdateEmail}
              activeOpacity={0.8}
              disabled={isUpdatingEmail || isAnonymous || currentEmail === newEmail}
            >
              {isUpdatingEmail ? (
                <ActivityIndicator size="small" color="#0D0D0F" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#0D0D0F" />
                  <Text style={styles.updateButtonText}>Update Email</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Danger Zone */}
          <Animated.View
            style={[
              styles.dangerSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.dangerTitle}>Danger Zone</Text>
            <View style={styles.dangerContainer}>
              <View style={styles.dangerInfo}>
                <Feather name="alert-triangle" size={24} color="rgba(255,100,100,0.8)" />
                <View style={styles.dangerTextContainer}>
                  <Text style={styles.dangerHeading}>Delete Account</Text>
                  <Text style={styles.dangerDescription}>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </Text>
                </View>
              </View>

              <View style={styles.dangerWarnings}>
                <View style={styles.warningItem}>
                  <Feather name="x" size={14} color="rgba(255,100,100,0.6)" />
                  <Text style={styles.warningItemText}>All your prayers will be deleted</Text>
                </View>
                <View style={styles.warningItem}>
                  <Feather name="x" size={14} color="rgba(255,100,100,0.6)" />
                  <Text style={styles.warningItemText}>All saved prayers will be removed</Text>
                </View>
                <View style={styles.warningItem}>
                  <Feather name="x" size={14} color="rgba(255,100,100,0.6)" />
                  <Text style={styles.warningItemText}>Prayer history will be erased</Text>
                </View>
                <View style={styles.warningItem}>
                  <Feather name="x" size={14} color="rgba(255,100,100,0.6)" />
                  <Text style={styles.warningItemText}>This cannot be undone</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  isDeletingAccount && styles.deleteButtonDisabled,
                ]}
                onPress={handleDeleteAccount}
                activeOpacity={0.8}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="rgba(255,100,100,0.8)" />
                ) : (
                  <>
                    <Feather name="trash-2" size={18} color="rgba(255,100,100,0.9)" />
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.ScrollView>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 44,
  },

  // Section
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 8,
    marginLeft: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(196, 165, 116, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.2)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(196, 165, 116, 0.9)',
    lineHeight: 18,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#C4A574',
  },
  updateButtonDisabled: {
    backgroundColor: 'rgba(196, 165, 116, 0.3)',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D0D0F',
  },

  // Danger Zone
  dangerSection: {
    marginBottom: 24,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,100,100,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  dangerContainer: {
    backgroundColor: 'rgba(255,100,100,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.12)',
    padding: 20,
  },
  dangerInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  dangerTextContainer: {
    flex: 1,
  },
  dangerHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dangerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  dangerWarnings: {
    gap: 10,
    marginBottom: 20,
    paddingLeft: 4,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  warningItemText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    backgroundColor: 'rgba(255,100,100,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.2)',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,100,100,0.9)',
  },
});