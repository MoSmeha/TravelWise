import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    LayoutAnimation,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useChecklist } from '../hooks/queries/useChecklist';
import { useAddChecklistItem, useToggleChecklistItem, useDeleteChecklistItem, useDeleteAllChecklistItems } from '../hooks/mutations/useChecklist';
import { useItineraryStore } from '../store/itineraryStore';
import type { ChecklistItem } from '../types/api';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function ChecklistScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Get itineraryId from params OR from the store (fallback for tab navigation)
  const storeItineraryId = useItineraryStore((state) => state.activeItineraryId);
  const itineraryId = (params.itineraryId as string) || storeItineraryId;
  
  // React Query Hooks
  const { data: items = [], isLoading, refetch, isRefetching } = useChecklist(itineraryId || '');
  const toggleMutation = useToggleChecklistItem();
  const addMutation = useAddChecklistItem();
  const deleteMutation = useDeleteChecklistItem();
  const deleteAllMutation = useDeleteAllChecklistItems();

  const [newItemText, setNewItemText] = useState('');

  if (!itineraryId) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-400 text-base">No itinerary selected.</Text>
        <Text className="text-gray-300 text-sm mt-2 text-center">Generate an itinerary first to see your checklist.</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} className="mt-5 bg-primary px-6 py-3 rounded-lg">
          <Text className="text-white text-base font-semibold">Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const handleRefresh = () => {
    refetch();
  };

  const toggleItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Trigger mutation
    toggleMutation.mutate({ itemId, isChecked: !item.isChecked });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${itemName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(itemId, {
              onSuccess: () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              },
              onError: () => {
                Alert.alert('Error', 'Failed to delete item');
              }
            });
          }
        }
      ]
    );
  };

  const handleDeleteAll = () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'There are no items to delete.');
      return;
    }

    Alert.alert(
      'Delete All Items',
      `Are you sure you want to delete all ${items.length} items? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            deleteAllMutation.mutate(itineraryId, {
              onSuccess: () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              },
              onError: () => {
                Alert.alert('Error', 'Failed to delete items');
              }
            });
          }
        }
      ]
    );
  };

  const addNewItem = () => {
    if (!newItemText.trim()) return;

    const text = newItemText.trim();
    setNewItemText('');

    addMutation.mutate({ 
      itineraryId, 
      item: text 
    }, {
      onSuccess: () => {
         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      },
      onError: () => {
        Alert.alert('Error', 'Failed to add item');
        setNewItemText(text); // Restore text
      }
    });
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'OTHER';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Category order
  const CATEGORY_ORDER = ['ESSENTIALS', 'DOCUMENTATION', 'WEATHER', 'ACTIVITY', 'SAFETY', 'PERSONAL', 'OTHER'];
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  const totalItems = items.length;
  const checkedItems = items.filter(i => i.isChecked).length;
  const progress = totalItems > 0 ? checkedItems / totalItems : 0;

  if (isLoading && !isRefetching) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff', zIndex: 10 }}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <TouchableOpacity 
            className="w-10 h-10 justify-center items-start"
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Trip Checklist</Text>
          <TouchableOpacity 
            className="w-10 h-10 justify-center items-end"
            onPress={handleDeleteAll}
            disabled={deleteAllMutation.isPending || items.length === 0}
          >
            {deleteAllMutation.isPending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Trash2 size={22} color={items.length === 0 ? "#D1D5DB" : "#EF4444"} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Progress Bar */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-500 font-semibold">
            {checkedItems} of {totalItems} items packed
          </Text>
          <Text className="text-sm text-primary font-bold">{Math.round(progress * 100)}%</Text>
        </View>
        <View className="h-2 bg-gray-200 rounded overflow-hidden">
          <View className="h-full bg-primary rounded" style={{ width: `${progress * 100}%` }} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
      >
        <View className="p-4 pb-20">
          {sortedCategories.map(category => (
            <View key={category} className="mb-5">
              <Text className="text-sm font-bold text-gray-400 mb-2 tracking-wide">{category.replace('_', ' ')}</Text>
              {groupedItems[category].map(item => (
                <View
                  key={item.id}
                  className={`bg-white rounded-xl mb-2 flex-row items-center shadow-sm overflow-hidden ${item.isChecked ? 'opacity-80 bg-gray-50' : ''}`}
                >
                  <TouchableOpacity
                    className="flex-1 flex-row items-center p-4"
                    onPress={() => toggleItem(item.id)}
                  >
                    <View className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${item.isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.isChecked && <Text className="text-white text-sm font-bold">✓</Text>}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-base font-medium ${item.isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.item}
                      </Text>
                      {item.reason && (
                        <Text className="text-xs text-gray-500 mt-0.5">{item.reason}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="px-4 py-4"
                    onPress={() => handleDeleteItem(item.id, item.item)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
          
          {items.length === 0 && (
            <View className="p-10 items-center">
              <Text className="text-gray-400 text-base">No checklist items yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Item Input */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row items-center gap-3">
        <TextInput
          className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-base"
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Add a new item..."
          onSubmitEditing={addNewItem}
        />
        <TouchableOpacity
          className={`w-11 h-11 rounded-full items-center justify-center ${(!newItemText.trim() || addMutation.isPending) ? 'bg-gray-300' : 'bg-primary'}`}
          onPress={addNewItem}
          disabled={!newItemText.trim() || addMutation.isPending}
        >
          {addMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white text-2xl font-light" style={{ marginTop: -2 }}>+</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
