// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

function HapticTab(props: any) {
  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPressIn?.(e);
      }}
      style={({ pressed }) => [
        props.style,
        {
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        // 🔥 Hide the Expo bottom tab bar completely
        tabBarStyle: {
          display: 'none',
        },
        // These won’t really matter visually anymore, but safe to keep
        tabBarActiveTintColor: '#C4A574',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: -4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Feather name="home" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pray"
        options={{
          title: 'Pray',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.prayIconContainer,
                focused && styles.prayIconActive,
              ]}
            >
              <Feather
                name="sunrise"
                size={22}
                color={focused ? '#0D0D0F' : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Feather name="user" size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* Hidden routes still part of tab router, but not directly reachable by tab bar */}
      <Tabs.Screen
        name="saved-prayers"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-prayers"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="reflection"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="write-reflection"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="prayed-for"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="privacy"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    transform: [{ scale: 1.1 }],
  },
  prayIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  prayIconActive: {
    backgroundColor: '#C4A574',
    borderColor: '#C4A574',
  },
});
