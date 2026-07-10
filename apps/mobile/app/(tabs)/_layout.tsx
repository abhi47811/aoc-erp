import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b',
          borderTopColor: '#27272a',
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#52525b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan', tabBarIcon: ({ color, size }) => <Ionicons name="scan" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="delivery"
        options={{ title: 'Delivery', tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="measure"
        options={{ title: 'Measure', tabBarIcon: ({ color, size }) => <Ionicons name="resize" size={size} color={color} /> }}
      />
    </Tabs>
  )
}
