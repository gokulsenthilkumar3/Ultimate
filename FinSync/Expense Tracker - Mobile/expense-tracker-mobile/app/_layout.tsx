import { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const { isReady, isAuthenticated, hasPinSetup, initialize } = useAuthStore();
  const segments     = useSegments();
  const router       = useRouter();
  // Guard against multiple in-flight navigations causing a redirect loop
  const isNavigating = useRef(false);

  // initialize is a stable Zustand v4 action reference — empty deps is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (!isReady || isNavigating.current) return;

    const path   = (segments as string[]).join('/');
    const inAuth = path.startsWith('auth');
    const isRoot = segments.length === 0;

    let target: string | null = null;

    if (!hasPinSetup) {
      // First launch — must set up PIN
      if (path !== 'auth/setup') target = '/auth/setup';
    } else if (!isAuthenticated) {
      // Has PIN but not logged in -> Login
      if (path !== 'auth/login' && path !== 'auth/recovery') {
        target = '/auth/login';
      }
    } else {
      // Authenticated — redirect away from auth screens or root
      if (inAuth || isRoot) target = '/(app)/(tabs)/dashboard';
    }

    if (target) {
      isNavigating.current = true;
      router.replace(target as never);
      // Allow next navigation check after transition settles
      setTimeout(() => { isNavigating.current = false; }, 600);
    }
  }, [isReady, isAuthenticated, hasPinSetup, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#01696f" />
      </View>
    );
  }

  return <Slot />;
}
