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
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

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

        <View className="absolute top-16 right-6 z-10">
          <TouchableOpacity onPress={handleSkip} className="py-2 px-4">
            <Text className="text-gray-500 font-semibold text-base">Skip</Text>
          </TouchableOpacity>
        </View>


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


        <View className="px-6 pb-8">

          <View className="flex-row justify-center mb-8">
            {onboardingPages.map((_, index) => (
              <PaginationDot key={index} index={index} currentPage={currentPage} />
            ))}
          </View>


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

function BlobBackground() {
  return (
    <View className="absolute inset-0 items-center justify-center">
      <Svg height="100%" width="100%" viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#E0E7FF" stopOpacity="1" />
            <Stop offset="1" stopColor="#EEF2FF" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path
          fill="url(#grad)"
          d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-18,88.8,-3.3C87.5,11.4,82.2,25.3,73.1,36.4C64,47.5,51.1,55.8,38.1,62.1C25.1,68.4,12,72.7,-0.4,73.3C-12.8,73.9,-26,70.8,-37.6,63.9C-49.2,57,-59.2,46.3,-66.3,34.1C-73.4,21.9,-77.6,8.2,-75.6,-4.2C-73.6,-16.6,-65.4,-27.7,-55.8,-36.8C-46.2,-45.9,-35.2,-53,-23.4,-61.6C-11.6,-70.2,1.1,-80.3,14.2,-82.1"
          transform="translate(100 100)"
        />
      </Svg>
    </View>
  );
}

function OnboardingPageView({ page }: OnboardingPageViewProps) {
  return (
    <View style={{ width }} className="flex-1 px-6 pt-20">
      <View className="flex-1 items-center">

        <View className="w-full aspect-square justify-center items-center mb-8 relative">
          <BlobBackground />
          <Image
            source={page.image}
            className="w-[90%] h-[90%]"
            resizeMode="contain"
          />
        </View>


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
      className={`mx-1 rounded-full ${
        isActive ? 'w-8 bg-primary' : 'w-2 bg-gray-300'
      }`}
      style={{ height: 8 }}
    />
  );
}
