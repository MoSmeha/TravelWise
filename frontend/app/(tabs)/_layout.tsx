import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Compass, Activity, Map, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FabOverlay, FabTrigger } from '../../components/navigation/TabBarFab';
import { useUnreadNotificationCount } from '../../hooks/queries/useNotifications';
import { useUnreadMessageCount } from '../../hooks/queries/useMessages';

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get unread counts for badge
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  const totalUnread = unreadNotifications + unreadMessages;
  
  const toggleMenu = () => {
    setIsExpanded(!isExpanded);
  };

  const closeMenu = () => {
    if (isExpanded) {
        setIsExpanded(false);
    }
  };

  const handleCreateTrip = () => {
    closeMenu();
    router.push('/new-trip');
  };

  const handleCreatePost = () => {
    closeMenu();
    router.push('/create-post');
  };

  return (
    <>
      <FabOverlay 
        isExpanded={isExpanded} 
        onClose={closeMenu} 
        onPressTrip={handleCreateTrip} 
        onPressPost={handleCreatePost} 
      />

      <View 
          className="bg-[#f5f5f5] border-t border-gray-200 flex-row px-2 items-center justify-between"
          style={{ 
              paddingBottom: insets.bottom + 10, 
              paddingTop: 12, 
              height: 70 + insets.bottom, 
              zIndex: 50,
              elevation: 50
          }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            if (isExpanded && route.name !== 'create') {
              closeMenu();
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
               if (route.name === 'create') {
                  
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
                  <View key={route.key}>
                      <FabTrigger isExpanded={isExpanded} onToggle={toggleMenu} />
                  </View>
              );
          }

          let IconComponent = Compass;
          if (route.name === 'index') IconComponent = Compass;
          else if (route.name === 'activity') IconComponent = Activity;
          else if (route.name === 'trips') IconComponent = Map;
          else if (route.name === 'profile') IconComponent = User;

          // Check if this is the activity tab and has unread items
          const showBadge = route.name === 'activity' && totalUnread > 0;

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
              <View className="relative">
                <IconComponent 
                    size={26} 
                    color={isFocused ? '#094772' : '#9ca3af'} 
                    strokeWidth={isFocused ? 2.5 : 2}
                />
                {showBadge && (
                  <View 
                    className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1"
                  >
                    <Text className="text-white text-[10px] font-bold">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                )}
              </View>
              <Text className={`text-[10px] mt-1 font-medium ${isFocused ? 'text-[#094772]' : 'text-gray-400'}`}>
                  {options.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

export default function TabLayout() {
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
      
    </Tabs>
  );
}
