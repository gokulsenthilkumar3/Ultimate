import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#01696f',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            dashboard:  'grid-outline',
            expenses:   'wallet-outline',
            recurring:  'refresh-circle-outline',
            budget:     'cash-outline',
            reports:    'bar-chart-outline',
            settings:   'settings-outline',
          };
          const name = (icons[route.name] ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard"  options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="expenses"   options={{ title: 'Expenses' }} />
      <Tabs.Screen name="recurring"  options={{ title: 'Recurring' }} />
      <Tabs.Screen name="budget"     options={{ title: 'Budget' }} />
      <Tabs.Screen name="reports"    options={{ title: 'Reports' }} />
      <Tabs.Screen name="settings"   options={{ title: 'Settings' }} />
    </Tabs>
  );
}
