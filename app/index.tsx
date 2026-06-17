import { Href, Redirect } from 'expo-router';

import { isSupabaseConfigured } from '@/lib/env';
import { useAppStore } from '@/store/appStore';

export default function Index() {
  const { session } = useAppStore();
  if (!isSupabaseConfigured()) return <Redirect href={'/(tabs)' as Href} />;
  return session ? <Redirect href={'/(tabs)' as Href} /> : <Redirect href={'/(auth)/sign-in' as Href} />;
}
