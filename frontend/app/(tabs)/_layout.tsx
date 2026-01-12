import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Compass, Activity, Plus, Map, User } from 'lucide-react-native';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarStyle: {
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="create"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/new-trip');
          },
        }}
        options={{
          title: '',
          tabBarIcon: () => (
            <View className="bg-[#11396a] w-16 h-16 rounded-full items-center justify-center -mt-10 shadow-lg border-[6px] border-[#f5f5f5]">
              <Plus size={32} color="white" strokeWidth={2.5} />
            </View>
          ),
          tabBarLabelStyle: { display: 'none' }
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => <Map size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      
      {/* Hidden Screens */}
      <Tabs.Screen 
        name="checklist" 
        options={{ 
            href: null,
        }} 
      />
    </Tabs>
  );
}
