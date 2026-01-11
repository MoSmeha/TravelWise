import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    LayoutAnimation,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { useChecklist } from '../../hooks/queries/useChecklist';
import { useAddChecklistItem, useToggleChecklistItem } from '../../hooks/mutations/useChecklist';
import type { ChecklistItem } from '../../types/api';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function ChecklistScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const itineraryId = params.itineraryId as string;
  
  if (!itineraryId) {
    Alert.alert('Error', 'No itinerary ID provided');
    router.back();
    // Return early to avoid hook errors if itineraryId is missing (though hooks run anyway)
  }

  // React Query Hooks
  const { data: items = [], isLoading, refetch, isRefetching } = useChecklist(itineraryId);
  const toggleMutation = useToggleChecklistItem();
  const addMutation = useAddChecklistItem();

  const [newItemText, setNewItemText] = useState('');
  
  const handleRefresh = () => {
    refetch();
  };

  const toggleItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Trigger mutation
    toggleMutation.mutate({ itemId, isChecked: !item.isChecked });
    // Note: React Query's optimistic updates not fully implemented, relying on fast refetch
    // But we can trigger LayoutAnimation for smoothness
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            {checkedItems} of {totalItems} items packed
          </Text>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
      >
        <View style={styles.content}>
          {sortedCategories.map(category => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.replace('_', ' ')}</Text>
              {groupedItems[category].map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, item.isChecked && styles.itemCardChecked]}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={[styles.checkbox, item.isChecked && styles.checkboxChecked]}>
                    {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, item.isChecked && styles.itemTextChecked]}>
                      {item.item}
                    </Text>
                    {item.reason && (
                      <Text style={styles.itemReason}>{item.reason}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          
          {items.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No checklist items yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Item Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Add a new item..."
          onSubmitEditing={addNewItem}
        />
        <TouchableOpacity
          style={[styles.addButton, (!newItemText.trim() || addMutation.isPending) && styles.addButtonDisabled]}
          onPress={addNewItem}
          disabled={!newItemText.trim() || addMutation.isPending}
        >
          {addMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addButtonText}>+</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 8,
    letterSpacing: 1,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardChecked: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  itemReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    marginTop: -2,
    fontWeight: '300',
  },
});
