import { Tabs } from 'expo-router';
import { BarChart3, Home, Lightbulb, Settings, WalletCards } from 'lucide-react-native';

import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <Home color={color} size={21} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transacoes', tabBarIcon: ({ color }) => <WalletCards color={color} size={21} /> }} />
      <Tabs.Screen name="budgets" options={{ title: 'Orcamentos', tabBarIcon: ({ color }) => <BarChart3 color={color} size={21} /> }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({ color }) => <Lightbulb color={color} size={21} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <Settings color={color} size={21} /> }} />
    </Tabs>
  );
}
