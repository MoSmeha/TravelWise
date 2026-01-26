import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../store/onboardingStore';

const { width } = Dimensions.get('window');

interface OnboardingPage {
  id: number;
  title: string;
  subtitle: string;
  image: any;
}

const onboardingPages: OnboardingPage[] = [
  {
    id: 1,
    title: 'Discover Hidden Gems',
    subtitle: 'Find secret spots and local favorites that tourists usually miss. Curated by locals and seasoned travelers.',
    image: require('../assets/images/Hidden_Gems-removebg-preview.png'),
  },
  {
    id: 2,
    title: 'Avoid Tourist Traps',
    subtitle: 'Get honest reviews and insights to skip overpriced attractions and find authentic experiences.',
    image: require('../assets/images/Tourist_Traps-removebg-preview.png'),
  },
  {
    id: 3,
    title: 'Join the Community',
    subtitle: 'Connect with fellow travelers, share your discoveries, and get real-time tips from the community.',
    image: require('../assets/images/Community_Features-removebg-preview.png'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (currentPage < onboardingPages.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentPage + 1) * width,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        {/* Skip Button */}
        <View className="absolute top-16 right-6 z-10">
          <TouchableOpacity onPress={handleSkip} className="py-2 px-4">
            <Text className="text-gray-500 font-semibold text-base">Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Pages */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          className="flex-1"
        >
          {onboardingPages.map((page, index) => (
            <OnboardingPageView key={page.id} page={page} />
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View className="px-6 pb-8">
          {/* Pagination Dots */}
          <View className="flex-row justify-center mb-8">
            {onboardingPages.map((_, index) => (
              <PaginationDot key={index} index={index} currentPage={currentPage} />
            ))}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={goToNextPage}
            className="bg-primary py-4 rounded-2xl items-center shadow-lg"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text className="text-white font-bold text-lg">
              {currentPage === onboardingPages.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

interface OnboardingPageViewProps {
  page: OnboardingPage;
}

function OnboardingPageView({ page }: OnboardingPageViewProps) {
  return (
    <View style={{ width }} className="flex-1 px-6 pt-20">
      <View className="flex-1 items-center">
        {/* Image */}
        <View className="w-full aspect-square rounded-3xl overflow-hidden mb-8 shadow-2xl">
          <Image
            source={page.image}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>

        {/* Text Content */}
        <View className="items-center px-4">
          <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
            {page.title}
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            {page.subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

interface PaginationDotProps {
  index: number;
  currentPage: number;
}

function PaginationDot({ index, currentPage }: PaginationDotProps) {
  const isActive = index === currentPage;
  
  return (
    <View
      className={`mx-1 rounded-full transition-all ${
        isActive ? 'w-8 bg-primary' : 'w-2 bg-gray-300'
      }`}
      style={{ height: 8 }}
    />
  );
}
