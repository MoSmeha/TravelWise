import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useRegisterMutation } from '../../hooks/mutations/useAuthMutations';
import { AuthHeader } from '../../components/ui/AuthHeader';
import { InputField } from '../../components/ui/InputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { FlyingCloud } from '../../components/ui/FlyingCloud';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, 'Password must contain uppercase, lowercase and number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function RegisterScreen() {
  const registerMutation = useRegisterMutation();
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    try {
      registerSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        const firstError = error.issues[0];
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: firstError.message,
        });
      }
      return false;
    }
  };

  const handleRegister = async () => {
    if (!validate()) return;
    registerMutation.mutate({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password
    });
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
            contentContainerClassName="flex-grow px-6 py-6 pb-32" 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            <AuthHeader 
              title="Create Account" 
              subtitle="Join TravelWise today" 
            />

            <View className="space-y-1 bg-white/80 p-4 -mx-4 rounded-3xl">
              <InputField
                label="Full Name"
                placeholder="John Doe"
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                error={errors.name}
                icon="person-outline"
              />

              <InputField
                label="Username"
                placeholder="johndoe123"
                value={formData.username}
                onChangeText={(text) => setFormData({...formData, username: text})}
                autoCapitalize="none"
                error={errors.username}
                icon="at-outline"
              />

              <InputField
                label="Email"
                placeholder="john@example.com"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email}
                icon="mail-outline"
              />

              <InputField
                label="Password"
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                value={formData.password}
                onChangeText={(text) => setFormData({...formData, password: text})}
                isPassword
                error={errors.password}
                icon="lock-closed-outline"
              />

              <InputField
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
                isPassword
                error={errors.confirmPassword}
                icon="checkmark-circle-outline"
              />

              <View className="mt-4">
                <PrimaryButton
                  title="Sign Up"
                  isLoading={registerMutation.isPending}
                  loadingText="Creating Account..."
                  onPress={handleRegister}
                />
              </View>
            </View>

            <View className="flex-row justify-center mt-8 mb-10 items-center">
              <Text className="text-gray-500 font-medium">Already have an account? </Text>
              <Link href={"/auth/login" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary font-bold text-lg">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>


      <FlyingCloud top={30} duration={32000} delay={0} size={70} opacity={0.08} variant="ionic" />
      <FlyingCloud top={90} duration={26000} delay={8000} size={110} opacity={0.05} variant="lucide" />
      <FlyingCloud top={160} duration={38000} delay={2000} size={50} opacity={0.10} variant="ionic" />
      
      <FlyingCloud top={220} duration={24000} delay={12000} size={85} opacity={0.06} variant="lucide" />
      <FlyingCloud top={290} duration={42000} delay={5000} size={60} opacity={0.09} variant="ionic" />
      <FlyingCloud top={350} duration={29000} delay={15000} size={95} opacity={0.05} variant="lucide" />
      
      <FlyingCloud top={410} duration={34000} delay={1000} size={45} opacity={0.11} variant="ionic" />
      <FlyingCloud top={470} duration={21000} delay={10000} size={75} opacity={0.08} variant="lucide" />
      <FlyingCloud top={530} duration={31000} delay={4000} size={105} opacity={0.04} variant="ionic" />
      
      <FlyingCloud top={590} duration={27000} delay={18000} size={55} opacity={0.10} variant="lucide" />
      <FlyingCloud top={650} duration={39000} delay={7000} size={90} opacity={0.06} variant="ionic" />
      <FlyingCloud top={710} duration={23000} delay={3000} size={65} opacity={0.09} variant="lucide" />
      
      <FlyingCloud top={770} duration={35000} delay={12000} size={100} opacity={0.05} variant="ionic" />
      <FlyingCloud top={830} duration={25000} delay={8000} size={50} opacity={0.12} variant="lucide" />
      <FlyingCloud top={120} duration={45000} delay={22000} size={80} opacity={0.04} variant="ionic" />
      <FlyingCloud top={500} duration={28000} delay={16000} size={70} opacity={0.07} variant="lucide" />
    </View>
  );
}
