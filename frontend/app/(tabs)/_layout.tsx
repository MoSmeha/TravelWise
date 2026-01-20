import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Compass, Activity, Plus, Map, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
        className="absolute bottom-0 left-0 right-0 bg-[#f5f5f5] border-t border-gray-200 flex-row px-2 items-center justify-between"
        style={{ paddingBottom: insets.bottom + 10, paddingTop: 12, height: 70 + insets.bottom }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
             if (route.name === 'create') {
                 navigation.navigate(route.name);
             } else {
                navigation.navigate(route.name);
             }
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        if (route.name === 'checklist') return null;

        if (route.name === 'create') {
            return (
                <TouchableOpacity
                    key={route.key}
                    onPress={onPress}
                    className="items-center justify-center -mt-12"
                    activeOpacity={0.8}
                >
                    <View className="bg-[#094772] w-16 h-16 rounded-full items-center justify-center shadow-lg border-[6px] border-[#f5f5f5]">
                        <Plus size={32} color="white" strokeWidth={2.5} />
                    </View>
                </TouchableOpacity>
            );
        }

        let IconComponent = Compass; // Default
        if (route.name === 'index') IconComponent = Compass;
        else if (route.name === 'activity') IconComponent = Activity;
        else if (route.name === 'trips') IconComponent = Map;
        else if (route.name === 'profile') IconComponent = User;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            className="flex-1 items-center justify-center"
          >
            <IconComponent 
                size={26} 
                color={isFocused ? '#094772' : '#9ca3af'} 
                strokeWidth={isFocused ? 2.5 : 2}
            />
            <Text className={`text-[10px] mt-1 font-medium ${isFocused ? 'text-[#094772]' : 'text-gray-400'}`}>
                {options.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
        tabBar={props => <TabBar {...props} />}
        screenOptions={{
            headerShown: false,
        }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
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
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
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
