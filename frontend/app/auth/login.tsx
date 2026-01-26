import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useLoginMutation } from '../../hooks/mutations/useAuthMutations';
import { AuthHeader } from '../../components/ui/AuthHeader';
import { InputField } from '../../components/ui/InputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { FlyingCloud } from '../../components/ui/FlyingCloud';

export default function LoginScreen() {
  const loginMutation = useLoginMutation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (!email.includes('@')) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    loginMutation.mutate({ email, password });
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
            contentContainerClassName="flex-grow justify-center px-6 py-6 pb-32" 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AuthHeader 
              title="Welcome Back" 
              subtitle="Sign in to continue your journey" 
            />

            <View className="bg-white/80 p-4 -mx-4 rounded-3xl">
              <InputField
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                icon="mail-outline"
              />

              <View>
                <InputField
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  icon="lock-closed-outline"
                />
              </View>

              <View className="mt-4">
                <PrimaryButton
                  title="Sign In"
                  isLoading={loginMutation.isPending}
                  loadingText="Logging in..."
                  onPress={handleLogin}
                />
              </View>
            </View>

            <View className="flex-row justify-center mt-10 items-center">
              <Text className="text-gray-600">Don&apos;t have an account? </Text>
              <Link href={"/auth/register" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary font-bold text-lg">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>


      <FlyingCloud top={20} duration={35000} delay={0} size={100} opacity={0.06} variant="lucide" />
      <FlyingCloud top={60} duration={28000} delay={5000} size={50} opacity={0.10} variant="ionic" />
      <FlyingCloud top={100} duration={40000} delay={12000} size={70} opacity={0.05} variant="lucide" />
      
      <FlyingCloud top={180} duration={25000} delay={2000} size={40} opacity={0.08} variant="ionic" />
      <FlyingCloud top={240} duration={32000} delay={8000} size={80} opacity={0.07} variant="lucide" />
      <FlyingCloud top={300} duration={29000} delay={15000} size={60} opacity={0.09} variant="ionic" />
      
      <FlyingCloud top={380} duration={38000} delay={1000} size={110} opacity={0.05} variant="lucide" />
      <FlyingCloud top={420} duration={22000} delay={10000} size={50} opacity={0.12} variant="ionic" />
      <FlyingCloud top={480} duration={30000} delay={3000} size={90} opacity={0.06} variant="lucide" />
      
      <FlyingCloud top={550} duration={45000} delay={18000} size={45} opacity={0.10} variant="ionic" />
      <FlyingCloud top={600} duration={27000} delay={6000} size={75} opacity={0.08} variant="lucide" />
      <FlyingCloud top={660} duration={33000} delay={9000} size={100} opacity={0.05} variant="ionic" />
      
      <FlyingCloud top={720} duration={24000} delay={0} size={55} opacity={0.11} variant="lucide" />
      <FlyingCloud top={780} duration={36000} delay={14000} size={85} opacity={0.06} variant="ionic" />
      <FlyingCloud top={820} duration={29000} delay={4000} size={65} opacity={0.09} variant="lucide" />
      <FlyingCloud top={140} duration={42000} delay={20000} size={95} opacity={0.04} variant="ionic" />
    </View>
  );
}
