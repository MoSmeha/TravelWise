import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useUserItineraries } from '../../hooks/queries/useItineraries';
import { useAuth } from '../../store/authStore';

export default function ItinerariesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: itineraries, isLoading, refetch, isRefetching } = useUserItineraries();

  const handlePress = (id: string) => {
    router.push({
      pathname: '/map',
      params: { itineraryId: id }
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handlePress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.destination}>{item.country}</Text>
        <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.numberOfDays} Days</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.detailText}>
          💰 Budget: ${item.budgetUSD}
        </Text>
        <Text style={styles.detailText}>
            🎭 Style: {item.travelStyles.join(', ')}
        </Text>
        {item.flightDate && (
             <Text style={styles.dateText}>
                 ✈️ Flight: {new Date(item.flightDate).toLocaleDateString()}
             </Text>
        )}
      </View>
      
      <View style={styles.cardFooter}>
         <Text style={styles.costText}>
             Est. Cost: ${Math.round(item.totalEstimatedCostUSD || item.budgetUSD)}
         </Text>
         <Text style={styles.dateText}>
             Generated {new Date(item.createdAt).toLocaleDateString()}
         </Text>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
      return (
          <View style={styles.centerContainer}>
              <Text style={styles.messageText}>Please log in to view your saved itineraries.</Text>
              <TouchableOpacity style={styles.button} onPress={() => router.push('/auth/login')}>
                  <Text style={styles.buttonText}>Log In</Text>
              </TouchableOpacity>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>My Trips</Text>
      
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={itineraries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No itineraries yet.</Text>
              <Text style={styles.emptySubtext}>Generate your first trip in the Home tab!</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => router.push('/(tabs)')}
              >
                  <Text style={styles.createButtonText}>Plan a Trip</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  destination: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  badge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 12,
  },
  cardBody: {
    marginBottom: 12,
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
      paddingTop: 12,
  },
  costText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#059669',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  messageText: {
      fontSize: 16,
      color: '#666',
      marginBottom: 16,
  },
  button: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
  },
  buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 100,
  },
  emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
      marginBottom: 8,
  },
  emptySubtext: {
      fontSize: 14,
      color: '#666',
      marginBottom: 20,
  },
  createButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
  },
  createButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
  },
});
