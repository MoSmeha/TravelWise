import React from 'react';
import { View, Text } from 'react-native';
import { Utensils, Ticket, Car, Hotel } from 'lucide-react-native';

interface BudgetBreakdown {
  food: number;
  activities: number;
  transport: number;
  accommodation: number;
}

interface BudgetGridProps {
  breakdown: BudgetBreakdown;
}

export const BudgetGrid: React.FC<BudgetGridProps> = ({ breakdown }) => {
  const items = [
    { label: 'Food', amount: breakdown.food, icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50', iconColor: '#ea580c' },
    { label: 'Activities', amount: breakdown.activities, icon: Ticket, color: 'text-purple-600', bg: 'bg-purple-50', iconColor: '#9333ea' },
    { label: 'Transport', amount: breakdown.transport, icon: Car, color: 'text-blue-600', bg: 'bg-blue-50', iconColor: '#2563eb' },
    { label: 'Stays', amount: breakdown.accommodation, icon: Hotel, color: 'text-emerald-600', bg: 'bg-emerald-50', iconColor: '#059669' },
  ];

  return (
    <View className="px-5 mt-6">
      <Text className="text-base font-bold text-gray-900 mb-3 ml-1">Estimated Costs</Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {items.map((item, idx) => (
          <View 
            key={idx} 
            className="w-[48%] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex-row items-center space-x-3"
          >
            <View className={`w-10 h-10 ${item.bg} rounded-full items-center justify-center`}>
              <item.icon size={18} color={item.iconColor} />
            </View>
            <View>
              <Text className="text-gray-500 text-xs font-medium">{item.label}</Text>
              <Text className={`text-sm font-bold ${item.color}`}>${item.amount}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
