import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../../services/auth';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/authStore';
import Toast from 'react-native-toast-message';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { InputField } from '../../components/ui/InputField';
import { FlyingCloud } from '../../components/ui/FlyingCloud';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { hydrate } = useAuth();

  const handleVerify = async () => {
    if (!otp || !email) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please enter the verification code',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyEmail({ email, otp });
      
      Toast.show({
        type: 'success',
        text1: 'Email Verified!',
        text2: 'Welcome to TravelWise',
      });
      
      // Refresh user data
      await hydrate();
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorData = error.response?.data;
      const msg = errorData?.message || errorData?.error || 'Verification failed. Please try again.';
      
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Missing Email',
        text2: 'Cannot resend without an email address',
      });
      return;
    }
    
    try {
      await authService.resendVerification({ email });
      Toast.show({
        type: 'success',
        text1: 'Code Sent!',
        text2: 'Verification code resent to your email',
      });
    } catch (error: any) {
      const errorData = error.response?.data;
      const msg = errorData?.message || errorData?.error || 'Failed to resend code';
      
      Toast.show({
        type: 'error',
        text1: 'Failed to Resend',
        text2: msg,
      });
    }
  };

  return (
    <View className="flex-1 bg-white relative">
      <SafeAreaView style={{ flex: 1, zIndex: 20 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView 
            contentContainerClassName="flex-grow justify-center px-6 pb-32" 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="items-center mb-10">
              <View className="mb-6">
                 <View className="w-28 h-28 bg-white rounded-full p-1 items-center justify-center shadow-2xl shadow-gray-200 border-4 border-white">
                   <Image 
                     source={{ uri: 'https://res.cloudinary.com/dgsxk7nf5/image/upload/v1769224390/TravelWise-Logo_ogc2ai.png' }} 
                     className="w-full h-full rounded-full"
                     style={{ resizeMode: 'cover' }}
                   />
                 </View>
               </View>

              <Text className="text-3xl font-extrabold text-gray-900 text-center tracking-tight">Verify Email</Text>
              <Text className="text-gray-500 mt-3 text-center px-4 leading-6 font-medium">
                  We sent a code to <Text className="font-bold text-gray-900">{email || 'your email'}</Text>.
              </Text>
            </View>

            <View className="space-y-6">
              <View>
                <InputField
                  label=""
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  placeholder="000000"
                  className="text-center text-4xl font-bold tracking-[12px] h-20 border-2"
                />
              </View>

              <PrimaryButton
                title="Verify Account"
                isLoading={isLoading}
                loadingText="Verifying..."
                onPress={handleVerify}
                className="mt-4"
              />
              
               <TouchableOpacity onPress={handleResend} className="items-center mt-6 p-2">
                  <Text className="text-primary font-semibold text-base">Resend Verification Code</Text>
               </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={() => router.replace('/auth/login' as any)} className="mt-12 items-center flex-row justify-center opacity-70">
                <Ionicons name="arrow-back" size={18} color="#6B7280" className="mr-2" />
                <Text className="text-gray-600 font-medium">Back to Login</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Massive Cloud Density (~16 clouds) */}
      <FlyingCloud top={40} duration={26000} delay={0} size={65} opacity={0.10} variant="ionic" />
      <FlyingCloud top={95} duration={32000} delay={6000} size={95} opacity={0.06} variant="lucide" />
      <FlyingCloud top={150} duration={20000} delay={2000} size={50} opacity={0.12} variant="ionic" />
      
      <FlyingCloud top={210} duration={38000} delay={12000} size={80} opacity={0.07} variant="lucide" />
      <FlyingCloud top={280} duration={24000} delay={4000} size={60} opacity={0.09} variant="ionic" />
      <FlyingCloud top={340} duration={30000} delay={9000} size={100} opacity={0.05} variant="lucide" />
      
      <FlyingCloud top={400} duration={22000} delay={0} size={45} opacity={0.11} variant="ionic" />
      <FlyingCloud top={460} duration={34000} delay={15000} size={75} opacity={0.08} variant="lucide" />
      <FlyingCloud top={520} duration={28000} delay={3000} size={90} opacity={0.06} variant="ionic" />
      
      <FlyingCloud top={580} duration={36000} delay={10000} size={55} opacity={0.09} variant="lucide" />
      <FlyingCloud top={640} duration={25000} delay={5000} size={85} opacity={0.07} variant="ionic" />
      <FlyingCloud top={700} duration={33000} delay={2000} size={70} opacity={0.10} variant="lucide" />
      
      <FlyingCloud top={760} duration={21000} delay={8000} size={110} opacity={0.04} variant="ionic" />
      <FlyingCloud top={820} duration={29000} delay={14000} size={50} opacity={0.12} variant="lucide" />
      <FlyingCloud top={20} duration={42000} delay={18000} size={60} opacity={0.08} variant="ionic" />
      <FlyingCloud top={730} duration={31000} delay={22000} size={90} opacity={0.05} variant="lucide" />
    </View>
  );
}
